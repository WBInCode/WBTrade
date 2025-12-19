'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  issuedAt?: number; // Timestamp when token was issued
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; verificationToken?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        setTokens(parsed);
      } catch {
        localStorage.removeItem('auth_tokens');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
    setInitialLoadDone(true);
  }, []);

  // Fetch user profile when tokens change
  useEffect(() => {
    if (!initialLoadDone) return;
    
    if (tokens?.accessToken) {
      fetchProfile();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [tokens?.accessToken, initialLoadDone]);

  const fetchProfile = async () => {
    if (!tokens?.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await refreshToken();
        if (!refreshed) {
          handleLogout();
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTokens = (newTokens: AuthTokens) => {
    // Add issuedAt timestamp if not present
    const tokensWithTimestamp = {
      ...newTokens,
      issuedAt: newTokens.issuedAt || Date.now(),
    };
    setTokens(tokensWithTimestamp);
    localStorage.setItem('auth_tokens', JSON.stringify(tokensWithTimestamp));
  };

  const clearTokens = () => {
    setTokens(null);
    setUser(null);
    localStorage.removeItem('auth_tokens');
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        saveTokens(data.tokens);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (registerData: RegisterData): Promise<{ success: boolean; error?: string; verificationToken?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (response.ok) {
        saveTokens(data.tokens);
        setUser(data.user);
        return { success: true, verificationToken: data.verificationToken };
      } else {
        return { success: false, error: data.message || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        saveTokens(data.tokens);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [tokens?.refreshToken]);

  const handleLogout = () => {
    clearTokens();
  };

  const logout = async () => {
    if (tokens?.accessToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      } catch {
        // Ignore errors on logout
      }
    }
    handleLogout();
  };

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!tokens?.accessToken || !tokens?.expiresIn) return;

    // Calculate time until token expires
    const issuedAt = tokens.issuedAt || Date.now();
    const expiresAt = issuedAt + tokens.expiresIn * 1000;
    const now = Date.now();
    
    // Refresh 1 minute before expiry
    const refreshTime = expiresAt - now - 60 * 1000;
    
    // If token already expired or will expire very soon, refresh now
    if (refreshTime <= 0) {
      refreshToken();
      return;
    }

    const timeout = setTimeout(() => {
      refreshToken();
    }, refreshTime);

    return () => clearTimeout(timeout);
  }, [tokens, refreshToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
