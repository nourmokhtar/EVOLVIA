"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
interface AuthContextType {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // Load auth data from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");

    if (storedToken) {
      setToken(storedToken);
      // fetch user profile
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/profile`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch profile');
          return res.json();
        })
        .then((data) => setUser(data))
        .catch(() => {
          // invalid token or error
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [router]);
  const refreshUser = async () => {
    const storedToken = localStorage.getItem('authToken') || token;
    if (!storedToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (!res.ok) throw new Error('Failed to refresh profile');
      const data = await res.json();
      setUser(data);
      setToken(storedToken);
    } catch (err) {
      console.warn('refreshUser failed', err);
      localStorage.removeItem('authToken');
      setUser(null);
      setToken(null);
    }
  };
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      const newToken = data.access_token;

      // Fetch user info to get user ID
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/profile`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info");
      }

      const userData = await userResponse.json();
      // Store in state and localStorage
      setUser(userData);
      setToken(newToken);
      localStorage.setItem("authToken", newToken);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    login,
    refreshUser,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
