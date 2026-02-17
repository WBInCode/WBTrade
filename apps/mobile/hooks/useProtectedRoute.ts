import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to protect routes that require authentication.
 * Redirects to login screen if user is not authenticated.
 *
 * Usage: call useProtectedRoute() at the top of any protected screen.
 */
export function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  return { isLoading, isAuthenticated };
}

/**
 * Hook for the root layout to handle auth-based redirects.
 * - Logged-in user on auth screen → redirect to tabs
 * - Not logged-in user on protected screen → redirect to login
 */
export function useAuthRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // Logged in but on auth screen → go to main app
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);
}
