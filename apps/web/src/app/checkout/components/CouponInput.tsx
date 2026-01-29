'use client';

import React, { useState } from 'react';
import { Tag, X, Check, Loader2 } from 'lucide-react';

interface CouponInputProps {
  appliedCoupon: string | null;
  discount: number;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => Promise<void>;
}

export default function CouponInput({
  appliedCoupon,
  discount,
  onApplyCoupon,
  onRemoveCoupon,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Wprowadź kod rabatowy');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onApplyCoupon(code.trim().toUpperCase());
      setSuccess('Kod rabatowy został zastosowany!');
      setCode('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Nieprawidłowy kod rabatowy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onRemoveCoupon();
    } catch (err: any) {
      setError(err.message || 'Nie udało się usunąć kodu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // If coupon is already applied, show it
  if (appliedCoupon) {
    return (
      <div className="border-t dark:border-secondary-700 pt-3 sm:pt-4 mt-3 sm:mt-4">
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <Check size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Kod: <span className="font-mono">{appliedCoupon}</span>
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Zniżka: -{discount.toFixed(2)} zł
              </p>
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

  return (
    <div className="border-t dark:border-secondary-700 pt-3 sm:pt-4 mt-3 sm:mt-4">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 transition-colors"
        >
          <Tag size={16} />
          <span>Masz kod rabatowy?</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kod rabatowy</span>
          </div>
          
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
            />
            <button
              onClick={handleApply}
              disabled={isLoading || !code.trim()}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors
                flex items-center gap-1.5
                ${isLoading || !code.trim() 
                  ? 'bg-gray-100 dark:bg-secondary-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                  : 'bg-orange-500 text-white hover:bg-orange-600'}
              `}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Zastosuj'
              )}
            </button>
          </div>

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

          <button
            onClick={() => {
              setIsExpanded(false);
              setCode('');
              setError(null);
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Anuluj
          </button>
        </div>
      )}
    </div>
  );
}
