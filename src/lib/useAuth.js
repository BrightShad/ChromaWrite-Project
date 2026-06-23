import { useState, useEffect } from "react";
import { getUser, onAuthChange, signInWithCredentials, signOut } from "./auth";
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);
  const login = async (userStr, passStr) => {
    setError(null);
    const { error: err } = await signInWithCredentials(userStr, passStr);
    if (err) setError(err);
    return !err;
  };
  const logout = async () => {
    await signOut();
    setUser(null);
  };
  return { user, loading, error, login, logout };
}
