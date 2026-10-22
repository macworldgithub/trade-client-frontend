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
import type { User, LoginResponse, AuthStep } from "./types";

type AuthContextType = {
  authenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthStep | null>;
  register: (input: { email: string; fullName: string; password: string; role?: string; tradeAccountId?: string; rooftopId?: string }) => Promise<AuthStep | null>;
  verifyEmailOtp: (challengeId: string, code: string) => Promise<AuthStep | null>;
  verifyTotp: (factorId: string, code: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  user: null,
  loading: true,
  login: async () => null,
  register: async () => null,
  verifyEmailOtp: async () => null,
  verifyTotp: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Remove credentials left by the previous bearer-token implementation.
    localStorage.removeItem("trade_access_token");
    localStorage.removeItem("trade_refresh_token");
    api<User>("/auth/me")
      .then(me => { setUser(me); setAuthenticated(true); })
      .catch(() => { setUser(null); setAuthenticated(false); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        auth: false,
      });

      if (result.requiresTotp || result.requiresEmailOtp) {
        setUser(null);
        setAuthenticated(false);
        return result;
      }

      const me = result.user || (await api<User>("/auth/me"));
      setUser(me);
      setAuthenticated(true);
      return null; 
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Unable to sign in" };
    }
  }, []);

  const verifyEmailOtp = useCallback(async (challengeId: string, code: string) => {
    try {
      const result = await api<LoginResponse>("/auth/email-otp/verify", {
        method: "POST", auth: false, body: JSON.stringify({ challengeId, code }),
      });
      if (result.requiresTotp) return result;
      const me = result.user || await api<User>("/auth/me");
      setUser(me); setAuthenticated(true);
      return null;
    } catch (e) { return { error: e instanceof Error ? e.message : "Unable to verify code" }; }
  }, []);

  const verifyTotp = useCallback(async (factorId: string, code: string) => {
    try {
      const result = await api<LoginResponse>("/auth/totp/verify", {
        method: "POST",
        body: JSON.stringify({ factorId, code }),
        auth: false,
      });

      const me = result.user || (await api<User>("/auth/me"));
      setUser(me);
      setAuthenticated(true);
      return null; // null = success
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid or expired code";
    }
  }, []);

  const register = useCallback(async (input: { email: string; fullName: string; password: string; role?: string; tradeAccountId?: string; rooftopId?: string }) => {
    try {
      return await api<LoginResponse>("/auth/register", { method: "POST", auth: false, body: JSON.stringify({ ...input, email: input.email.trim().toLowerCase() }) });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Unable to create account" };
    }
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, user, loading, login, register, verifyEmailOtp, verifyTotp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
