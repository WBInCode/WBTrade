'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../../components/Header';
import { useAuth } from '../../../../contexts/AuthContext';

// Order status types
type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  variant?: string;
  sku: string;
}

interface StatusHistoryItem {
  status: OrderStatus;
  label: string;
  date: string;
  time: string;
  description?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface Address {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: OrderStatus;
  statusLabel: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  shippingMethod: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  statusHistory: StatusHistoryItem[];
  notes?: string;
}

// Mock order data
const mockOrders: Record<string, Order> = {
  '1': {
    id: '1',
    orderNumber: '882910',
    orderDate: '24 października 2023, 14:32',
    status: 'shipped',
    statusLabel: 'W drodze',
    items: [
      {
        id: '1',
        name: 'Apple Watch Series 9 GPS 41mm',
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400',
        quantity: 1,
        price: 399.00,
        variant: 'Midnight Aluminum / S/M Sport Band',
        sku: 'AW9-41-MA-SM',
      },
    ],
    subtotal: 399.00,
    shipping: 10.99,
    discount: 0,
    total: 409.99,
    shippingMethod: 'InPost Kurier',
    shippingAddress: {
      name: 'Jan Kowalski',
      street: 'ul. Przykładowa 123/45',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Polska',
      phone: '+48 123 456 789',
    },
    billingAddress: {
      name: 'Jan Kowalski',
      street: 'ul. Przykładowa 123/45',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Polska',
      phone: '+48 123 456 789',
    },
    paymentMethod: 'Karta płatnicza •••• 4242',
    paymentStatus: 'paid',
    trackingNumber: 'INP123456789PL',
    trackingUrl: 'https://inpost.pl/sledzenie-przesylek?number=INP123456789PL',
    estimatedDelivery: 'Czwartek, 26 października 2023',
    statusHistory: [
      { status: 'pending', label: 'Zamówienie złożone', date: '24 paź 2023', time: '14:32', description: 'Twoje zamówienie zostało przyjęte', isCompleted: true, isCurrent: false },
      { status: 'confirmed', label: 'Płatność potwierdzona', date: '24 paź 2023', time: '14:35', description: 'Płatność została zaksięgowana', isCompleted: true, isCurrent: false },
      { status: 'processing', label: 'W realizacji', date: '24 paź 2023', time: '16:20', description: 'Zamówienie jest przygotowywane do wysyłki', isCompleted: true, isCurrent: false },
      { status: 'shipped', label: 'Wysłano', date: '25 paź 2023', time: '10:15', description: 'Paczka została przekazana kurierowi', isCompleted: true, isCurrent: true },
      { status: 'delivered', label: 'Dostarczono', date: '', time: '', description: 'Oczekiwana dostawa: Czwartek, 26 paź', isCompleted: false, isCurrent: false },
    ],
  },
  '2': {
    id: '2',
    orderNumber: '882855',
    orderDate: '20 października 2023, 09:15',
    status: 'delivered',
    statusLabel: 'Dostarczono',
    items: [
      {
        id: '2',
        name: 'Sony WH-1000XM5 Słuchawki z ANC',
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400',
        quantity: 1,
        price: 348.00,
        variant: 'Czarny',
        sku: 'SONY-XM5-BLK',
      },
      {
        id: '3',
        name: 'Etui ochronne na słuchawki',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        quantity: 1,
        price: 29.99,
        sku: 'CASE-XM5-BLK',
      },
    ],
    subtotal: 377.99,
    shipping: 0,
    discount: 0,
    total: 377.99,
    shippingMethod: 'InPost Paczkomat',
    shippingAddress: {
      name: 'Jan Kowalski',
      street: 'Paczkomat WAW123M',
      city: 'Warszawa, ul. Marszałkowska 100',
      postalCode: '00-001',
      country: 'Polska',
      phone: '+48 123 456 789',
    },
    billingAddress: {
      name: 'Jan Kowalski',
      street: 'ul. Przykładowa 123/45',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Polska',
      phone: '+48 123 456 789',
    },
    paymentMethod: 'BLIK',
    paymentStatus: 'paid',
    trackingNumber: 'INP987654321PL',
    statusHistory: [
      { status: 'pending', label: 'Zamówienie złożone', date: '20 paź 2023', time: '09:15', description: 'Twoje zamówienie zostało przyjęte', isCompleted: true, isCurrent: false },
      { status: 'confirmed', label: 'Płatność potwierdzona', date: '20 paź 2023', time: '09:16', description: 'Płatność BLIK została zaksięgowana', isCompleted: true, isCurrent: false },
      { status: 'processing', label: 'W realizacji', date: '20 paź 2023', time: '11:30', description: 'Zamówienie jest przygotowywane do wysyłki', isCompleted: true, isCurrent: false },
      { status: 'shipped', label: 'Wysłano', date: '21 paź 2023', time: '08:45', description: 'Paczka została przekazana do Paczkomatu', isCompleted: true, isCurrent: false },
      { status: 'delivered', label: 'Dostarczono', date: '22 paź 2023', time: '12:30', description: 'Paczka odebrana z Paczkomatu', isCompleted: true, isCurrent: true },
    ],
  },
  '3': {
    id: '3',
    orderNumber: '881302',
    orderDate: '15 października 2023, 18:45',
    status: 'pending',
    statusLabel: 'Oczekuje na płatność',
    items: [
      {
        id: '4',
        name: 'Minimalistyczny zegarek analogowy - biało-złoty',
        image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400',
        quantity: 1,
        price: 120.00,
        variant: 'Biało-złoty / Skórzany pasek',
        sku: 'WATCH-MIN-WG',
      },
    ],
    subtotal: 120.00,
    shipping: 10.99,
    discount: 0,
    total: 130.99,
    shippingMethod: 'DPD Kurier',
    shippingAddress: {
      name: 'Jan Kowalski',
      street: 'ul. Przykładowa 123/45',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Polska',
      phone: '+48 123 456 789',
    },
    billingAddress: {
      name: 'Jan Kowalski',
      street: 'ul. Przykładowa 123/45',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Polska',
      phone: '+48 123 456 789',
    },
    paymentMethod: 'Przelew bankowy',
    paymentStatus: 'pending',
    statusHistory: [
      { status: 'pending', label: 'Oczekuje na płatność', date: '15 paź 2023', time: '18:45', description: 'Oczekiwanie na potwierdzenie płatności', isCompleted: false, isCurrent: true },
      { status: 'confirmed', label: 'Płatność potwierdzona', date: '', time: '', isCompleted: false, isCurrent: false },
      { status: 'processing', label: 'W realizacji', date: '', time: '', isCompleted: false, isCurrent: false },
      { status: 'shipped', label: 'Wysłano', date: '', time: '', isCompleted: false, isCurrent: false },
      { status: 'delivered', label: 'Dostarczono', date: '', time: '', isCompleted: false, isCurrent: false },
    ],
    notes: 'Płatność oczekuje na zaksięgowanie. Dane do przelewu zostały wysłane na email.',
  },
};

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
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'confirmed':
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

function getPaymentStatusBadge(status: 'paid' | 'pending' | 'failed') {
  switch (status) {
    case 'paid':
      return <span className="inline-flex items-center gap-1 text-green-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Opłacono</span>;
    case 'pending':
      return <span className="inline-flex items-center gap-1 text-yellow-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg> Oczekuje</span>;
    case 'failed':
      return <span className="inline-flex items-center gap-1 text-red-600 text-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> Niepowodzenie</span>;
  }
}

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
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

