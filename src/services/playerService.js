import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase/client.js';

export async function getLeaderboard() {
  if (!firebaseConfigured) return [];
  const result = await getDocs(query(collection(db, 'profiles'), orderBy('wins', 'desc'), limit(5)));
  return result.docs.map((snapshot) => snapshot.data());
}

export async function getMatchHistory(uid) {
  if (!firebaseConfigured || !uid) return [];
  const result = await getDocs(query(
    collection(db, 'profiles', uid, 'matches'),
    orderBy('completedAt', 'desc'),
    limit(10),
  ));
  return result.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
}
