'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSimulationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<'success' | 'failed' | null>(null);

  const handlePayment = async (success: boolean) => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (success) {
        // Call API to mark payment as successful
        const storedTokens = localStorage.getItem('auth_tokens');
        let token = null;
        if (storedTokens) {
          try {
            const parsed = JSON.parse(storedTokens);
            token = parsed.accessToken || null;
          } catch {
            token = null;
          }
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/orders/${orderId}/simulate-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ action: 'pay' }),
        });

        if (response.ok) {
          setPaymentResult('success');
          // Redirect to confirmation after short delay
          setTimeout(() => {
            router.push(`/order/${orderId}/confirmation`);
          }, 2000);
        } else {
          setPaymentResult('failed');
        }
      } else {
        setPaymentResult('failed');
      }
    } catch (error) {
      console.error('Payment simulation error:', error);
      setPaymentResult('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentResult === 'success') {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Płatność zakończona sukcesem!</h1>
          <p className="text-gray-600 mb-6">Twoje zamówienie zostało opłacone. Za chwilę zostaniesz przekierowany...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (paymentResult === 'failed') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Płatność nieudana</h1>
          <p className="text-gray-600 mb-6">Nie udało się przetworzyć płatności. Spróbuj ponownie.</p>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentResult(null)}
              className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
            >
              Spróbuj ponownie
            </button>
            <Link
              href="/account"
              className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Wróć do panelu konta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Symulacja płatności</h1>
          <p className="text-gray-500 mt-2">To jest środowisko testowe</p>
        </div>

        {/* Order Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Numer zamówienia:</span>
            <span className="font-mono font-medium">{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Payment Simulation Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-yellow-800 font-medium">Środowisko testowe</p>
              <p className="text-sm text-yellow-700 mt-1">
                To jest symulacja płatności. W rzeczywistym sklepie zostałbyś przekierowany do bramki płatności.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handlePayment(true)}
            disabled={isProcessing}
            className="w-full py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Przetwarzanie...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Symuluj udaną płatność
              </>
            )}
          </button>
          
          <button
            onClick={() => handlePayment(false)}
            disabled={isProcessing}
            className="w-full py-4 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Symuluj nieudaną płatność
          </button>

          <Link
            href="/account"
            className="block w-full py-3 text-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Anuluj i wróć do konta
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          Kliknij "Symuluj udaną płatność" aby oznaczyć zamówienie jako opłacone.
        </p>
      </div>
    </div>
  );
}
