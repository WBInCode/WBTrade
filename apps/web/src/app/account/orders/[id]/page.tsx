'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import { useAuth } from '../../../../contexts/AuthContext';
import { ordersApi, Order } from '../../../../lib/api';

// Order status types
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
type PaymentStatus = 'PENDING' | 'AWAITING_CONFIRMATION' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

// Sidebar navigation items
const sidebarItems = [
  { id: 'overview', label: 'Przegląd', icon: 'grid', href: '/account' },
  { id: 'orders', label: 'Moje zamówienia', icon: 'shopping-bag', href: '/account/orders' },
  { id: 'profile', label: 'Dane osobowe', icon: 'user', href: '/account/profile' },
  { id: 'addresses', label: 'Adresy', icon: 'location', href: '/account/addresses' },
  { id: 'password', label: 'Zmiana hasła', icon: 'lock', href: '/account/password' },
  { id: 'settings', label: 'Ustawienia', icon: 'settings', href: '/account/settings' },
];

function SidebarIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'grid':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case 'shopping-bag':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    case 'user':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'location':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'lock':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case 'settings':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
}

function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    case 'CONFIRMED':
    case 'PROCESSING':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    case 'SHIPPED':
      return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300';
    case 'DELIVERED':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'CANCELLED':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    case 'REFUNDED':
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
  }
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Oczekuje na płatność';
    case 'CONFIRMED':
      return 'Potwierdzone';
    case 'PROCESSING':
      return 'W realizacji';
    case 'SHIPPED':
      return 'W drodze';
    case 'DELIVERED':
      return 'Dostarczono';
    case 'CANCELLED':
      return 'Anulowano';
    case 'REFUNDED':
      return 'Zwrócono';
    default:
      return status;
  }
}

function getPaymentStatusBadge(status?: PaymentStatus) {
  switch (status) {
    case 'PAID':
      return <span className="inline-flex items-center gap-1 text-green-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Opłacono</span>;
    case 'PENDING':
      return <span className="inline-flex items-center gap-1 text-yellow-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg> Oczekuje</span>;
    case 'AWAITING_CONFIRMATION':
      return <span className="inline-flex items-center gap-1 text-blue-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg> Potwierdź w aplikacji</span>;
    case 'FAILED':
      return <span className="inline-flex items-center gap-1 text-red-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> Niepowodzenie</span>;
    case 'CANCELLED':
      return <span className="inline-flex items-center gap-1 text-gray-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> Anulowano</span>;
    case 'REFUNDED':
      return <span className="inline-flex items-center gap-1 text-gray-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg> Zwrócono</span>;
    default:
      return <span className="inline-flex items-center gap-1 text-gray-600 text-sm">Nieznany</span>;
  }
}

function formatOrderDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusTimelineSteps(status: OrderStatus): { label: string; isCompleted: boolean; isCurrent: boolean }[] {
  const allSteps = [
    { key: 'PENDING', label: 'Zamówienie złożone' },
    { key: 'CONFIRMED', label: 'Płatność potwierdzona' },
    { key: 'PROCESSING', label: 'W realizacji' },
    { key: 'SHIPPED', label: 'Wysłano' },
    { key: 'DELIVERED', label: 'Dostarczono' },
  ];

  const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentIndex = statusOrder.indexOf(status);

  // Handle cancelled/refunded separately
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return allSteps.map((step) => ({
      label: step.label,
      isCompleted: false,
      isCurrent: false,
    })).concat([{
      label: status === 'CANCELLED' ? 'Anulowano' : 'Zwrócono',
      isCompleted: true,
      isCurrent: true,
    }]);
  }

  return allSteps.map((step, index) => ({
    label: step.label,
    isCompleted: index <= currentIndex,
    isCurrent: index === currentIndex,
  }));
}

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  
  // Refund states
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundEligibility, setRefundEligibility] = useState<{
    eligible: boolean;
    reason?: string;
    daysRemaining?: number;
    deliveredAt?: string;
  } | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [refundResult, setRefundResult] = useState<{
    refundNumber: string;
    returnAddress: {
      name: string;
      contactPerson: string;
      street: string;
      city: string;
      postalCode: string;
      phone: string;
      email: string;
    };
  } | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch order from API
  useEffect(() => {
    async function fetchOrder() {
      if (!isAuthenticated || !orderId) return;
      
      try {
        setOrderLoading(true);
        setError(null);
        const response = await ordersApi.getById(orderId);
        setOrder(response);
      } catch (err: unknown) {
        console.error('Error fetching order:', err);
        const errorMessage = err instanceof Error ? err.message : 'Nie udało się pobrać szczegółów zamówienia';
        setError(errorMessage);
      } finally {
        setOrderLoading(false);
      }
    }
    
    fetchOrder();
  }, [isAuthenticated, orderId]);

  // Check refund eligibility when order is loaded
  useEffect(() => {
    async function checkEligibility() {
      if (!order || !['DELIVERED', 'SHIPPED'].includes(order.status)) return;
      
      try {
        const eligibility = await ordersApi.checkRefundEligibility(order.id);
        setRefundEligibility(eligibility);
      } catch (err) {
        console.error('Error checking refund eligibility:', err);
      }
    }
    
    checkEligibility();
  }, [order]);

  const handleCancelOrder = async () => {
    if (!order) return;
    
    if (!confirm('Czy na pewno chcesz anulować to zamówienie?')) {
      return;
    }

    try {
      setCancelling(true);
      await ordersApi.cancel(order.id);
      // Zaktualizuj lokalny stan zamówienia
      setOrder({ ...order, status: 'CANCELLED' });
    } catch (err: unknown) {
      console.error('Error cancelling order:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się anulować zamówienia';
      alert(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  const handleRefundRequest = async () => {
    if (!order) return;
    
    try {
      setRefundSubmitting(true);
      setRefundError(null);
      
      const response = await ordersApi.requestRefund(order.id, refundReason);
      
      setRefundSuccess(true);
      setRefundResult({
        refundNumber: response.refundNumber,
        returnAddress: response.returnAddress,
      });
      setOrder({ ...order, status: 'REFUNDED', paymentStatus: 'REFUNDED' });
      
    } catch (err: unknown) {
      console.error('Error requesting refund:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się złożyć wniosku o zwrot';
      setRefundError(errorMessage);
    } finally {
      setRefundSubmitting(false);
    }
  };

  if (isLoading || orderLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
        <Header />
        <main className="container-custom py-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Zamówienie nie znalezione</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{error || 'Nie mogliśmy znaleźć zamówienia o podanym numerze.'}</p>
            <Link href="/account/orders" className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors">
              Wróć do zamówień
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const userData = {
    name: user?.firstName || 'Użytkownik',
    fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    avatar: `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`,
  };

  const statusSteps = getStatusTimelineSteps(order.status as OrderStatus);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
      <Header />

      <main className="container-custom py-4 sm:py-6">
        {/* Breadcrumb - hidden on mobile */}
        <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-orange-500">Strona główna</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/account" className="hover:text-orange-500">Moje konto</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/account/orders" className="hover:text-orange-500">Moje zamówienia</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 dark:text-white">#{order.orderNumber}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - hidden on mobile */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-gray-100 dark:border-secondary-700 overflow-hidden">
              {/* User Profile */}
              <div className="p-5 border-b border-gray-100 dark:border-secondary-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {userData.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{userData.fullName}</h3>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-3">
                {sidebarItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      item.id === 'orders'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-secondary-700'
                    }`}
                  >
                    <SidebarIcon icon={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Link href="/account/orders" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zamówienie #{order.orderNumber}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status as OrderStatus)}`}>
                    {getStatusLabel(order.status as OrderStatus)}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Złożone {formatOrderDate(order.createdAt)}</p>
              </div>
              <div className="flex gap-3">
                {order.paymentStatus === 'PENDING' && order.status !== 'CANCELLED' && (
                  <Link 
                    href={`/order/${order.id}/payment`}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    Zapłać teraz
                  </Link>
                )}
                {order.status === 'SHIPPED' && order.trackingNumber && (
                  <a
                    href={`https://inpost.pl/sledzenie-przesylek?number=${order.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Śledź przesyłkę
                  </a>
                )}
                {order.wantInvoice && order.paymentStatus === 'PAID' && (
                  <Link
                    href={`/account/orders/${order.id}/invoice`}
                    className="px-4 py-2 border border-gray-300 dark:border-secondary-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Pobierz fakturę
                  </Link>
                )}
              </div>
            </div>

            {/* Order Notes/Alerts */}
            {order.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-yellow-800">{order.notes}</p>
              </div>
            )}

            {/* Status Timeline */}
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Status zamówienia</h2>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-secondary-700"></div>
                
                {/* Timeline items */}
                <div className="space-y-6">
                  {statusSteps.map((item, index) => (
                    <div key={index} className="relative flex items-start gap-4 pl-10">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        item.isCompleted 
                          ? item.isCurrent 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {item.isCompleted ? (
                          item.isCurrent ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )
                        ) : (
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-2">
                        <h4 className={`font-medium ${item.isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                          {item.label}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking Info */}
              {order.trackingNumber && order.status === 'SHIPPED' && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-secondary-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Numer przesyłki:</span>
                      <p className="font-mono font-medium text-gray-900 dark:text-white">{order.trackingNumber}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm mb-6">
              <div className="p-5 border-b border-gray-100 dark:border-secondary-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Produkty ({order.items.length})</h2>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-secondary-700">
                {order.items.map((item) => (
                  <div key={item.id} className="p-5 flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-secondary-700 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={item.variant?.product?.images?.[0]?.url || '/placeholder.png'}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">{item.productName}</h4>
                      {item.variantName && item.variantName !== 'Default' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{item.variantName}</p>
                      )}
                      <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                    </div>
                    <div className="text-center shrink-0 px-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Ilość</span>
                      <p className="font-medium text-gray-900 dark:text-white">{item.quantity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-gray-900 dark:text-white">{Number(item.unitPrice).toFixed(2)} zł</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="p-5 bg-gray-50 dark:bg-secondary-900 border-t border-gray-100 dark:border-secondary-700">
                <div className="max-w-xs ml-auto space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Suma częściowa</span>
                    <span className="text-gray-900 dark:text-white">{Number(order.subtotal).toFixed(2)} zł</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Dostawa ({order.shippingMethod})</span>
                    <span className="text-gray-900 dark:text-white">{Number(order.shipping) === 0 ? 'Bezpłatna' : `${Number(order.shipping).toFixed(2)} zł`}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Rabat</span>
                      <span className="text-green-600">-{Number(order.discount).toFixed(2)} zł</span>
                    </div>
                  )}
                  {Number(order.tax) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">VAT</span>
                      <span className="text-gray-900 dark:text-white">{Number(order.tax).toFixed(2)} zł</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-secondary-700">
                    <span className="text-gray-900 dark:text-white">Razem</span>
                    <span className="text-gray-900 dark:text-white">{Number(order.total).toFixed(2)} zł</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping & Payment Info */}
            <div className="grid grid-cols-2 gap-6">
              {/* Shipping Address */}
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {order.paczkomatCode ? 'Paczkomat InPost' : 'Adres dostawy'}
                  </h3>
                </div>
                {order.paczkomatCode ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-medium text-gray-900 dark:text-white">{order.paczkomatCode}</p>
                    {order.paczkomatAddress && (
                      <p>{order.paczkomatAddress}</p>
                    )}
                  </div>
                ) : order.shippingAddress ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                    <p>{order.shippingAddress.street}</p>
                    <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                    <p>{order.shippingAddress.country}</p>
                    <p className="pt-2">{order.shippingAddress.phone}</p>
                    <p>{order.shippingAddress.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Brak danych adresu dostawy</p>
                )}
              </div>

              {/* Payment Info */}
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Płatność</h3>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Metoda płatności</span>
                    <span className="font-medium text-gray-900 dark:text-white">{order.paymentMethod}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </div>
                </div>

                {/* Billing Address */}
                {order.billingAddress && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-secondary-700">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Adres rozliczeniowy</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p className="font-medium text-gray-900 dark:text-white">{order.billingAddress.firstName} {order.billingAddress.lastName}</p>
                      <p>{order.billingAddress.street}</p>
                      <p>{order.billingAddress.postalCode} {order.billingAddress.city}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Refund Eligibility Info */}
            {refundEligibility && ['DELIVERED', 'SHIPPED'].includes(order.status) && (
              <div className={`mt-6 p-4 rounded-lg border ${
                refundEligibility.eligible 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-3">
                  {refundEligibility.eligible ? (
                    <>
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-400">
                          Możesz zwrócić to zamówienie
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500">
                          Pozostało {refundEligibility.daysRemaining} dni na złożenie wniosku o zwrot (14 dni od dostawy)
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Zwrot nie jest już możliwy
                        </p>
                        <p className="text-xs text-gray-500">
                          {refundEligibility.reason}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Refund Info - when order is refunded */}
            {order.status === 'REFUNDED' && order.refundNumber && (
              <div className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-400">Informacje o zwrocie</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Numer zwrotu:</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400 font-mono">{order.refundNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Data zgłoszenia:</p>
                    <p className="font-medium text-orange-800 dark:text-orange-400">
                      {order.refundRequestedAt ? new Date(order.refundRequestedAt).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '-'}
                    </p>
                  </div>
                </div>

                {order.refundReason && (
                  <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-700">
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Podany powód:</p>
                    <p className="text-orange-800 dark:text-orange-400">{order.refundReason}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-700">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-400 mb-2">Adres do wysyłki zwrotu:</p>
                  <div className="text-orange-700 dark:text-orange-300 text-sm">
                    <p className="font-semibold">WB Partners</p>
                    <p>Daniel Budyka</p>
                    <p>ul. Juliusza Słowackiego 24/11</p>
                    <p>35-060 Rzeszów</p>
                    <p className="mt-2">Tel: 570 028 761</p>
                    <p>support@wb-partners.pl</p>
                  </div>
                  <p className="mt-3 text-sm text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                    ⚠️ Pamiętaj o umieszczeniu numeru zwrotu <strong>{order.refundNumber}</strong> w paczce lub na paczce!
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between">
              <Link
                href="/account/orders"
                className="text-orange-500 hover:text-orange-600 font-medium text-sm inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Wróć do zamówień
              </Link>
              
              <div className="flex gap-3">
                {['DELIVERED', 'SHIPPED'].includes(order.status) && refundEligibility?.eligible && (
                  <button 
                    onClick={() => setShowRefundModal(true)}
                    className="px-4 py-2 border border-orange-300 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Złóż wniosek o zwrot
                  </button>
                )}
                {order.status === 'DELIVERED' && (
                  <>
                    <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                      Kup ponownie
                    </button>
                  </>
                )}
                {['OPEN', 'PENDING', 'CONFIRMED'].includes(order.status) && (
                  <button 
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelling ? 'Anulowanie...' : 'Anuluj zamówienie'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Wniosek o zwrot</h2>
                <button 
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundError(null);
                    setRefundReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {refundSuccess && refundResult ? (
                <div className="py-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">Wniosek o zwrot przyjęty!</h3>
                  
                  {/* Refund Number */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Twój numer zwrotu:</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-mono">{refundResult.refundNumber}</p>
                  </div>

                  {/* Return Address */}
                  <div className="bg-gray-50 dark:bg-secondary-700 border border-gray-200 dark:border-secondary-600 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Adres do wysyłki zwrotu:</p>
                    <div className="text-gray-900 dark:text-white">
                      <p className="font-semibold">{refundResult.returnAddress.name}</p>
                      <p>{refundResult.returnAddress.contactPerson}</p>
                      <p>{refundResult.returnAddress.street}</p>
                      <p>{refundResult.returnAddress.postalCode} {refundResult.returnAddress.city}</p>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Tel: {refundResult.returnAddress.phone}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{refundResult.returnAddress.email}</p>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">⚠️ Ważne!</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Umieść numer zwrotu <strong>{refundResult.refundNumber}</strong> wewnątrz paczki lub na zewnątrz, abyśmy mogli zidentyfikować Twój zwrot.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowRefundModal(false);
                      setRefundSuccess(false);
                      setRefundResult(null);
                      setRefundReason('');
                    }}
                    className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                  >
                    Zamknij
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Informacje o zwrocie</h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Zwrot możliwy do 14 dni od daty dostawy</li>
                        <li>• Produkt musi być w oryginalnym opakowaniu</li>
                        <li>• Produkt nie może nosić śladów użytkowania</li>
                        <li>• Zwrot kosztów nastąpi w ciągu 14 dni od otrzymania towaru</li>
                      </ul>
                      <Link 
                        href="/returns" 
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                      >
                        Przeczytaj pełną politykę zwrotów →
                      </Link>
                    </div>

                    <div className="bg-gray-50 dark:bg-secondary-700 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Zamówienie:</span> #{order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Kwota do zwrotu:</span> {Number(order.total).toFixed(2)} zł
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Pozostało dni:</span> {refundEligibility?.daysRemaining} z 14
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Powód zwrotu <span className="text-gray-400 font-normal">(opcjonalnie)</span>
                    </label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Opisz powód zwrotu (opcjonalnie)..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  {refundError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{refundError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRefundModal(false);
                        setRefundError(null);
                        setRefundReason('');
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-secondary-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={handleRefundRequest}
                      disabled={refundSubmitting}
                      className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {refundSubmitting ? 'Wysyłanie...' : 'Złóż wniosek o zwrot'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer hideTrustBadges />
    </div>
  );
}
