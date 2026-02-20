'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import { Product, dashboardApi, checkoutApi, productsApi, DashboardStats, DashboardOrder } from '../../lib/api';
import { getStatusLabel, getStatusColor } from '../../lib/order-status';
import { useAuth } from '../../contexts/AuthContext';

// Sidebar navigation items
const sidebarItems = [
  { id: 'overview', label: 'Przegląd', icon: 'grid', href: '/account' },
  { id: 'orders', label: 'Moje zamówienia', icon: 'shopping-bag', href: '/account/orders' },
  { id: 'reviews', label: 'Moje opinie', icon: 'star', href: '/account/reviews' },
  { id: 'profile', label: 'Dane osobowe', icon: 'user', href: '/account/profile' },
  { id: 'addresses', label: 'Adresy', icon: 'location', href: '/account/addresses' },
  { id: 'password', label: 'Zmiana hasła', icon: 'lock', href: '/account/password' },
  { id: 'settings', label: 'Ustawienia', icon: 'settings', href: '/account/settings' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Dzień dobry';
  if (hour < 18) return 'Dzień dobry';
  return 'Dobry wieczór';
}

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
    case 'star':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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

function StatIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'package':
      return (
        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'truck':
      return (
        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    case 'message':
      return (
        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'coin':
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
        </svg>
      );
    default:
      return null;
  }
}

function formatOrderDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function AccountPageContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';

  // Dashboard state
  const [stats, setStats] = useState<DashboardStats>({
    unpaidOrders: 0,
    inTransitOrders: 0,
    unreadMessages: 0,
    loyaltyPoints: 0,
  });
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!isAuthenticated) return;
      
      try {
        setDashboardLoading(true);
        
        // Fetch dashboard overview and bestsellers in parallel
        const [overviewRes, bestsellersRes] = await Promise.all([
          dashboardApi.getOverview(),
          productsApi.getBestsellers({ limit: 4 }),
        ]);
        
        setStats(overviewRes.stats);
        setRecentOrders(overviewRes.recentOrders);
        // Store full product data to preserve variants for stock display
        setRecommendations(bestsellersRes.products);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setDashboardLoading(false);
      }
    }

    fetchDashboardData();
  }, [isAuthenticated]);

  // Handle payment - redirect to PayU
  const handlePayNow = async (orderId: string) => {
    try {
      setPayingOrderId(orderId);
      const response = await checkoutApi.retryPayment(orderId);
      
      if (response.success && response.paymentUrl) {
        // Redirect to PayU payment page
        window.location.href = response.paymentUrl;
      } else {
        alert('Nie udało się utworzyć sesji płatności. Spróbuj ponownie.');
        setPayingOrderId(null);
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Nie udało się przetworzyć płatności. Spróbuj ponownie.');
      setPayingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const userData = {
    name: user?.firstName || 'Użytkownik',
    fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    avatar: `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`,
    email: user?.email,
    emailVerified: user?.emailVerified,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
      <Header />

      <main className="container-custom py-6">
        {/* Success message for new registration */}
        {justRegistered && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-green-800">Konto utworzone pomyślnie!</h4>
              <p className="text-sm text-green-700">Witamy w WB Trade, {userData.name}!</p>
            </div>
          </div>
        )}

        {/* Email verification warning */}
        {!userData.emailVerified && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800">Zweryfikuj swój adres email</h4>
              <p className="text-sm text-yellow-700">
                Wysłaliśmy link weryfikacyjny na {userData.email}. Kliknij go, aby aktywować wszystkie funkcje konta.
              </p>
            </div>
          </div>
        )}

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
                      item.id === 'overview'
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
            {/* Mobile User Card */}
            <div className="lg:hidden mb-6">
              <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-gray-100 dark:border-secondary-700 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {userData.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{userData.fullName}</h3>
                  </div>
                </div>
                {/* Mobile Navigation */}
                <div className="grid grid-cols-3 gap-2">
                  {sidebarItems.slice(1, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex flex-col items-center justify-start gap-1 p-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      <SidebarIcon icon={item.icon} />
                      <span className="text-xs text-center leading-tight">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Greeting Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getGreeting()}, {userData.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Oto co się dziś dzieje na Twoim koncie.</p>
              </div>
              {/* <Link href="/account/report" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1"> */}
                {/* Zobacz pełny raport */}
                {/* <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> */}
                  {/* <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /> */}
                {/* </svg> */}
              {/* </Link> */}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-gray-100 dark:border-secondary-700 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Nieopłacone</span>
                  <StatIcon icon="package" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardLoading ? '...' : stats.unpaidOrders}
                </span>
              </div>
              <div className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-gray-100 dark:border-secondary-700 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">W drodze</span>
                  <StatIcon icon="truck" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardLoading ? '...' : stats.inTransitOrders}
                </span>
              </div>
              <div className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-gray-100 dark:border-secondary-700 shadow-sm hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Nieprzeczytane</span>
                  <StatIcon icon="message" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardLoading ? '...' : stats.unreadMessages}
                </span>
              </div>
              <div className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-gray-100 dark:border-secondary-700 shadow-sm hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Punkty lojalnościowe</span>
                  <StatIcon icon="coin" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardLoading ? '...' : stats.loyaltyPoints}
                </span>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm mb-8">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-secondary-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ostatnie zamówienia</h2>
                <Link href="/account/orders" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                  Zobacz wszystkie
                </Link>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-secondary-700">
                {dashboardLoading ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                    Ładowanie zamówień...
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="font-medium text-gray-600 dark:text-gray-400">Brak zamówień</p>
                    <p className="text-sm">Nie masz jeszcze żadnych zamówień</p>
                    <Link href="/products" className="inline-block mt-4 text-orange-500 hover:text-orange-600 font-medium">
                      Zacznij zakupy →
                    </Link>
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-gray-100 dark:bg-secondary-700 rounded-lg overflow-hidden shrink-0 relative">
                        {order.image ? (
                          <Image
                            src={order.image}
                            alt={order.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                          {order.name}
                          {order.itemsCount > 1 && (
                            <span className="text-gray-500 dark:text-gray-400 text-sm font-normal">
                              {' '}+{order.itemsCount - 1} więcej
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Zamówienie #{order.orderNumber} • Złożone {formatOrderDate(order.orderDate)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status, order.paymentStatus)}`}>
                            {getStatusLabel(order.status, order.paymentStatus)}
                          </span>
                          {order.status === 'SHIPPED' && order.trackingNumber && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Numer śledzenia: {order.trackingNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price and Actions - row on mobile */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 mt-2 sm:mt-0">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {order.total.toFixed(2).replace('.', ',')} {order.currency}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                        {order.paymentStatus === 'PENDING' && (
                          <button
                            onClick={() => handlePayNow(order.id)}
                            disabled={payingOrderId === order.id}
                            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {payingOrderId === order.id ? 'Przekierowywanie...' : 'Zapłać teraz'}
                          </button>
                        )}
                        {order.status === 'SHIPPED' && (
                          <Link
                            href={`/account/orders/${order.id}`}
                            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors bg-orange-500 text-white hover:bg-orange-600 text-center"
                          >
                            Śledź przesyłkę
                          </Link>
                        )}
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-300 dark:border-secondary-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-secondary-700 text-center"
                        >
                          Szczegóły
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bestsellers */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bestsellery</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Najchętniej kupowane produkty</p>
                  </div>
                </div>
                <Link href="/products/bestsellers" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1">
                  Zobacz więcej
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {dashboardLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-4 animate-pulse">
                      <div className="bg-gray-200 dark:bg-secondary-700 h-40 rounded-lg mb-3"></div>
                      <div className="bg-gray-200 dark:bg-secondary-700 h-4 rounded w-3/4 mb-2"></div>
                      <div className="bg-gray-200 dark:bg-secondary-700 h-4 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {recommendations.map((product) => (
                    <div key={product.id} className="relative">
                      {/* Bestseller badge */}
                      <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>🔥</span> Bestseller
                      </div>
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-secondary-800 rounded-xl p-8 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="font-medium text-gray-600 dark:text-gray-400">Brak rekomendacji</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Wyszukuj produkty, aby otrzymać spersonalizowane polecenia</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-secondary-700 bg-gray-50 dark:bg-secondary-900">
        <div className="h-6 sm:h-8"></div>
      </div>
      <Footer hideTrustBadges />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>}>
      <AccountPageContent />
    </Suspense>
  );
}
