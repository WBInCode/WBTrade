'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function NewsletterVerifyPage() {
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

    verifyNewsletter();
  }, [token]);

  const verifyNewsletter = async () => {
    try {
      const response = await fetch(`${API_URL}/newsletter/verify/${token}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Subskrypcja newslettera została potwierdzona!');
      } else {
        setStatus('error');
        setMessage(data.message || 'Weryfikacja nie powiodła się');
      }
    } catch (error) {
      console.error('Newsletter verification error:', error);
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
              Weryfikacja subskrypcji...
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
              Subskrypcja potwierdzona! 🎉
            </h2>
            <p className="mt-2 text-gray-600">{message}</p>
            
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🎁 Twój rabat -10%
              </h3>
              <p className="text-gray-700 mb-3">
                Użyj kodu przy pierwszych zakupach:
              </p>
              <div className="bg-white border-2 border-orange-500 rounded-lg py-3 px-4">
                <code className="text-2xl font-bold text-orange-600">NEWSLETTER10</code>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Sprawdź swoją skrzynkę email po więcej szczegółów!
              </p>
            </div>

            <button
              onClick={() => router.push('/products')}
              className="mt-6 w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Rozpocznij Zakupy
            </button>
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
            <button
              onClick={() => router.push('/')}
              className="mt-6 w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Wróć do strony głównej
            </button>
          </>
        )}
      </div>
    </div>
  );
}
