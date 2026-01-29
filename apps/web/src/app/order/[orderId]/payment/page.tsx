'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkoutApi } from '../../../../lib/api';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initiatePayment = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        
        const response = await checkoutApi.retryPayment(orderId);
        
        if (response.success && response.paymentUrl) {
          // Redirect to PayU payment page
          window.location.href = response.paymentUrl;
        } else {
          setError('Nie udało się utworzyć sesji płatności.');
          setIsProcessing(false);
        }
      } catch (err: any) {
        console.error('Error initiating payment:', err);
        setError(err.message || 'Wystąpił błąd podczas inicjowania płatności.');
        setIsProcessing(false);
      }
    };

    if (orderId) {
      initiatePayment();
    }
  }, [orderId]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-secondary-800 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Przekierowywanie do płatności</h1>
          <p className="text-gray-600 dark:text-gray-400">Za chwilę zostaniesz przekierowany do bramki płatności PayU...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-secondary-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-secondary-800 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Błąd płatności</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setIsProcessing(true);
                setError(null);
                checkoutApi.retryPayment(orderId)
                  .then(response => {
                    if (response.success && response.paymentUrl) {
                      window.location.href = response.paymentUrl;
                    } else {
                      setError('Nie udało się utworzyć sesji płatności.');
                      setIsProcessing(false);
                    }
                  })
                  .catch(err => {
                    setError(err.message || 'Wystąpił błąd.');
                    setIsProcessing(false);
                  });
              }}
              className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
            >
              Spróbuj ponownie
            </button>
            <Link
              href="/account/orders"
              className="block w-full py-3 border border-gray-300 dark:border-secondary-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-secondary-700 font-medium text-center"
            >
              Wróć do zamówień
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
