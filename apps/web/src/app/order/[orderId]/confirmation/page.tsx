'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ordersApi, checkoutApi } from '@/lib/api';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productName: string;
  variantName?: string;
  sku?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  createdAt: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    apartment?: string;
    postalCode: string;
    city: string;
  } | null;
  shippingMethod: string;
  paymentMethod: string;
  items: OrderItem[];
}

function OrderConfirmationPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  // Pobierz parametry z URL PayU
  const payuOrderId = searchParams.get('orderId');

  const fetchOrder = useCallback(async () => {
    try {
      const data = await ordersApi.getById(orderId);
      setOrder(data as Order);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie znaleziono zamówienia');
      return null;
    }
  }, [orderId]);

  // Weryfikuj płatność PayU jeśli mamy orderId z URL
  const verifyPayment = useCallback(async () => {
    if (!payuOrderId) return;
    
    setIsVerifying(true);
    try {
      const result = await checkoutApi.verifyPayment(payuOrderId);
      console.log('Payment verification result:', result);
      
      // Po weryfikacji odśwież dane zamówienia
      await fetchOrder();
    } catch (err) {
      console.error('Payment verification error:', err);
      // Nie pokazuj błędu użytkownikowi - zamówienie może być już zaktualizowane
    } finally {
      setIsVerifying(false);
    }
  }, [payuOrderId, fetchOrder]);

  useEffect(() => {
    const initialize = async () => {
      if (orderId) {
        await fetchOrder();
        
        // Jeśli mamy payuOrderId z URL, weryfikuj płatność
        if (payuOrderId) {
          await verifyPayment();
        }
        
        setIsLoading(false);
      }
    };

    initialize();
  }, [orderId, payuOrderId, fetchOrder, verifyPayment]);

  // Auto-refresh dla statusu AWAITING_CONFIRMATION (co 5 sekund)
  useEffect(() => {
    if (order?.paymentStatus === 'AWAITING_CONFIRMATION' || order?.paymentStatus === 'PENDING') {
      const interval = setInterval(async () => {
        console.log('Auto-checking payment status...');
        
        // Jeśli mamy payuOrderId, weryfikuj przez API
        if (payuOrderId) {
          try {
            const result = await checkoutApi.verifyPayment(payuOrderId);
            if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'cancelled') {
              // Status się zmienił, odśwież zamówienie
              await fetchOrder();
            }
          } catch (err) {
            console.error('Auto-verify error:', err);
          }
        } else {
          // Tylko odśwież dane zamówienia
          await fetchOrder();
        }
      }, 5000); // Co 5 sekund

      return () => clearInterval(interval);
    }
  }, [order?.paymentStatus, payuOrderId, fetchOrder]);

  if (isLoading || isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isVerifying ? 'Weryfikuję płatność...' : 'Ładowanie...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Błąd</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  const shippingMethodNames: Record<string, string> = {
    inpost_paczkomat: 'InPost Paczkomat',
    inpost_kurier: 'Kurier InPost',
    wysylka_gabaryt: 'Wysyłka gabaryt',
    pickup: 'Odbiór osobisty',
  };

  const paymentMethodNames: Record<string, string> = {
    payu: 'Płatność online (PayU)',
    blik: 'BLIK',
    card: 'Karta płatnicza',
    transfer: 'Przelew online',
    google_pay: 'Google Pay',
    apple_pay: 'Apple Pay',
    paypo: 'PayPo',
  };

  const statusBadge = () => {
    switch (order?.paymentStatus) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            ✓ Opłacone
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            ✗ Płatność nieudana
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Anulowane
          </span>
        );
      case 'AWAITING_CONFIRMATION':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            ⏳ Potwierdź w aplikacji
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Oczekuje na płatność
          </span>
        );
    }
  };

  // Konfiguracja widoku w zależności od statusu płatności
  const getStatusConfig = () => {
    switch (order?.paymentStatus) {
      case 'PAID':
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ),
          title: 'Płatność zakończona!',
          subtitle: 'Twoje zamówienie zostało opłacone i jest w trakcie realizacji',
          showRetryButton: false,
          alertBox: null,
        };
      case 'FAILED':
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          ),
          title: 'Płatność nieudana',
          subtitle: 'Niestety nie udało się zrealizować płatności',
          showRetryButton: true,
          alertBox: (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-medium text-red-800">Płatność została odrzucona</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Możliwe przyczyny: niewystarczające środki, błędne dane karty, lub problem z autoryzacją.
                    Możesz spróbować ponownie lub wybrać inną metodę płatności.
                  </p>
                </div>
              </div>
            </div>
          ),
        };
      case 'CANCELLED':
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          ),
          title: 'Zamówienie anulowane',
          subtitle: 'To zamówienie zostało anulowane',
          showRetryButton: false,
          alertBox: null,
        };
      case 'AWAITING_CONFIRMATION':
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          ),
          title: 'Potwierdź płatność w aplikacji',
          subtitle: 'Otwórz aplikację bankową i zatwierdź transakcję',
          showRetryButton: false,
          alertBox: (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-800">Wymagane potwierdzenie w aplikacji bankowej</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Twoja płatność BLIK lub karta wymaga potwierdzenia. Otwórz aplikację swojego banku 
                    i zatwierdź transakcję. Strona odświeży się automatycznie po potwierdzeniu.
                  </p>
                </div>
              </div>
            </div>
          ),
        };
      default: // PENDING
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ),
          title: 'Dziękujemy za zamówienie!',
          subtitle: 'Twoje zamówienie zostało przyjęte i oczekuje na płatność',
          showRetryButton: true,
          alertBox: (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-medium text-yellow-800">Oczekiwanie na płatność</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Jeśli płatność nie została jeszcze zrealizowana, możesz spróbować ponownie klikając przycisk poniżej.
                  </p>
                </div>
              </div>
            </div>
          ),
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-bold text-orange-500">
            WB Trade
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Status message */}
        <div className="text-center mb-8">
          {statusConfig.icon}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {statusConfig.title}
          </h1>
          <p className="text-lg text-gray-600">
            {statusConfig.subtitle}
          </p>
        </div>

        {/* Alert box for failed/pending payments */}
        {statusConfig.alertBox}

        {/* Retry payment button */}
        {statusConfig.showRetryButton && order?.paymentStatus !== 'PAID' && (
          <div className="flex justify-center mb-6">
            <Link
              href={`/checkout`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Spróbuj ponownie zapłacić
            </Link>
          </div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold">Zamówienie #{order?.orderNumber}</h2>
              <p className="text-sm text-gray-500">
                Złożone {new Date(order?.createdAt || '').toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {statusBadge()}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Shipping address */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">📍 Adres dostawy</h3>
              <p className="text-sm text-gray-600">
                {order?.shippingAddress?.firstName} {order?.shippingAddress?.lastName}<br />
                {order?.shippingAddress?.street}<br />
                {order?.shippingAddress?.postalCode} {order?.shippingAddress?.city}
              </p>
            </div>

            {/* Delivery & Payment */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">🚚 Dostawa i płatność</h3>
              <p className="text-sm text-gray-600">
                {shippingMethodNames[order?.shippingMethod || ''] || order?.shippingMethod}<br />
                {paymentMethodNames[order?.paymentMethod || ''] || order?.paymentMethod}
              </p>
            </div>
          </div>

          {/* Items */}
          <h3 className="font-medium text-gray-900 mb-3">Zamówione produkty</h3>
          <div className="space-y-3">
            {order?.items?.map((item) => (
              <div key={item.id} className="flex gap-4 p-3 border rounded-lg">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.productName || 'Produkt'}</p>
                  {item.variantName && item.variantName !== 'Default' && (
                    <p className="text-sm text-gray-500">{item.variantName}</p>
                  )}
                  <p className="text-sm text-gray-500">Ilość: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-orange-600">
                    {Number(item.total).toFixed(2)} zł
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-6 pt-4 border-t space-y-2">
            <div className="flex justify-between items-center text-gray-600">
              <span>Suma częściowa</span>
              <span>{Number(order?.subtotal || 0).toFixed(2)} zł</span>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <span>Dostawa</span>
              <span>{Number(order?.shipping || 0).toFixed(2)} zł</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-lg font-bold">Razem</span>
              <span className="text-2xl font-bold text-orange-600">
                {Number(order?.total || 0).toFixed(2)} zł
              </span>
            </div>
          </div>
        </div>

        {/* Next steps - only show for successful/pending payments */}
        {order?.paymentStatus !== 'FAILED' && order?.paymentStatus !== 'CANCELLED' && (
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">Co dalej?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Na podany adres email wysłaliśmy potwierdzenie zamówienia</li>
              <li>Otrzymasz powiadomienie o zmianie statusu zamówienia</li>
              <li>Możesz śledzić status zamówienia w swoim koncie</li>
            </ol>
          </div>
        )}

        {/* Help message for failed payments */}
        {order?.paymentStatus === 'FAILED' && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Potrzebujesz pomocy?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Jeśli masz problemy z płatnością, możesz:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>Sprawdzić czy masz wystarczające środki na koncie</li>
              <li>Upewnić się, że dane karty są poprawne</li>
              <li>Spróbować innej metody płatności (BLIK, przelew, karta)</li>
              <li>Skontaktować się z naszym zespołem wsparcia</li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/account"
            className="inline-flex items-center justify-center px-6 py-3 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 font-medium"
          >
            Moje zamówienia
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
          >
            Kontynuuj zakupy
          </Link>
        </div>
      </main>
    </div>
  );
}
export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
      </div>
    }>
      <OrderConfirmationPageContent />
    </Suspense>
  );
}