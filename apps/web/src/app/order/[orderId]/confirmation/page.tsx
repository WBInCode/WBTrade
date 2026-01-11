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
    dpd: 'Kurier DPD',
    pickup: 'Odbiór osobisty',
  };

  const paymentMethodNames: Record<string, string> = {
    blik: 'BLIK',
    card: 'Karta płatnicza',
    transfer: 'Przelew online',
    cod: 'Płatność przy odbiorze',
  };

  const statusBadge = () => {
    if (order?.paymentStatus === 'PAID') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          ✓ Opłacone
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        Oczekuje na płatność
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-bold text-orange-500">
            WBTrade
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {order?.paymentStatus === 'PAID' ? 'Płatność zakończona!' : 'Dziękujemy za zamówienie!'}
          </h1>
          <p className="text-lg text-gray-600">
            {order?.paymentStatus === 'PAID' 
              ? 'Twoje zamówienie zostało opłacone i jest w trakcie realizacji' 
              : 'Twoje zamówienie zostało przyjęte do realizacji'}
          </p>
        </div>

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
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <span className="text-lg font-bold">Razem</span>
            <span className="text-2xl font-bold text-orange-600">
              {Number(order?.total || 0).toFixed(2)} zł
            </span>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">Co dalej?</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Na podany adres email wysłaliśmy potwierdzenie zamówienia</li>
            <li>Otrzymasz powiadomienie o zmianie statusu zamówienia</li>
            <li>Możesz śledzić status zamówienia w swoim koncie</li>
          </ol>
        </div>

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