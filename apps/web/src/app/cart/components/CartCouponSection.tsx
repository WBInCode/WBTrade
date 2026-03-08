'use client';

import React, { useState, useEffect } from 'react';
import { Tag, X, Check, Loader2, Ticket } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { couponsApi, UserCoupon } from '../../../lib/api';

interface CartCouponSectionProps {
  appliedCoupon: string | null;
  discount: number;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => Promise<void>;
}

export default function CartCouponSection({
  appliedCoupon,
  discount,
  onApplyCoupon,
  onRemoveCoupon,
}: CartCouponSectionProps) {
  const [code, setCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponsFetched, setCouponsFetched] = useState(false);
  const { isAuthenticated } = useAuth();

  // Auto-fetch user's coupons on mount (for logged-in users)
  useEffect(() => {
    if (isAuthenticated && !couponsFetched && !appliedCoupon) {
      fetchMyCoupons();
    }
  }, [isAuthenticated, couponsFetched, appliedCoupon]);

  const fetchMyCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const response = await couponsApi.getMyCoupons();
      const activeCoupons = (response.coupons || []).filter(
        (c) => c.status === 'active' && c.couponSource !== 'APP_DOWNLOAD'
      );
      setMyCoupons(activeCoupons);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoadingCoupons(false);
      setCouponsFetched(true);
    }
  };

  const handleApply = async (couponCode: string) => {
    if (!couponCode.trim()) {
      setError('Wprowadź kod rabatowy');
      return;
    }

    setIsLoading(true);
    setApplyingCode(couponCode);
    setError(null);
    setSuccess(null);

    try {
      await onApplyCoupon(couponCode.toUpperCase());
      setSuccess('Kod rabatowy został zastosowany!');
      setCode('');
      setShowManualInput(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Nieprawidłowy kod rabatowy');
    } finally {
      setIsLoading(false);
      setApplyingCode(null);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onRemoveCoupon();
      setSuccess(null);
      // Re-fetch coupons so list reappears
      setCouponsFetched(false);
    } catch (err: any) {
      setError(err.message || 'Nie udało się usunąć kodu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply(code);
    }
  };

  const formatDiscount = (coupon: UserCoupon) => {
    if (coupon.type === 'PERCENTAGE') return `-${coupon.value}%`;
    if (coupon.type === 'FREE_SHIPPING') return 'Darmowa dostawa';
    return `-${Number(coupon.value).toFixed(2).replace('.', ',')} zł`;
  };

  const couponSourceLabel = (source: string) => {
    switch (source) {
      case 'WELCOME_DISCOUNT': return 'Powitalny';
      case 'NEWSLETTER': return 'Newsletter';
      case 'APP_DOWNLOAD': return 'Aplikacja';
      case 'CAMPAIGN': return 'Promocja';
      case 'MANUAL': return 'Promocja';
      default: return 'Kupon';
    }
  };

  const daysLeft = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    if (days === 0) return 'Ostatni dzień!';
    if (days <= 7) return `Zostało ${days} ${days === 1 ? 'dzień' : 'dni'}`;
    return `Ważny ${days} dni`;
  };

  // Applied coupon state
  if (appliedCoupon) {
    return (
      <div className="mt-3 sm:mt-4">
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <Check size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Kod: <span className="font-mono">{appliedCoupon}</span>
              </p>
              {discount > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Zniżka: -{discount.toFixed(2).replace('.', ',')} zł
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full transition-colors"
            title="Usuń kod"
          >
            {isLoading ? (
              <Loader2 size={16} className="text-green-600 dark:text-green-400 animate-spin" />
            ) : (
              <X size={16} className="text-green-600 dark:text-green-400" />
            )}
          </button>
        </div>
      </div>
    );
  }

  const hasCoupons = myCoupons.length > 0;

  return (
    <div className="mt-3 sm:mt-4 space-y-3">
      {/* User's available coupons — auto-shown */}
      {isAuthenticated && (
        <>
          {loadingCoupons ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={16} className="text-orange-500 animate-spin" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Ładowanie kuponów...</span>
            </div>
          ) : hasCoupons ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Ticket size={14} className="text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Twoje kupony ({myCoupons.length})
                </span>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {myCoupons.map((coupon) => {
                  const isApplying = applyingCode === coupon.code;
                  const expiring = coupon.expiresAt && 
                    (new Date(coupon.expiresAt).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
                  
                  return (
                    <button
                      key={coupon.id}
                      onClick={() => handleApply(coupon.code)}
                      disabled={isLoading}
                      className={`
                        w-full text-left p-2.5 rounded-lg border transition-all
                        ${isLoading 
                          ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-secondary-600' 
                          : 'border-gray-200 dark:border-secondary-600 cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 active:scale-[0.98]'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white">
                              {coupon.code}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400">
                              {formatDiscount(coupon)}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {couponSourceLabel(coupon.couponSource)}
                            </span>
                          </div>
                          {coupon.expiresAt && (
                            <p className={`text-[10px] mt-0.5 ${expiring ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                              {daysLeft(coupon.expiresAt)}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {isApplying ? (
                            <Loader2 size={14} className="text-orange-500 animate-spin" />
                          ) : (
                            <span className="text-xs text-orange-500 font-semibold">Użyj →</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Manual code input — collapsed by default */}
      {!showManualInput ? (
        <button
          onClick={() => setShowManualInput(true)}
          className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors"
        >
          <Tag size={14} />
          <span>{hasCoupons ? 'Wpisz inny kod' : 'Masz kod rabatowy?'}</span>
        </button>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Wpisz kod"
              className={`
                flex-1 px-3 py-2 text-sm border rounded-lg 
                focus:ring-2 focus:ring-orange-500 focus:border-orange-500 
                font-mono uppercase dark:bg-secondary-700 dark:text-white
                ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-secondary-600'}
              `}
              disabled={isLoading}
              autoFocus
            />
            <button
              onClick={() => handleApply(code)}
              disabled={isLoading || !code.trim()}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${isLoading || !code.trim() 
                  ? 'bg-gray-100 dark:bg-secondary-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                  : 'bg-orange-500 text-white hover:bg-orange-600'}
              `}
            >
              {isLoading && applyingCode === code ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Zastosuj'
              )}
            </button>
          </div>
          <button
            onClick={() => {
              setShowManualInput(false);
              setCode('');
              setError(null);
            }}
            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1"
          >
            Anuluj
          </button>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X size={12} />
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Check size={12} />
          {success}
        </p>
      )}
    </div>
  );
}
