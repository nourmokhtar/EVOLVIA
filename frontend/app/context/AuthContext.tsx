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
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  // Load auth data from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedToken = localStorage.getItem("authToken");

    console.log("📦 Loading from localStorage:", { storedUserId, storedToken: storedToken ? "exists" : "null" });
    if (storedUserId && storedToken) {
      setUserId(storedUserId);
      setToken(storedToken);
    }
    setIsInitialized(true);
  }, []);

  // Also listen for storage changes (in case of login in another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUserId = localStorage.getItem("userId");
      const storedToken = localStorage.getItem("authToken");
      
      console.log("🔄 Storage changed:", { storedUserId, storedToken: storedToken ? "exists" : "null" });
      
      setUserId(storedUserId);
      setToken(storedToken);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  // const login = async (email: string, password: string) => {
  //   setIsLoading(true);
  //   try {
  //     const response = await fetch("http://localhost:8000/api/v1/auth/login", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         email: email,
  //         password: password,
  //       }),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Login failed");
  //     }

  //     const data = await response.json();
  //     const newToken = data.access_token;

  //     // Fetch user info to get user ID
  //     const userResponse = await fetch("http://localhost:8000/api/v1/users/me", {
  //       headers: {
  //         Authorization: `Bearer ${newToken}`,
  //       },
  //     });

  //     if (!userResponse.ok) {
  //       throw new Error("Failed to fetch user info");
  //     }

  //     const userData = await userResponse.json();
  //     const newUserId = userData.id;

  //     // Store in state and localStorage
  //     setUserId(newUserId);
  //     setToken(newToken);
  //     localStorage.setItem("userId", newUserId);
  //     localStorage.setItem("authToken", newToken);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
        // Create form data instead of JSON
        const formData = new URLSearchParams();
        formData.append('username', email); // Note: field is 'username', not 'email'
        formData.append('password', password);

        const response = await fetch("http://localhost:8000/api/v1/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Login failed");
        }

        const data = await response.json();
        console.log("Login response:", data); // Debug log
        
        const newToken = data.access_token;

        if (!newToken) {
            throw new Error("No access token received");
        }

        // Decode JWT to get user ID (simpler than making another API call)
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        const newUserId = payload.sub;

        console.log("User ID from token:", newUserId); // Debug log

        localStorage.setItem("userId", newUserId);
        localStorage.setItem("authToken", newToken);
        // Store in state and localStorage
        setUserId(newUserId);
        setToken(newToken);
        
        
        console.log("✅ Login successful, token stored"); // Debug log
        
    } catch (error) {
        console.error("❌ Login error:", error);
        throw error; // Re-throw so the UI can handle it
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

  // Don't render children until we've checked localStorage
  if (!isInitialized) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>;
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
