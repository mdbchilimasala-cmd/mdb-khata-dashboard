import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { ref, update } from "firebase/database";
import { auth, db } from "./config";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  // Merge profile only — do not use set() here: it would replace the entire
  // users/{uid} node and delete customers, invoices, transactions, etc.
  await update(ref(db, `users/${user.uid}`), {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    updatedAt: Date.now(),
  });
  return user;
}

export function logout() {
  return signOut(auth);
}

export function onAuthStateSync(setUser, setLoading) {
  return onAuthStateChanged(auth, (user) => {
    setUser(user || null);
    setLoading(false);
  });
}
