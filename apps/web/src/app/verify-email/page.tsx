'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Brak tokenu weryfikacyjnego');
      return;
    }

    // Verify email
    const verifyEmail = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        
        // Start countdown for redirect
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              router.push('/login');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(
          error.response?.data?.message || 
          'Token weryfikacyjny jest nieprawidłowy lub wygasł'
        );
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-block">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-2xl">W</span>
              </div>
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              Weryfikacja email
            </h1>
          </div>

          {/* Verifying State */}
          {status === 'verifying' && (
            <div className="text-center">
              <div className="inline-block">
                <svg
                  className="animate-spin h-12 w-12 text-orange-500 mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Weryfikujemy Twój adres email...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-10 h-10 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Email zweryfikowany!
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Twój adres email został pomyślnie zweryfikowany.
              </p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Przekierowanie do logowania za {countdown}s...
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                >
                  Przejdź do logowania
                </Link>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Weryfikacja nieudana
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {errorMessage}
              </p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                >
                  Przejdź do logowania
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center w-full px-6 py-3 border border-gray-300 dark:border-secondary-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-secondary-700 hover:bg-gray-50 dark:hover:bg-secondary-600 transition-colors"
                >
                  Zarejestruj się ponownie
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Help text */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Masz problem?{' '}
          <Link href="/contact" className="text-orange-500 hover:text-orange-600 font-medium">
            Skontaktuj się z nami
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <svg
              className="animate-spin h-12 w-12 text-orange-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
