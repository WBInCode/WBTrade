import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/Config';

const API_URL = Config.API_URL;

// Token storage keys
const TOKEN_KEY = 'auth_tokens';
const SESSION_KEY = 'cart_session_id';

// --- Token management ---

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  issuedAt: number;
}

export async function getTokens(): Promise<AuthTokens | null> {
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  const withTimestamp = {
    ...tokens,
    issuedAt: tokens.issuedAt || Date.now(),
  };
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(withTimestamp));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// --- Session ID for guest carts ---

export async function getSessionId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {}
  return null;
}

export async function saveSessionId(sessionId: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, sessionId);
}

// --- API Error ---

export class ApiError extends Error {
  statusCode: number;
  errors?: Record<string, string>;

  constructor(message: string, statusCode: number, errors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

// --- Token refresh ---

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const tokens = await getTokens();
      if (!tokens?.refreshToken) return false;

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        await saveTokens(data.tokens);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// --- Main fetch wrapper ---

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, any>;
  skipAuth?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, params, skipAuth = false } = options;

  // Build URL with query params
  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) url += `?${queryString}`;
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Platform': 'mobile',
  };

  if (!skipAuth) {
    const tokens = await getTokens();
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
  }

  // Add session ID for guest carts
  const sessionId = await getSessionId();
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }

  // Make request
  const fetchOptions: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  let response = await fetch(url, fetchOptions);

  // Handle 401 — try token refresh once
  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newTokens = await getTokens();
      if (newTokens?.accessToken) {
        headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
      }
      response = await fetch(url, { ...fetchOptions, headers });
    }
  }

  // Parse response
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data?.errors,
    );
  }

  // Save session ID from response headers if present
  const newSessionId = response.headers.get('X-Session-Id');
  if (newSessionId) {
    await saveSessionId(newSessionId);
  }

  return data as T;
}

// --- Convenience methods ---

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    apiFetch<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, { method: 'POST', body }),

  put: <T>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, { method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, { method: 'PATCH', body }),

  delete: <T>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }),
};
