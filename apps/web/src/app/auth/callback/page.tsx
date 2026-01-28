'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const { setTokens } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Przetwarzanie logowania...');
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (processedRef.current) return;
    processedRef.current = true;

    const processCallback = async () => {
      try {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const redirectParam = searchParams.get('redirect') || '/account';
        const redirect = decodeURIComponent(redirectParam); // Decode URL-encoded redirect
        const isNewUser = searchParams.get('isNewUser') === 'true';

        console.log('[AuthCallback] Processing OAuth callback, redirect:', redirect);

        if (!accessToken || !refreshToken) {
          setStatus('error');
          setMessage('Brak danych uwierzytelniających');
          setTimeout(() => {
            window.location.href = '/login?error=oauth_failed';
          }, 2000);
          return;
        }

        // Store tokens
        await setTokens(accessToken, refreshToken);

        setStatus('success');
        setMessage(isNewUser ? 'Konto utworzone! Przekierowywanie...' : 'Zalogowano! Przekierowywanie...');
        
        // Redirect after short delay - use window.location for reliable redirect
        setTimeout(() => {
          console.log('[AuthCallback] Redirecting to:', redirect);
          window.location.href = redirect;
        }, 1000);
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Wystąpił błąd podczas logowania');
        setTimeout(() => {
          window.location.href = '/login?error=oauth_failed';
        }, 2000);
      }
    };

    processCallback();
  }, [searchParams, setTokens]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4 text-center">
      {status === 'processing' && (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-800">{message}</h1>
        </>
      )}
      
      {status === 'success' && (
        <>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">{message}</h1>
        </>
      )}
      
      {status === 'error' && (
        <>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">{message}</h1>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4" />
      <h1 className="text-xl font-semibold text-gray-800">Ładowanie...</h1>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <Suspense fallback={<LoadingFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
