'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import AccountSidebar from '../../../components/AccountSidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { couponsApi, UserCoupon } from '../../../lib/api';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'WELCOME_DISCOUNT': return 'Zniżka powitalna';
    case 'APP_DOWNLOAD': return 'Aplikacja mobilna';
    case 'NEWSLETTER': return 'Newsletter';
    case 'REFERRAL': return 'Polecenie';
    case 'CAMPAIGN': return 'Kampania';
    case 'MANUAL': return 'Rabat';
    default: return 'Rabat';
  }
}

function CouponCard({ coupon, onCopy }: { coupon: UserCoupon; onCopy: (code: string) => void }) {
  const isActive = coupon.status === 'active';
  const remaining = daysLeft(coupon.expiresAt);

  const valueText =
    coupon.type === 'PERCENTAGE'
      ? `-${coupon.value}%`
      : coupon.type === 'FREE_SHIPPING'
        ? 'Darmowa dostawa'
        : `-${coupon.value} zł`;

  return (
    <div className={`relative bg-white dark:bg-secondary-800 rounded-xl border overflow-hidden transition-all ${
      isActive 
        ? 'border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md' 
        : 'border-gray-200 dark:border-secondary-700 opacity-60'
    }`}>
      {/* Left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
        isActive ? 'bg-orange-500' : 'bg-gray-300 dark:bg-secondary-600'
      }`} />

      <div className="pl-5 pr-4 py-4">
        {/* Top row: source badge + value */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isActive
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                : 'bg-gray-100 dark:bg-secondary-700 text-gray-500 dark:text-gray-400'
            }`}>
              {sourceLabel(coupon.couponSource)}
            </span>
            {coupon.status === 'used' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Wykorzystany
              </span>
            )}
            {coupon.status === 'expired' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Wygasł
              </span>
            )}
          </div>
          <span className={`text-xl font-bold ${
            isActive ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
          }`}>
            {valueText}
          </span>
        </div>

        {/* Code row */}
        <button
          onClick={() => isActive && onCopy(coupon.code)}
          disabled={!isActive}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-mono transition-colors mb-3 ${
            isActive
              ? 'border-dashed border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20 cursor-pointer'
              : 'border-gray-200 dark:border-secondary-700 bg-gray-50 dark:bg-secondary-900 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="tracking-wider">{coupon.code}</span>
          {isActive && (
            <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        {/* Info row */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {coupon.expiresAt && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isActive && remaining !== null
                ? `Ważny jeszcze ${remaining} ${remaining === 1 ? 'dzień' : 'dni'}`
                : `Do ${formatDate(coupon.expiresAt)}`}
            </span>
          )}
          {coupon.minimumAmount && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Min. {coupon.minimumAmount} zł
            </span>
          )}
        </div>

        {/* Hint */}
        {isActive && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Użyj kodu w koszyku podczas składania zamówienia
          </p>
        )}
      </div>
    </div>
  );
}

export default function DiscountsPage() {
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchCoupons = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const response = await couponsApi.getMyCoupons();
      setCoupons(response.coupons || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const filteredCoupons = coupons.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const activeCoupons = coupons.filter(c => c.status === 'active');
  const usedCoupons = coupons.filter(c => c.status === 'used');
  const expiredCoupons = coupons.filter(c => c.status === 'expired');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 overflow-x-hidden">
      <Header />
      <main className="container-custom py-3 sm:py-6 px-3 sm:px-4 overflow-hidden">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
          <Link href="/" className="hover:text-orange-500 transition-colors">Strona główna</Link>
          <span className="mx-2">/</span>
          <Link href="/account" className="hover:text-orange-500 transition-colors">Moje konto</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-white">Moje rabaty</span>
        </nav>

        {/* Mobile back button */}
        <Link href="/account" className="sm:hidden flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 hover:text-orange-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Powrót do konta
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          <AccountSidebar
            activeId="discounts"
            userName={user ? `${user.firstName} ${user.lastName}` : undefined}
            userEmail={user?.email}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Moje rabaty</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {activeCoupons.length} {activeCoupons.length === 1 ? 'aktywny kupon' : 'aktywnych kuponów'}
                </p>
              </div>
            </div>

            {/* Copied toast */}
            {copiedCode && (
              <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Kod {copiedCode} skopiowany!
              </div>
            )}

            {/* Filter tabs */}
            {coupons.length > 0 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {[
                  { key: 'all' as const, label: 'Wszystkie', count: coupons.length },
                  { key: 'active' as const, label: 'Aktywne', count: activeCoupons.length },
                  { key: 'used' as const, label: 'Wykorzystane', count: usedCoupons.length },
                  { key: 'expired' as const, label: 'Wygasłe', count: expiredCoupons.length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      filter === tab.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-secondary-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-secondary-700 hover:bg-gray-50 dark:hover:bg-secondary-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : filteredCoupons.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredCoupons.map(coupon => (
                  <CouponCard key={coupon.id} coupon={coupon} onCopy={handleCopy} />
                ))}
              </div>
            ) : coupons.length > 0 ? (
              <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700">
                <p className="text-gray-500 dark:text-gray-400">
                  Brak kuponów w tej kategorii
                </p>
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Brak kuponów</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Nie masz jeszcze żadnych kuponów rabatowych. Zapisz się do newslettera, aby otrzymać zniżkę!
                </p>
                <button
                  onClick={() => {
                    const el = document.getElementById('newsletter');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-block bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Zapisz się do newslettera
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
