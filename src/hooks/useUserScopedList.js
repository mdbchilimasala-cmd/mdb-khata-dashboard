import { useEffect, useState } from "react";
import { subscribeList } from "../services/firebase/db";
import { useAuthStore } from "../store/useAuthStore";

export function useUserScopedList(key) {
  const uid = useAuthStore((s) => s.user?.uid);
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!uid) return undefined;
    const off = subscribeList(uid, key, setRows);
    return () => off();
  }, [key, uid]);
  return { uid, rows, setRows };
}
