import { randomInt } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();
const db = getFirestore();
const COLORS = ['red', 'green', 'yellow', 'blue'];
const STARTS = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const FINISH = 57;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function requireUid(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to play online.');
  return request.auth.uid;
}

function roomRef(roomId) {
  if (typeof roomId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(roomId)) {
    throw new HttpsError('invalid-argument', 'Invalid room.');
  }
  return db.collection('rooms').doc(roomId);
}

function safePlayer(uid, input, color) {
  const displayName = typeof input?.name === 'string' ? input.name.trim().slice(0, 24) : '';
  return {
    uid,
    name: displayName || 'Player',
    photoURL: typeof input?.photoURL === 'string' ? input.photoURL.slice(0, 1000) : '',
    color,
    ready: false,
    connected: true,
    lastSeen: Date.now(),
    tokens: [-1, -1, -1, -1],
  };
}

function assertMember(room, uid) {
  const player = room.players.find((seat) => seat.uid === uid);
  if (!player) throw new HttpsError('permission-denied', 'You are not a member of this room.');
  return player;
}

function assertTurn(room, uid) {
  if (room.status !== 'playing') throw new HttpsError('failed-precondition', 'The game is not in progress.');
  const current = room.game.players[room.game.currentPlayerIndex];
  if (current.uid !== uid) throw new HttpsError('permission-denied', 'It is not your turn.');
  return current;
}

function legalMoves(game, value) {
  const player = game.players[game.currentPlayerIndex];
  return player.tokens.flatMap((progress, index) => {
    if (progress === FINISH) return [];
    if (progress === -1) return value === 6 ? [index] : [];
    return progress + value <= FINISH ? [index] : [];
  });
}

function serverRoll(game) {
  const value = randomInt(1, 7);
  const validMoves = legalMoves(game, value);
  const next = {
    ...game,
    diceValue: value,
    validMoves,
    history: [...(game.history || []), {
      type: 'roll',
      uid: game.players[game.currentPlayerIndex].uid,
      value,
      at: Date.now(),
    }],
  };
  if (validMoves.length === 0) {
    const shouldKeepTurn = value === 6;
    next.history.push({ type: 'pass', uid: game.players[game.currentPlayerIndex].uid, at: Date.now() });
    next.diceValue = null;
    next.validMoves = [];
    if (!shouldKeepTurn) next.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  }
  return next;
}

function serverMove(game, tokenIndex) {
  if (!Number.isInteger(tokenIndex) || !game.validMoves?.includes(tokenIndex)) {
    throw new HttpsError('invalid-argument', 'That token cannot move with this roll.');
  }
  const playerIndex = game.currentPlayerIndex;
  const player = game.players[playerIndex];
  const players = game.players.map((seat) => ({ ...seat, tokens: [...seat.tokens] }));
  const from = players[playerIndex].tokens[tokenIndex];
  const to = from === -1 ? 0 : from + game.diceValue;
  players[playerIndex].tokens[tokenIndex] = to;
  const captures = [];
  const landing = to < 52 ? (STARTS[player.color] + to) % 52 : null;
  if (landing !== null && !SAFE.has(landing)) {
    players.forEach((opponent, opponentIndex) => {
      if (opponentIndex === playerIndex) return;
      opponent.tokens.forEach((progress, opponentTokenIndex) => {
        if (progress >= 0 && progress < 52 && (STARTS[opponent.color] + progress) % 52 === landing) {
          opponent.tokens[opponentTokenIndex] = -1;
          captures.push({ uid: opponent.uid, tokenIndex: opponentTokenIndex });
        }
      });
    });
  }
  const winner = players[playerIndex].tokens.every((progress) => progress === FINISH);
  return {
    ...game,
    players,
    diceValue: null,
    validMoves: [],
    status: winner ? 'finished' : 'playing',
    winnerUid: winner ? player.uid : null,
    currentPlayerIndex: winner || game.diceValue === 6
      ? playerIndex
      : (playerIndex + 1) % players.length,
    history: [...(game.history || []), {
      type: 'move', uid: player.uid, tokenIndex, from, to, captures, at: Date.now(),
    }],
  };
}

