import { get, onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "./config";

const p = (uid, key) => `users/${uid}/${key}`;

export async function saveRecord(uid, key, payload, id) {
  const node = id ? ref(db, `${p(uid, key)}/${id}`) : push(ref(db, p(uid, key)));
  await set(node, { id: node.key, ...payload, updatedAt: Date.now() });
  return node.key;
}

export function deleteRecord(uid, key, id) {
  return remove(ref(db, `${p(uid, key)}/${id}`));
}

export function patchRecord(uid, key, id, payload) {
  return update(ref(db, `${p(uid, key)}/${id}`), { ...payload, updatedAt: Date.now() });
}

export function subscribeList(uid, key, cb) {
  return onValue(ref(db, p(uid, key)), (snap) => {
    const value = snap.val() || {};
    cb(Object.values(value));
  });
}

export async function readNode(uid, key) {
  const snap = await get(ref(db, p(uid, key)));
  return snap.val();
}
