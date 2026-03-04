'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import { useAuth } from '../../../../contexts/AuthContext';
import { supportApi, SupportTicketDetail } from '../../../../lib/api';
import AccountSidebar from '../../../../components/AccountSidebar';

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

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const loadTicket = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await supportApi.getTicketDetail(ticketId);
      setTicket(data);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // ─── Auto-polling every 8s for live chat ───
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadTicket();
    }, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return;
    try {
      setSending(true);
      await supportApi.sendMessage(ticketId, replyText);
      setReplyText('');
      await loadTicket();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Dziś';
    if (date.toDateString() === yesterday.toDateString()) return 'Wczoraj';
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (isLoading || loading) {
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

  if (!ticket) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 dark:bg-secondary-900 pt-20">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            <h2 className="text-xl text-gray-900 dark:text-white mb-4">Nie znaleziono zgłoszenia</h2>
            <Link href="/account/messages" className="text-orange-500 hover:text-orange-600">
              Wróć do wiadomości
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Group messages by day
  const messagesByDay: { day: string; messages: typeof ticket.messages }[] = [];
  let currentDay = '';
  for (const msg of ticket.messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== currentDay) {
      currentDay = day;
      messagesByDay.push({ day: msg.createdAt, messages: [msg] });
    } else {
      messagesByDay[messagesByDay.length - 1].messages.push(msg);
    }
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
              {/* Back link + header */}
              <div className="mb-6">
                <Link href="/account/messages" className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 mb-2 inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Wróć do wiadomości
                </Link>
                <div className="flex items-center gap-3 mt-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ticket.subject}</h1>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status] || ''}`}>
                    {statusLabels[ticket.status] || ticket.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                  <span>{ticket.ticketNumber}</span>
                  <span>•</span>
                  <span>{categoryLabels[ticket.category] || ticket.category}</span>
                  {ticket.order && (
                    <>
                      <span>•</span>
                      <Link href={`/account/orders`} className="text-orange-500 hover:text-orange-600">
                        Zamówienie {ticket.order.orderNumber}
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Messages thread */}
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 overflow-hidden">
                <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
                  {messagesByDay.map((group, gi) => (
                    <div key={gi}>
                      {/* Day separator */}
                      <div className="flex items-center gap-4 my-4">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-secondary-700" />
                        <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">{formatDay(group.day)}</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-secondary-700" />
                      </div>

                      <div className="space-y-4">
                        {group.messages.map((msg) => {
                          if (msg.senderRole === 'SYSTEM') {
                            return (
                              <div key={msg.id} className="flex justify-center">
                                <div className="bg-gray-100 dark:bg-secondary-700 rounded-lg px-4 py-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                  {msg.content}
                                  <span className="ml-2 text-gray-400 dark:text-gray-500">{formatTime(msg.createdAt)}</span>
                                </div>
                              </div>
                            );
                          }

                          const isCustomer = msg.senderRole === 'CUSTOMER';
                          return (
                            <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%]`}>
                                <div className={`flex items-center gap-2 mb-1 ${isCustomer ? 'justify-end' : ''}`}>
                                  <span className={`text-xs ${isCustomer ? 'text-orange-500' : 'text-blue-500 dark:text-blue-400'}`}>
                                    {isCustomer ? 'Ty' : 'Obsługa sklepu'}
                                  </span>
                                  <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                                </div>
                                <div
                                  className={`rounded-xl px-4 py-3 ${
                                    isCustomer
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-gray-100 dark:bg-secondary-700 text-gray-900 dark:text-gray-200'
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                {ticket.status !== 'CLOSED' ? (
                  <div className="border-t border-gray-200 dark:border-secondary-700 p-4">
                    <div className="flex gap-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Napisz wiadomość..."
                        rows={3}
                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-secondary-900 border border-gray-200 dark:border-secondary-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleSendReply();
                          }
                        }}
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sending}
                        className="px-4 py-3 bg-orange-500 rounded-xl text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
                      >
                        {sending ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Ctrl+Enter aby wysłać</p>
                  </div>
                ) : (
                  <div className="border-t border-gray-200 dark:border-secondary-700 p-4 text-center">
                    <p className="text-gray-500 text-sm">
                      To zgłoszenie zostało zamknięte. Jeśli potrzebujesz dalszej pomocy,{' '}
                      <Link href="/account/messages/new" className="text-orange-500 hover:text-orange-600">
                        utwórz nowe zgłoszenie
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
