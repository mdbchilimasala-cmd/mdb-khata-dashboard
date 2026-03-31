import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "./config";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  await set(ref(db, `users/${user.uid}`), {
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
