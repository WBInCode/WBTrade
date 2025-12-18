'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useAuth } from '../../../contexts/AuthContext';
import { ordersApi, Order } from '../../../lib/api';

// Order status types
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

// Sidebar navigation items
const sidebarItems = [
  { id: 'overview', label: 'Przegląd', icon: 'grid', href: '/account' },
  { id: 'orders', label: 'Moje zamówienia', icon: 'shopping-bag', href: '/account/orders' },
  { id: 'profile', label: 'Dane osobowe', icon: 'user', href: '/account/profile' },
  { id: 'addresses', label: 'Adresy', icon: 'location', href: '/account/addresses' },
  { id: 'password', label: 'Zmiana hasła', icon: 'lock', href: '/account/password' },
  { id: 'settings', label: 'Ustawienia', icon: 'settings', href: '/account/settings' },
];

// Filter tabs
const filterTabs = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'PENDING', label: 'Oczekujące' },
  { id: 'SHIPPED', label: 'W drodze' },
  { id: 'DELIVERED', label: 'Dostarczone' },
  { id: 'CANCELLED', label: 'Anulowane' },
  { id: 'REFUNDED', label: 'Zwroty' },
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-700';
    case 'CONFIRMED':
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-700';
    case 'SHIPPED':
      return 'bg-indigo-100 text-indigo-700';
    case 'DELIVERED':
      return 'bg-green-100 text-green-700';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusLabel(status: string): string {
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

function getStatusIcon(status: string) {
  switch (status) {
    case 'PENDING':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'CONFIRMED':
    case 'PROCESSING':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'SHIPPED':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    case 'DELIVERED':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'CANCELLED':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'REFUNDED':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      );
    default:
      return null;
  }
}

function formatOrderDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch orders from API
  useEffect(() => {
    async function fetchOrders() {
      if (!isAuthenticated) return;
      
      try {
        setOrdersLoading(true);
        const response = await ordersApi.getAll(currentPage, 10);
        setOrders(response.orders);
        setTotalOrders(response.total);
        setTotalPages(Math.ceil(response.total / response.limit));
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setOrdersLoading(false);
      }
    }
    
    fetchOrders();
  }, [isAuthenticated, currentPage]);

  if (isLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
  };

  // Filter orders based on active filter and search query
  const filteredOrders = orders.filter((order) => {
    const matchesFilter = activeFilter === 'all' || order.status === activeFilter;
    const matchesSearch = searchQuery === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Count orders by status
  const orderCounts = {
    all: orders.length,
    PENDING: orders.filter(o => o.status === 'PENDING').length,
    CONFIRMED: orders.filter(o => o.status === 'CONFIRMED').length,
    PROCESSING: orders.filter(o => o.status === 'PROCESSING').length,
    SHIPPED: orders.filter(o => o.status === 'SHIPPED').length,
    DELIVERED: orders.filter(o => o.status === 'DELIVERED').length,
    CANCELLED: orders.filter(o => o.status === 'CANCELLED').length,
    REFUNDED: orders.filter(o => o.status === 'REFUNDED').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-custom py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-orange-500">Strona główna</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/account" className="hover:text-orange-500">Moje konto</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">Moje zamówienia</span>
        </nav>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* User Profile */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {userData.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{userData.fullName}</h3>
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
                        : 'text-gray-600 hover:bg-gray-50'
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Moje zamówienia</h1>
                <p className="text-gray-500 text-sm">Przeglądaj i zarządzaj swoimi zamówieniami</p>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Szukaj po numerze zamówienia lub nazwie produktu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-2 overflow-x-auto">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeFilter === tab.id
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                    {orderCounts[tab.id as keyof typeof orderCounts] > 0 && (
                      <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                        activeFilter === tab.id
                          ? 'bg-white/20'
                          : 'bg-gray-200'
                      }`}>
                        {orderCounts[tab.id as keyof typeof orderCounts]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Brak zamówień</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery
                    ? 'Nie znaleziono zamówień pasujących do wyszukiwania'
                    : 'Nie masz jeszcze żadnych zamówień w tej kategorii'}
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Zacznij zakupy
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Order Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-xs text-gray-500">Numer zamówienia</span>
                          <p className="font-semibold text-gray-900">#{order.orderNumber}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Data zamówienia</span>
                          <p className="text-sm text-gray-700">{formatOrderDate(order.createdAt)}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Dostawa</span>
                          <p className="text-sm text-gray-700">{order.shippingMethod}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item) => (
                        <div key={item.id} className="p-4 flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                            <img
                              src={item.variant?.product?.images?.[0]?.url || '/placeholder.png'}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 mb-1">{item.productName}</h4>
                            {item.variantName && item.variantName !== 'Default' && (
                              <p className="text-sm text-gray-500">{item.variantName}</p>
                            )}
                            <p className="text-sm text-gray-500">Ilość: {item.quantity}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-semibold text-gray-900">{Number(item.unitPrice).toFixed(2)} zł</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Footer */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100">
                      <div>
                        {order.trackingNumber && order.status === 'SHIPPED' && (
                          <p className="text-sm text-gray-600">
                            <span className="text-green-600 font-medium">Numer przesyłki:</span> {order.trackingNumber}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm text-gray-500">Suma:</span>
                          <span className="ml-2 text-lg font-bold text-gray-900">{Number(order.total).toFixed(2)} zł</span>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'SHIPPED' && order.trackingNumber && (
                            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                              Śledź przesyłkę
                            </button>
                          )}
                          {order.status === 'PENDING' && (
                            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                              Zapłać teraz
                            </button>
                          )}
                          {order.status === 'DELIVERED' && (
                            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                              Kup ponownie
                            </button>
                          )}
                          <Link
                            href={`/account/orders/${order.id}`}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Szczegóły
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500">
                  Wyświetlanie {filteredOrders.length} z {totalOrders} zamówień
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Poprzednia
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        currentPage === page
                          ? 'bg-orange-500 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      {page}
                    </button>
                  ))}
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Następna
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer hideTrustBadges />
    </div>
  );
}
