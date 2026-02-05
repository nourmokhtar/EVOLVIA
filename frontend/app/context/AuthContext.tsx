"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
interface AuthContextType {
  userId: string | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // Load auth data from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedToken = localStorage.getItem("authToken");
    
    if (storedUserId && storedToken) {
      setUserId(storedUserId);
      setToken(storedToken);
    }
    
    setIsLoading(false);
//   }, []);
 // Check if user is authenticated and redirect to home page
    if (userId && token) {
      router.push("/");
    }
  }, [router, userId, token]);
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/login", {
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
      const userResponse = await fetch("http://localhost:8000/api/v1/users/me", {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info");
      }

      const userData = await userResponse.json();
      const newUserId = userData.id;

      // Store in state and localStorage
      setUserId(newUserId);
      setToken(newToken);
      localStorage.setItem("userId", newUserId);
      localStorage.setItem("authToken", newToken);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUserId(null);
    setToken(null);
    localStorage.removeItem("userId");
    localStorage.removeItem("authToken");
  };

  const value: AuthContextType = {
    userId,
    token,
    isAuthenticated: !!userId && !!token,
    login,
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
