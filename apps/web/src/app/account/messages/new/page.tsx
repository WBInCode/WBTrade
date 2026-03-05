'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import { useAuth } from '../../../../contexts/AuthContext';
import { supportApi, ordersApi, Order } from '../../../../lib/api';
import AccountSidebar from '../../../../components/AccountSidebar';

const categoryOptions = [
  { value: 'ORDER', label: 'Zamówienie', desc: 'Pytania o zamówienie, statusy, zmiany' },
  { value: 'DELIVERY', label: 'Dostawa', desc: 'Problemy z dostawą, śledzenie paczek' },
  { value: 'COMPLAINT', label: 'Reklamacja', desc: 'Reklamacje produktów, wymiana' },
  { value: 'PAYMENT', label: 'Płatność', desc: 'Problemy z płatnością, zwroty' },
  { value: 'ACCOUNT', label: 'Konto', desc: 'Ustawienia konta, dane osobowe' },
  { value: 'GENERAL', label: 'Ogólne', desc: 'Inne pytania i sugestie' },
];

function NewTicketForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const preselectedOrderId = searchParams.get('orderId') || '';

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [orderId, setOrderId] = useState(preselectedOrderId);
  const [message, setMessage] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Load orders for the selector
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadOrders = async () => {
      try {
        const data = await ordersApi.getAll(1, 50);
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Failed to load orders:', error);
      }
    };
    loadOrders();
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      setSending(true);
      setError('');
      const data = await supportApi.createTicket({
        subject,
        category,
        message,
        ...(orderId && { orderId }),
      });
      router.push(`/account/messages/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Nie udało się utworzyć zgłoszenia');
    } finally {
      setSending(false);
    }
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

            <div className="flex-1 min-w-0 max-w-2xl">
              {/* Back + header */}
              <div className="mb-6">
                <Link href="/account/messages" className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 mb-2 inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Wróć do wiadomości
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Nowe zgłoszenie</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Opisz swój problem, a nasz zespół odpowie najszybciej jak to możliwe</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category selection */}
                <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-6">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Kategoria</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {categoryOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCategory(opt.value)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          category === opt.value
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                            : 'border-gray-200 dark:border-secondary-700 hover:border-gray-300 dark:hover:border-secondary-600'
                        }`}
                      >
                        <p className={`text-sm font-medium ${category === opt.value ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject + Order + Message */}
                <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temat</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-secondary-900 border border-gray-200 dark:border-secondary-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Krótki opis sprawy..."
                    />
                  </div>

                  {/* Order selector */}
                  {(category === 'ORDER' || category === 'DELIVERY' || category === 'COMPLAINT' || category === 'PAYMENT') && orders.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Powiązane zamówienie <span className="text-gray-400">(opcjonalnie)</span>
                      </label>
                      <select
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-secondary-900 border border-gray-200 dark:border-secondary-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Brak wybranego zamówienia</option>
                        {orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.orderNumber} — {new Date(order.createdAt).toLocaleDateString('pl-PL')} — {Number(order.total).toFixed(2)} zł
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wiadomość</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={6}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-secondary-900 border border-gray-200 dark:border-secondary-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      placeholder="Opisz szczegółowo swoją sprawę..."
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={!subject.trim() || !message.trim() || sending}
                    className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Wysyłanie...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Wyślij zgłoszenie
                      </>
                    )}
                  </button>
                  <Link href="/account/messages" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors">
                    Anuluj
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 pt-20">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="h-64 animate-pulse bg-gray-200 dark:bg-secondary-800 rounded-xl" />
          </div>
        </div>
      </>
    }>
      <NewTicketForm />
    </Suspense>
  );
}
