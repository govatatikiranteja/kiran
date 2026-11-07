import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseConfigured, functions } from '../firebase/client.js';

function callable(name) {
  if (!firebaseConfigured) throw new Error('Online play is unavailable until Firebase is configured.');
  return httpsCallable(functions, name);
}

export async function createRoom(player) {
  const result = await callable('createRoom')({ player });
  return result.data;
}

export async function joinRoom(code, player) {
  const result = await callable('joinRoom')({ code, player });
  return result.data;
}

export async function setPlayerReady(roomId, ready) {
  const result = await callable('setPlayerReady')({ roomId, ready });
  return result.data;
}

export async function startRoom(roomId) {
  const result = await callable('startRoom')({ roomId });
  return result.data;
}

export async function rollRoomDice(roomId) {
  const result = await callable('rollRoomDice')({ roomId });
  return result.data;
}

export async function moveRoomToken(roomId, tokenIndex) {
  const result = await callable('moveRoomToken')({ roomId, tokenIndex });
  return result.data;
}

export async function restartRoom(roomId) {
  const result = await callable('restartRoom')({ roomId });
  return result.data;
}

export async function leaveRoom(roomId) {
  const result = await callable('leaveRoom')({ roomId });
  return result.data;
}

export async function updatePresence(roomId) {
  const result = await callable('updatePresence')({ roomId });
  return result.data;
}

export function subscribeToRoom(roomId, onRoom, onError) {
  if (!firebaseConfigured) throw new Error('Firebase is not configured.');
  return onSnapshot(doc(db, 'rooms', roomId), (snapshot) => {
    if (!snapshot.exists()) {
      onError(new Error('This room no longer exists.'));
      return;
    }
    onRoom({ id: snapshot.id, ...snapshot.data() });
  }, onError);
}
