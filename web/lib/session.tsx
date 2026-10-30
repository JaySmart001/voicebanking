"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "./api";

interface SessionState {
  token: string | null;
  username: string | null;
  signIn: (token: string, username: string) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

const STORAGE_KEY = "voicebank.session";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setToken(parsed.token);
        setUsername(parsed.username);
        apiClient.setToken(parsed.token);
      } catch {
        // ignore corrupt storage
      }
    }
  }, []);

  const signIn = useCallback((newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    apiClient.setToken(newToken);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, username: newUsername }));
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUsername(null);
    apiClient.setToken(undefined);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({ token, username, signIn, signOut }), [token, username, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
