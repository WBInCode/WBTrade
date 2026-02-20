import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/auth';
import { getTokens, saveTokens, clearTokens, AuthTokens } from '../services/api';
import type { User, RegisterData } from '../services/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  justRegistered: boolean;
  clearJustRegistered: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

  const clearJustRegistered = useCallback(() => {
    setJustRegistered(false);
  }, []);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const tokens = await getTokens();
      if (tokens?.accessToken) {
        const data = await authApi.getProfile();
        setUser(data.user);
      }
    } catch {
      // Token invalid/expired — clear
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi.login(email, password);
      const tokens: AuthTokens = {
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        expiresIn: data.tokens.expiresIn,
        issuedAt: Date.now(),
      };
      await saveTokens(tokens);
      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Logowanie nie powiodło się' };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const result = await authApi.register(data);
      const tokens: AuthTokens = {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        issuedAt: Date.now(),
      };
      await saveTokens(tokens);
      setUser(result.user);
      setJustRegistered(true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Rejestracja nie powiodła się' };
    }
  };

  const logout = useCallback(async () => {
    try {
      const tokens = await getTokens();
      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
    } catch {
      // Ignore logout API errors
    }
    await clearTokens();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await authApi.getProfile();
      setUser(data.user);
    } catch {}
  }, []);

  const deleteAccount = async (password: string) => {
    try {
      await authApi.deleteAccount(password);
      await clearTokens();
      setUser(null);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Usunięcie konta nie powiodło się' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        justRegistered,
        clearJustRegistered,
        login,
        register,
        logout,
        refreshProfile,
        deleteAccount,
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
