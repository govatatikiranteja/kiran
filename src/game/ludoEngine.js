export const COLORS = ['red', 'green', 'yellow', 'blue'];
export const TRACK_LENGTH = 52;
export const HOME_LENGTH = 6;
export const FINISH_PROGRESS = 57;
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const START_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };

export function createGame(players, random = Math.random) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) {
    throw new Error('A Ludo game needs 2 to 4 players.');
  }
  const seats = players.map((player, index) => {
    const color = player.color || COLORS[index];
    if (!COLORS.includes(color)) throw new Error(`Unknown player colour: ${color}`);
    return {
      uid: player.uid || `local-${index + 1}`,
      name: player.name || `Player ${index + 1}`,
      photoURL: player.photoURL || '',
      color,
      tokens: [-1, -1, -1, -1],
    };
  });
  if (new Set(seats.map((player) => player.color)).size !== seats.length) {
    throw new Error('Each player must have a different colour.');
  }
  return {
    players: seats,
    currentPlayerIndex: 0,
    diceValue: null,
    validMoves: [],
    status: 'playing',
    winnerUid: null,
    history: [],
    randomSeed: Math.floor(random() * 2 ** 32),
  };
}

export function globalTrackPosition(color, progress) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (START_OFFSETS[color] + progress) % TRACK_LENGTH;
}

export function getLegalMoves(state, diceValue = state.diceValue) {
  if (!diceValue || diceValue < 1 || diceValue > 6) return [];
  const player = state.players[state.currentPlayerIndex];
  if (!player) return [];
  return player.tokens.flatMap((progress, tokenIndex) => {
    if (progress === FINISH_PROGRESS) return [];
    if (progress === -1) return diceValue === 6 ? [tokenIndex] : [];
    return progress + diceValue <= FINISH_PROGRESS ? [tokenIndex] : [];
  });
}

export function rollDice(state, random = Math.random) {
  if (state.status !== 'playing') throw new Error('This game is not in progress.');
  if (state.diceValue !== null) throw new Error('Move a token before rolling again.');
  const diceValue = Math.floor(random() * 6) + 1;
  const validMoves = getLegalMoves(state, diceValue);
  const next = {
    ...state,
    diceValue,
    validMoves,
    history: [...state.history, { type: 'roll', uid: state.players[state.currentPlayerIndex].uid, value: diceValue }],
  };
  if (validMoves.length === 0) {
    next.history = [...next.history, { type: 'pass', uid: state.players[state.currentPlayerIndex].uid }];
    next.diceValue = null;
    next.validMoves = [];
    if (diceValue !== 6) next.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }
  return next;
}

export function moveToken(state, tokenIndex) {
  if (state.status !== 'playing' || state.diceValue === null) {
    throw new Error('Roll the dice before moving a token.');
  }
  if (!state.validMoves.includes(tokenIndex)) throw new Error('That token cannot move with this roll.');

  const player = state.players[state.currentPlayerIndex];
  const oldProgress = player.tokens[tokenIndex];
  const newProgress = oldProgress === -1 ? 0 : oldProgress + state.diceValue;
  const players = state.players.map((seat) => ({
    ...seat,
    tokens: [...seat.tokens],
  }));
  players[state.currentPlayerIndex].tokens[tokenIndex] = newProgress;

  const captured = [];
  const landingSquare = globalTrackPosition(player.color, newProgress);
  if (newProgress < TRACK_LENGTH && !SAFE_SQUARES.has(landingSquare)) {
    players.forEach((opponent, playerIndex) => {
      if (playerIndex === state.currentPlayerIndex) return;
      opponent.tokens.forEach((progress, opponentTokenIndex) => {
        if (progress >= 0 && progress < TRACK_LENGTH &&
            globalTrackPosition(opponent.color, progress) === landingSquare) {
          opponent.tokens[opponentTokenIndex] = -1;
          captured.push({ uid: opponent.uid, tokenIndex: opponentTokenIndex });
        }
      });
    });
  }

  const won = players[state.currentPlayerIndex].tokens.every((progress) => progress === FINISH_PROGRESS);
  const extraTurn = state.diceValue === 6;
  const next = {
    ...state,
    players,
    diceValue: null,
    validMoves: [],
    status: won ? 'finished' : 'playing',
    winnerUid: won ? player.uid : null,
    currentPlayerIndex: won || extraTurn
      ? state.currentPlayerIndex
      : (state.currentPlayerIndex + 1) % state.players.length,
    history: [
      ...state.history,
      { type: 'move', uid: player.uid, tokenIndex, from: oldProgress, to: newProgress, captured },
    ],
  };
  return next;
}

export function allTokensHome(state, playerIndex) {
  return state.players[playerIndex].tokens.filter((progress) => progress === -1).length;
}
