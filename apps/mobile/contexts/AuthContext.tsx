import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authApi } from '../services/auth';
import { getTokens, saveTokens, clearTokens, AuthTokens } from '../services/api';
import { Config } from '../constants/Config';
import type { User, RegisterData } from '../services/types';

// Needed so Google's auth session can redirect back to the app
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  justRegistered: boolean;
  clearJustRegistered: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
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

  const loginWithGoogle = useCallback(async () => {
    try {
      const redirectUri = Linking.createURL('auth/google-callback');
      const apiBase = Config.API_URL.replace('/api', '');
      const authUrl = `${apiBase}/api/auth/google?redirect=${encodeURIComponent(redirectUri)}`;

      let linkingSubscription: ReturnType<typeof Linking.addEventListener> | null = null;

      // Race openAuthSessionAsync (iOS / Chrome Custom Tab) against Linking listener
      // (Android system intent). Whichever fires first wins.
      const tokenUrl = await new Promise<string | null>((resolve) => {
        let settled = false;

        const finish = (url: string | null) => {
          if (settled) return;
          settled = true;
          linkingSubscription?.remove();
          linkingSubscription = null;
          resolve(url);
        };

        // Android primary path: deep-link arrives as system intent
        linkingSubscription = Linking.addEventListener('url', ({ url }) => {
          if (url.includes('auth/google-callback') && url.includes('accessToken')) {
            finish(url);
          }
        });

        // iOS primary path + Android fallback
        WebBrowser.openAuthSessionAsync(authUrl, redirectUri)
          .then((result) => {
            if (result.type === 'success' && result.url) {
              finish(result.url);
            } else {
              // Give the Linking listener a moment in case the deep-link
              // arrives just after Chrome Custom Tab closes on Android
              setTimeout(() => finish(null), 1000);
            }
          })
          .catch(() => finish(null));
      });

      if (!tokenUrl) {
        return { success: false, error: 'Logowanie Google anulowane' };
      }

      const parsed = Linking.parse(tokenUrl);
      const params = parsed.queryParams as Record<string, string>;

      if (!params.accessToken || !params.refreshToken) {
        return { success: false, error: 'Nie otrzymano tokenów od Google' };
      }

      await saveTokens({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        expiresIn: parseInt(params.expiresIn || '3600', 10),
        issuedAt: Date.now(),
      });

      const profileData = await authApi.getProfile();
      setUser(profileData.user);
      if (params.isNewUser === 'true') setJustRegistered(true);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Logowanie Google nie powiodło się' };
    }
  }, []);

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
        loginWithGoogle,
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
