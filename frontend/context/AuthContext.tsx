"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import api from "../lib/api";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatar?: string | null;
  bio?: string;
  website?: string;
  twitter?: string;
  github?: string;
  followers_count?: number;
  following_count?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore user info from localStorage (tokens are stored in HttpOnly cookies)
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      const userData = await api.get("/auth/me/") as AuthUser;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch {}
  };

  const updateUser = (data: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (username: string, password: string) => {
    // POST to backend - sets HttpOnly cookies automatically
    await api.post("/auth/token/", { username, password });
    // Fetch current user info via dedicated /auth/me/ endpoint
    const userData: AuthUser = await api.get("/auth/me/") as AuthUser;
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    try { await api.post("/auth/logout/"); } catch {}
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
