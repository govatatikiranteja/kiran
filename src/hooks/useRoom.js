import { useEffect, useState } from 'react';
import { subscribeToRoom, updatePresence } from '../services/roomService.js';

export default function useRoom(roomId, user) {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setError('');
      return undefined;
    }
    let active = true;
    const unsubscribe = subscribeToRoom(roomId, (nextRoom) => {
      if (active) {
        setRoom(nextRoom);
        setError('');
      }
    }, (reason) => {
      if (active) setError(reason.message || 'Could not load this room.');
    });
    const heartbeat = user ? window.setInterval(() => {
      updatePresence(roomId).catch((reason) => {
        if (active) setError(reason.message || 'Connection could not be refreshed.');
      });
    }, 30_000) : null;
    return () => {
      active = false;
      unsubscribe();
      if (heartbeat) window.clearInterval(heartbeat);
    };
  }, [roomId, user]);

  return { room, error };
}
