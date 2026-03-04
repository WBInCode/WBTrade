'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useAuth } from '../../../contexts/AuthContext';
import { supportApi, SupportTicket } from '../../../lib/api';
import AccountSidebar from '../../../components/AccountSidebar';

const statusLabels: Record<string, string> = {
  OPEN: 'Otwarte',
  IN_PROGRESS: 'W trakcie',
  CLOSED: 'Zamknięte',
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
};

const categoryLabels: Record<string, string> = {
  ORDER: 'Zamówienie',
  DELIVERY: 'Dostawa',
  COMPLAINT: 'Reklamacja',
  PAYMENT: 'Płatność',
  ACCOUNT: 'Konto',
  GENERAL: 'Ogólne',
};

export default function MessagesPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const loadTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const params: any = { page };
      if (statusFilter) params.status = statusFilter;
      const data = await supportApi.getTickets(params);
      setTickets(data.tickets);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page, statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 dark:bg-secondary-900 pt-20">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="h-64 animate-pulse bg-gray-200 dark:bg-secondary-800 rounded-xl" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-secondary-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-8">
            <AccountSidebar
              activeId="messages"
              userName={user ? `${user.firstName} ${user.lastName}` : undefined}
              userEmail={user?.email}
            />

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wiadomości</h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Twoje zgłoszenia i rozmowy z obsługą</p>
                </div>
                <Link
                  href="/account/messages/new"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nowe zgłoszenie
                </Link>
              </div>

              {/* Filter */}
              <div className="mb-4">
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '', label: 'Wszystkie' },
                    { value: 'OPEN', label: 'Otwarte' },
                    { value: 'IN_PROGRESS', label: 'W trakcie' },
                    { value: 'CLOSED', label: 'Zamknięte' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => { setStatusFilter(filter.value); setPage(1); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === filter.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-white dark:bg-secondary-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-secondary-700 border border-gray-200 dark:border-secondary-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tickets List */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-6 animate-pulse">
                      <div className="h-5 bg-gray-200 dark:bg-secondary-700 rounded w-1/3 mb-3" />
                      <div className="h-4 bg-gray-200 dark:bg-secondary-700 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-12 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Brak wiadomości</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Nie masz jeszcze żadnych zgłoszeń</p>
                  <Link
                    href="/account/messages/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Napisz do nas
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/account/messages/${ticket.id}`}
                      className={`block bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-5 hover:shadow-md dark:hover:border-secondary-600 transition-all ${
                        ticket.unreadCount > 0 ? 'ring-2 ring-orange-500/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {ticket.unreadCount > 0 && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{ticket.ticketNumber}</span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status] || ''}`}>
                              {statusLabels[ticket.status] || ticket.status}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{ticket.subject}</h3>
                          {ticket.lastMessage && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {ticket.lastMessage.senderRole === 'ADMIN' ? 'Obsługa: ' : ''}
                              {ticket.lastMessage.content}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{categoryLabels[ticket.category] || ticket.category}</span>
                            {ticket.order && (
                              <span>Zamówienie: {ticket.order.orderNumber}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">{formatDate(ticket.lastMessageAt)}</p>
                          <p className="text-xs text-gray-400">{formatTime(ticket.lastMessageAt)}</p>
                          {ticket.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full mt-1">
                              {ticket.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-secondary-800 border border-gray-200 dark:border-secondary-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                  >
                    ← Poprzednia
                  </button>
                  <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-secondary-800 border border-gray-200 dark:border-secondary-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                  >
                    Następna →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