  const order = mockOrders[orderId];

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container-custom py-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Zamówienie nie znalezione</h1>
            <p className="text-gray-500 mb-6">Nie mogliśmy znaleźć zamówienia o podanym numerze.</p>
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
          <Link href="/account/orders" className="hover:text-orange-500">Moje zamówienia</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">#{order.orderNumber}</span>
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
                <div className="flex items-center gap-3 mb-1">
                  <Link href="/account/orders" className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <h1 className="text-2xl font-bold text-gray-900">Zamówienie #{order.orderNumber}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.statusLabel}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">Złożone {order.orderDate}</p>
              </div>
              <div className="flex gap-3">
                {order.status === 'pending' && (
                  <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                    Zapłać teraz
                  </button>
                )}
                {order.status === 'shipped' && order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
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
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Pobierz fakturę
                </button>
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Status zamówienia</h2>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                {/* Timeline items */}
                <div className="space-y-6">
                  {order.statusHistory.map((item, index) => (
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
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium ${item.isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {item.label}
                          </h4>
                          {item.date && (
                            <span className="text-sm text-gray-500">
                              {item.date}, {item.time}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className={`text-sm mt-0.5 ${item.isCompleted ? 'text-gray-500' : 'text-gray-400'}`}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking Info */}
              {order.trackingNumber && order.status === 'shipped' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-500">Numer przesyłki:</span>
                      <p className="font-mono font-medium text-gray-900">{order.trackingNumber}</p>
                    </div>
                    {order.estimatedDelivery && (
                      <div className="text-right">
                        <span className="text-sm text-gray-500">Przewidywana dostawa:</span>
                        <p className="font-medium text-green-600">{order.estimatedDelivery}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Produkty ({order.items.length})</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="p-5 flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 mb-1">{item.name}</h4>
                      {item.variant && (
                        <p className="text-sm text-gray-500 mb-1">{item.variant}</p>
                      )}
                      <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                    </div>
                    <div className="text-center shrink-0 px-4">
                      <span className="text-sm text-gray-500">Ilość</span>
                      <p className="font-medium text-gray-900">{item.quantity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-gray-900">{item.price.toFixed(2)} zł</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="p-5 bg-gray-50 border-t border-gray-100">
                <div className="max-w-xs ml-auto space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Suma częściowa</span>
                    <span className="text-gray-900">{order.subtotal.toFixed(2)} zł</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Dostawa ({order.shippingMethod})</span>
                    <span className="text-gray-900">{order.shipping === 0 ? 'Bezpłatna' : `${order.shipping.toFixed(2)} zł`}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rabat</span>
                      <span className="text-green-600">-{order.discount.toFixed(2)} zł</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">Razem</span>
                    <span className="text-gray-900">{order.total.toFixed(2)} zł</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping & Payment Info */}
            <div className="grid grid-cols-2 gap-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Adres dostawy</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                  <p>{order.shippingAddress.country}</p>
                  <p className="pt-2">{order.shippingAddress.phone}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Płatność</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Metoda płatności</span>
                    <span className="font-medium text-gray-900">{order.paymentMethod}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status</span>
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </div>
                </div>

                {/* Billing Address */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Adres rozliczeniowy</h4>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-900">{order.billingAddress.name}</p>
                    <p>{order.billingAddress.street}</p>
                    <p>{order.billingAddress.postalCode} {order.billingAddress.city}</p>
                  </div>
                </div>
              </div>
            </div>

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
                {order.status === 'delivered' && (
                  <>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                      Zgłoś problem
                    </button>
                    <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                      Kup ponownie
                    </button>
                  </>
                )}
                {order.status === 'pending' && (
                  <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                    Anuluj zamówienie
                  </button>
                )}
              </div>
            </div>
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
