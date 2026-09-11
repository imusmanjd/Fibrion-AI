"use client";

/**
 * frontend/lib/auth-context.tsx
 *
 * The session itself lives in an httpOnly cookie the browser manages
 * automatically - this context just tracks who (if anyone) that
 * cookie currently belongs to, so components can react to it without
 * every page independently calling GET /auth/me.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, loginUser, logoutUser, registerUser } from "./api";
import type { AuthUser } from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  /** True only during the initial "do we already have a session?" check on load. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getCurrentUser().then((current) => {
      if (active) {
        setUser(current);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const current = await loginUser(email, password);
    setUser(current);
  }

  async function register(email: string, password: string, fullName?: string) {
    const current = await registerUser(email, password, fullName);
    setUser(current);
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}