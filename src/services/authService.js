import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../firebase/client.js';

function requireFirebase() {
  if (!firebaseConfigured) throw new Error('Firebase is not configured. Add the required VITE_FIREBASE_* values to .env.');
}

async function ensureProfile(user, preferredName) {
  const reference = doc(db, 'profiles', user.uid);
  const existing = await getDoc(reference);
  const username = preferredName || user.displayName || user.email?.split('@')[0] || 'Player';
  await setDoc(reference, {
    uid: user.uid,
    username: username.slice(0, 24),
    photoURL: user.photoURL || '',
    ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function registerWithEmail(email, password, username) {
  requireFirebase();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: username });
  await ensureProfile(result.user, username);
  return result.user;
}

export async function loginWithEmail(email, password) {
  requireFirebase();
  const result = await signInWithEmailAndPassword(auth, email, password);
  await ensureProfile(result.user);
  return result.user;
}

export async function loginWithGoogle() {
  requireFirebase();
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  await ensureProfile(result.user);
  return result.user;
}

export async function logout() {
  requireFirebase();
  return signOut(auth);
}
