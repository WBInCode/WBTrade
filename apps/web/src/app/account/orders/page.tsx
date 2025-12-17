'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useAuth } from '../../../contexts/AuthContext';

// Order status types
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  variant?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: OrderStatus;
  statusLabel: string;
  items: OrderItem[];
  totalAmount: number;
  shippingMethod: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

// Mock orders data
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: '882910',
    orderDate: '24 października 2023',
    status: 'shipped',
    statusLabel: 'W drodze',
    items: [
      {
        id: '1',
        name: 'Apple Watch Series 9 GPS 41mm',
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100',
        quantity: 1,
        price: 399.00,
        variant: 'Midnight Aluminum',
      },
    ],
    totalAmount: 409.99,
    shippingMethod: 'InPost Kurier',
    trackingNumber: 'INP123456789',
    estimatedDelivery: 'Czwartek, 26 października',
  },
  {
    id: '2',
    orderNumber: '882855',
    orderDate: '20 października 2023',
    status: 'delivered',
    statusLabel: 'Dostarczono',
    items: [
      {
        id: '2',
        name: 'Sony WH-1000XM5 Słuchawki z ANC',
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100',
        quantity: 1,
        price: 348.00,
        variant: 'Czarny',
      },
      {
        id: '3',
        name: 'Etui ochronne na słuchawki',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100',
        quantity: 1,
        price: 29.99,
      },
    ],
    totalAmount: 387.99,
    shippingMethod: 'InPost Paczkomat',
  },
  {
    id: '3',
    orderNumber: '881302',
    orderDate: '15 października 2023',
    status: 'pending',
    statusLabel: 'Oczekuje na płatność',
    items: [
      {
        id: '4',
        name: 'Minimalistyczny zegarek analogowy - biało-złoty',
        image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=100',
        quantity: 1,
        price: 120.00,
      },
    ],
    totalAmount: 130.99,
    shippingMethod: 'DPD Kurier',
  },
  {
    id: '4',
    orderNumber: '879541',
    orderDate: '5 października 2023',
    status: 'cancelled',
    statusLabel: 'Anulowane',
    items: [
      {
        id: '5',
        name: 'Dell XPS 13 Laptop',
        image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=100',
        quantity: 1,
        price: 999.00,
      },
    ],
    totalAmount: 999.00,
    shippingMethod: 'DHL Express',
  },
  {
    id: '5',
    orderNumber: '875123',
    orderDate: '25 września 2023',
    status: 'returned',
    statusLabel: 'Zwrócono',
    items: [
      {
        id: '6',
        name: 'Nike Air Zoom Pegasus 39',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100',
        quantity: 1,
        price: 89.99,
        variant: 'Rozmiar: 42',
      },
    ],
    totalAmount: 99.99,
    shippingMethod: 'InPost Paczkomat',
  },
  {
    id: '6',
    orderNumber: '871890',
    orderDate: '10 września 2023',
    status: 'delivered',
    statusLabel: 'Dostarczono',
    items: [
      {
        id: '7',
        name: 'Polaroid Now I-Type Instant Camera',
        image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=100',
        quantity: 1,
        price: 95.20,
      },
      {
        id: '8',
        name: 'Wkłady do aparatu Polaroid (16 szt.)',
        image: 'https://images.unsplash.com/photo-1495745966610-2a67f2297e5e?w=100',
        quantity: 2,
        price: 24.99,
      },
    ],
    totalAmount: 155.18,
    shippingMethod: 'InPost Kurier',
  },
];

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
  { id: 'pending', label: 'Oczekujące' },
  { id: 'shipped', label: 'W drodze' },
  { id: 'delivered', label: 'Dostarczone' },
  { id: 'cancelled', label: 'Anulowane' },
  { id: 'returned', label: 'Zwroty' },
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
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'shipped':
      return 'bg-indigo-100 text-indigo-700';
    case 'delivered':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    case 'returned':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'processing':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'shipped':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    case 'delivered':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'cancelled':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'returned':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      );
    default:
      return null;
  }
}

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
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
    memberType: 'CZŁONEK SMART!',
    avatar: `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`,
  };

  // Filter orders based on active filter and search query
  const filteredOrders = mockOrders.filter((order) => {
    const matchesFilter = activeFilter === 'all' || order.status === activeFilter;
    const matchesSearch = searchQuery === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Count orders by status
  const orderCounts = {
    all: mockOrders.length,
    pending: mockOrders.filter(o => o.status === 'pending').length,
    processing: mockOrders.filter(o => o.status === 'processing').length,
    shipped: mockOrders.filter(o => o.status === 'shipped').length,
    delivered: mockOrders.filter(o => o.status === 'delivered').length,
    cancelled: mockOrders.filter(o => o.status === 'cancelled').length,
    returned: mockOrders.filter(o => o.status === 'returned').length,
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
                    <span className="inline-flex items-center gap-1 text-xs text-orange-500 font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {userData.memberType}
                    </span>
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
                          <p className="text-sm text-gray-700">{order.orderDate}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Dostawa</span>
                          <p className="text-sm text-gray-700">{order.shippingMethod}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item) => (
                        <div key={item.id} className="p-4 flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 mb-1">{item.name}</h4>
                            {item.variant && (
                              <p className="text-sm text-gray-500">{item.variant}</p>
                            )}
                            <p className="text-sm text-gray-500">Ilość: {item.quantity}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-semibold text-gray-900">{item.price.toFixed(2)} zł</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Footer */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100">
                      <div>
                        {order.estimatedDelivery && order.status === 'shipped' && (
                          <p className="text-sm text-gray-600">
                            <span className="text-green-600 font-medium">Przewidywana dostawa:</span> {order.estimatedDelivery}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm text-gray-500">Suma:</span>
                          <span className="ml-2 text-lg font-bold text-gray-900">{order.totalAmount.toFixed(2)} zł</span>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'shipped' && order.trackingNumber && (
                            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                              Śledź przesyłkę
                            </button>
                          )}
                          {order.status === 'pending' && (
                            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                              Zapłać teraz
                            </button>
                          )}
                          {order.status === 'delivered' && (
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
                  Wyświetlanie {filteredOrders.length} z {mockOrders.length} zamówień
                </p>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50" disabled>
                    Poprzednia
                  </button>
                  <button className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium">
                    1
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    2
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Następna
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 bg-white">
        <div className="container-custom py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>© 2023 WBTrade. Wszelkie prawa zastrzeżone.</span>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-gray-700">Polityka prywatności</Link>
              <Link href="/terms" className="hover:text-gray-700">Regulamin</Link>
              <button className="hover:text-gray-700">Ustawienia cookies</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
