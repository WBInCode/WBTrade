'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useAuth } from '../../../contexts/AuthContext';
import AccountSidebar from '../../../components/AccountSidebar';

interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  metadata: any;
  createdAt: string;
}

function getToken(): string | null {
  const stored = localStorage.getItem('auth_tokens');
  if (!stored) return null;
  try { return JSON.parse(stored).accessToken || null; } catch { return null; }
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
}

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { setLoading(false); return; }
      const res = await fetch(`${getApiUrl()}/notifications?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
      setError('Nie udało się pobrać powiadomień');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = getToken();
      if (!token) return;
      await fetch(`${getApiUrl()}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch { /* ignore */ }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      const token = getToken();
      if (!token) return;
      await fetch(`${getApiUrl()}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Przed chwilą';
    if (diffMin < 60) return `${diffMin} min temu`;
    if (diffH < 24) return `${diffH} godz. temu`;
    if (diffD < 7) return `${diffD} dni temu`;
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery_delay':
        return (
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'order_status':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-secondary-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
      <Header />

      <main className="container-custom py-4 sm:py-6">
        <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-orange-500">Strona główna</Link>
          <span>/</span>
          <Link href="/account" className="hover:text-orange-500">Moje konto</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">Powiadomienia</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          <AccountSidebar
            activeId="notifications"
            userName={user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined}
            userEmail={user?.email}
          />

          <div className="flex-1 min-w-0">
            <div className="lg:hidden mb-4">
              <Link
                href="/account"
                className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Wróć do konta
              </Link>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Powiadomienia</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {total === 0 ? 'Brak powiadomień' : `${total} powiadomień`}
                  {unreadCount > 0 && ` · ${unreadCount} nieprzeczytanych`}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="text-sm text-orange-500 hover:text-orange-600 font-medium disabled:opacity-50"
                >
                  {markingAll ? 'Oznaczanie...' : 'Oznacz wszystkie jako przeczytane'}
                </button>
              )}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-secondary-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-secondary-700 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 dark:bg-secondary-700 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-red-200 dark:border-red-800/50 shadow-sm p-8 text-center">
                <p className="text-red-500 dark:text-red-400 mb-3">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                >
                  Spróbuj ponownie
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 dark:text-secondary-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Brak powiadomień</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Wszystkie powiadomienia dotyczące Twoich zamówień pojawią się tutaj.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-white dark:bg-secondary-800 rounded-xl border shadow-sm p-4 transition-colors ${
                      notification.isRead
                        ? 'border-gray-100 dark:border-secondary-700'
                        : 'border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-900/10'
                    }`}
                  >
                    <div className="flex gap-3">
                      {getTypeIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-sm font-medium ${
                            notification.isRead
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-900 dark:text-white font-semibold'
                          }`}>
                            {notification.title}
                            {!notification.isRead && (
                              <span className="inline-block w-2 h-2 bg-orange-500 rounded-full ml-2 align-middle" />
                            )}
                          </h3>
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          {notification.link && (
                            <Link
                              href={notification.link}
                              className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                            >
                              Zobacz szczegóły →
                            </Link>
                          )}
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              Oznacz jako przeczytane
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-secondary-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-secondary-700 disabled:opacity-50"
                    >
                      ← Poprzednia
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {page} z {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-secondary-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-secondary-700 disabled:opacity-50"
                    >
                      Następna →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
