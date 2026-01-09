'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Nieprawidłowy link weryfikacyjny');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email/${token}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Email został zweryfikowany!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Weryfikacja nie powiodła się');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setStatus('error');
      setMessage('Wystąpił błąd podczas weryfikacji');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Weryfikacja email...
            </h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg
                className="h-10 w-10 text-green-600"
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
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Email zweryfikowany!
            </h2>
            <p className="mt-2 text-gray-600">{message}</p>
            <p className="mt-4 text-sm text-gray-500">
              Przekierowywanie do logowania...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <svg
                className="h-10 w-10 text-red-600"
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
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Weryfikacja nie powiodła się
            </h2>
            <p className="mt-2 text-gray-600">{message}</p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Wróć do strony głównej
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Przejdź do logowania
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
