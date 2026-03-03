"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import api from "../lib/api";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const login = async (username: string, password: string) => {
    // POST to backend - sets HttpOnly cookies automatically
    await api.post("/auth/token/", { username, password });
    // Fetch user info (cookie attached automatically)
    const users = await api.get(`/users/?username=${username}`);
    const userData: AuthUser = Array.isArray(users) ? users[0] : users;
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    try { await api.post("/auth/logout/"); } catch {}
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