export const createRoom = onCall(async (request) => {
  const uid = requireUid(request);
  const player = safePlayer(uid, request.data?.player, COLORS[0]);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let code = '';
    for (let index = 0; index < 6; index += 1) {
      code += ROOM_CODE_CHARS[randomInt(ROOM_CODE_CHARS.length)];
    }
    const codeRef = db.collection('roomCodes').doc(code);
    const roomRefForCode = db.collection('rooms').doc();
    try {
      await db.runTransaction(async (transaction) => {
        if ((await transaction.get(codeRef)).exists) throw new Error('CODE_COLLISION');
        transaction.set(codeRef, { roomId: roomRefForCode.id, createdAt: FieldValue.serverTimestamp() });
        transaction.set(roomRefForCode, {
          code,
          ownerUid: uid,
          memberUids: [uid],
          players: [player],
          status: 'waiting',
          game: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return { roomId: roomRefForCode.id, code };
    } catch (error) {
      if (error.message !== 'CODE_COLLISION') throw error;
    }
  }
  throw new HttpsError('resource-exhausted', 'Could not reserve a room code. Please try again.');
});

export const joinRoom = onCall(async (request) => {
  const uid = requireUid(request);
  const code = typeof request.data?.code === 'string' ? request.data.code.trim().toUpperCase() : '';
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new HttpsError('invalid-argument', 'Enter a valid six-character room code.');
  const codeSnapshot = await db.collection('roomCodes').doc(code).get();
  if (!codeSnapshot.exists) throw new HttpsError('not-found', 'No room was found with that code.');
  const reference = roomRef(codeSnapshot.data().roomId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new HttpsError('not-found', 'This room no longer exists.');
    const room = snapshot.data();
    const existing = room.players.find((seat) => seat.uid === uid);
    if (existing) {
      const players = room.players.map((seat) => seat.uid === uid ? { ...seat, connected: true, lastSeen: Date.now() } : seat);
      const game = room.game ? {
        ...room.game,
        players: room.game.players.map((seat) => seat.uid === uid ? { ...seat, connected: true, lastSeen: Date.now() } : seat),
      } : null;
      transaction.update(reference, { players, ...(game ? { game } : {}), updatedAt: FieldValue.serverTimestamp() });
      return { roomId: reference.id, code };
    }
    if (room.status !== 'waiting') throw new HttpsError('failed-precondition', 'This game has already started.');
    if (room.players.length >= 4) throw new HttpsError('resource-exhausted', 'This room is full.');
    const color = COLORS.find((candidate) => !room.players.some((seat) => seat.color === candidate));
    const player = safePlayer(uid, request.data?.player, color);
    transaction.update(reference, {
      players: [...room.players, player],
      memberUids: [...room.memberUids, uid],
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { roomId: reference.id, code };
  });
});

export const setPlayerReady = onCall(async (request) => {
  const uid = requireUid(request);
  const reference = roomRef(request.data?.roomId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Room not found.');
    const room = snapshot.data();
    assertMember(room, uid);
    if (room.status !== 'waiting') throw new HttpsError('failed-precondition', 'The room is no longer waiting.');
    const ready = request.data?.ready === true;
    transaction.update(reference, {
      players: room.players.map((seat) => seat.uid === uid ? { ...seat, ready, connected: true, lastSeen: Date.now() } : seat),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ready };
  });
});

export const startRoom = onCall(async (request) => {
  const uid = requireUid(request);
  const reference = roomRef(request.data?.roomId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Room not found.');
    const room = snapshot.data();
    if (room.ownerUid !== uid) throw new HttpsError('permission-denied', 'Only the room host can start the game.');
    if (room.status !== 'waiting') throw new HttpsError('failed-precondition', 'The game has already started.');
    if (room.players.length < 2) throw new HttpsError('failed-precondition', 'Invite at least one more player to start.');
    if (room.players.some((seat) => !seat.ready)) throw new HttpsError('failed-precondition', 'Every player must be ready.');
    const gamePlayers = room.players.map((seat) => ({ ...seat, tokens: [-1, -1, -1, -1] }));
    transaction.update(reference, {
      status: 'playing',
      game: {
        players: gamePlayers,
        currentPlayerIndex: 0,
        diceValue: null,
        validMoves: [],
        status: 'playing',
        winnerUid: null,
        history: [],
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { status: 'playing' };
  });
});

export const rollRoomDice = onCall(async (request) => {
  const uid = requireUid(request);
  const reference = roomRef(request.data?.roomId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Room not found.');
    const room = snapshot.data();
    assertTurn(room, uid);
    if (room.game.diceValue !== null) throw new HttpsError('failed-precondition', 'Move a token before rolling again.');
    const game = serverRoll(room.game);
    transaction.update(reference, { game, updatedAt: FieldValue.serverTimestamp() });
    return { diceValue: game.diceValue, validMoves: game.validMoves };
  });
});

export const moveRoomToken = onCall(async (request) => {
  const uid = requireUid(request);
  const reference = roomRef(request.data?.roomId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Room not found.');
    const room = snapshot.data();
    assertTurn(room, uid);
    if (!Number.isInteger(room.game.diceValue)) throw new HttpsError('failed-precondition', 'Roll the dice first.');
    const game = serverMove(room.game, request.data?.tokenIndex);
    if (game.status === 'finished') {
      const matchId = `${reference.id}_${Date.now()}`;
      const match = {
        roomId: reference.id,
        code: room.code,
        winnerUid: game.winnerUid,
        players: game.players.map((seat) => ({ uid: seat.uid, name: seat.name, color: seat.color })),
        completedAt: FieldValue.serverTimestamp(),
      };
      const profileRefs = game.players.map((seat) => db.collection('profiles').doc(seat.uid));
      const profileSnapshots = await Promise.all(profileRefs.map((profileRef) => transaction.get(profileRef)));
      transaction.update(reference, { game, status: 'finished', updatedAt: FieldValue.serverTimestamp() });
      for (let index = 0; index < game.players.length; index += 1) {
        const seat = game.players[index];
        const profileRef = profileRefs[index];
        const snapshot = profileSnapshots[index];
        const stats = snapshot.exists ? snapshot.data() : {};
        const won = seat.uid === game.winnerUid;
        transaction.set(profileRef, {
          uid: seat.uid,
          username: seat.name,
          photoURL: seat.photoURL || '',
          wins: (stats.wins || 0) + (won ? 1 : 0),
          losses: (stats.losses || 0) + (won ? 0 : 1),
          matches: (stats.matches || 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(profileRef.collection('matches').doc(matchId), {
          ...match,
          result: won ? 'win' : 'loss',
        });
      }
    } else {
      transaction.update(reference, { game, status: 'playing', updatedAt: FieldValue.serverTimestamp() });
    }
    return { status: game.status, winnerUid: game.winnerUid };
  });
});

export const restartRoom = onCall(async (request) => {
  const uid = requireUid(request);
  const reference = roomRef(request.data?.roomId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Room not found.');
    const room = snapshot.data();
    assertMember(room, uid);
    if (room.status !== 'finished' || room.game?.status !== 'finished') {
      throw new HttpsError('failed-precondition', 'A rematch is available after the current game finishes.');
    }
    const gamePlayers = room.game.players.map((seat) => ({ ...seat, tokens: [-1, -1, -1, -1] }));
    transaction.update(reference, {
      status: 'playing',
      game: {
        players: gamePlayers,
        currentPlayerIndex: 0,
        diceValue: null,
        validMoves: [],
        status: 'playing',
        winnerUid: null,
        history: [],
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { status: 'playing' };
  });
});

export const leaveRoom = onCall(async (request) => {
  const uid = requireUid(request);
  const reference = roomRef(request.data?.roomId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) return { left: true };
    const room = snapshot.data();
    assertMember(room, uid);
    if (room.status === 'waiting') {
      const players = room.players.filter((seat) => seat.uid !== uid);
      const memberUids = room.memberUids.filter((memberUid) => memberUid !== uid);
      if (players.length === 0) {
        transaction.delete(reference);
        transaction.delete(db.collection('roomCodes').doc(room.code));
      } else {
        transaction.update(reference, {
          players,
          memberUids,
          ownerUid: room.ownerUid === uid ? players[0].uid : room.ownerUid,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else {
      const game = room.game ? {
        ...room.game,
        players: room.game.players.map((seat) => seat.uid === uid ? { ...seat, connected: false, lastSeen: Date.now() } : seat),
      } : null;
      transaction.update(reference, {
        players: room.players.map((seat) => seat.uid === uid ? { ...seat, connected: false, lastSeen: Date.now() } : seat),
        ...(game ? { game } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { left: true };
  });
});

export const updatePresence = onCall(async (request) => {
  const uid = requireUid(request);
  const reference = roomRef(request.data?.roomId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Room not found.');
    const room = snapshot.data();
    assertMember(room, uid);
    const updateSeats = (seats) => seats.map((seat) => seat.uid === uid
      ? { ...seat, connected: true, lastSeen: Date.now() }
      : seat);
    transaction.update(reference, {
      players: updateSeats(room.players),
      ...(room.game ? { game: { ...room.game, players: updateSeats(room.game.players) } } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { connected: true };
  });
});

export const expirePresence = onSchedule('every 1 minutes', async () => {
  const cutoff = Date.now() - 90_000;
  const rooms = await db.collection('rooms').where('status', 'in', ['waiting', 'playing']).get();
  const batch = db.batch();
  let changedCount = 0;
  rooms.docs.forEach((snapshot) => {
    const room = snapshot.data();
    let changed = false;
    const players = room.players.map((seat) => {
      if (seat.connected && seat.lastSeen < cutoff) {
        changed = true;
        return { ...seat, connected: false };
      }
      return seat;
    });
    const game = room.game ? {
      ...room.game,
      players: room.game.players.map((seat) => seat.connected && seat.lastSeen < cutoff
        ? { ...seat, connected: false }
        : seat),
    } : null;
    if (changed) {
      changedCount += 1;
      batch.update(snapshot.ref, {
        players,
        ...(game ? { game } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
  if (changedCount > 0) await batch.commit();
});
