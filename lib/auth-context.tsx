"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { User, LoginResponse } from "./types";

type AuthContextType = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (input: { email: string; fullName: string; password: string; role?: string; tradeAccountId?: string; rooftopId?: string }) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loading: true,
  login: async () => null,
  register: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: check for existing token in localStorage
  useEffect(() => {
    const existing = localStorage.getItem("trade_access_token");
    if (existing) {
      setToken(existing);
      api<User>("/auth/me")
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("trade_access_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        auth: false,
      });
      const accessToken = result.accessToken || result.access_token;
      if (!accessToken) return "The API did not return an access token.";

      localStorage.setItem("trade_access_token", accessToken);
      if (result.refreshToken) localStorage.setItem("trade_refresh_token", result.refreshToken);
      setToken(accessToken);

      const me = result.user || (await api<User>("/auth/me"));
      setUser(me);
      return null; // null = success
    } catch (e) {
      return e instanceof Error ? e.message : "Unable to sign in";
    }
  }, []);

  const register = useCallback(async (input: { email: string; fullName: string; password: string; role?: string; tradeAccountId?: string; rooftopId?: string }) => {
    try {
      await api("/auth/register", { method: "POST", auth: false, body: JSON.stringify({ ...input, email: input.email.trim().toLowerCase() }) });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Unable to create account";
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    localStorage.removeItem("trade_access_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
