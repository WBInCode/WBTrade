'use client';

import React, { useState } from 'react';
import { PaymentData } from '../page';

interface PaymentMethodProps {
  initialData: PaymentData;
  onSubmit: (data: PaymentData) => void;
  onBack: () => void;
}

type PaymentId = 'blik' | 'card' | 'transfer' | 'cod' | 'google_pay' | 'apple_pay' | 'paypo';

interface PaymentOption {
  id: PaymentId;
  name: string;
  extraFee: number;
  badge?: string;
}

const paymentOptions: PaymentOption[] = [
  { id: 'blik', name: 'BLIK', extraFee: 0 },
  { id: 'google_pay', name: 'Google Pay', extraFee: 0 },
  { id: 'apple_pay', name: 'Apple Pay', extraFee: 0 },
  { id: 'card', name: 'Karta płatnicza online', extraFee: 0 },
  { id: 'transfer', name: 'Szybki przelew', extraFee: 0 },
  { id: 'paypo', name: 'PayPo', extraFee: 0, badge: 'Kup teraz, zapłać za 30 dni' },
];

// Ikony dla metod płatności
const PaymentIcon = ({ id }: { id: PaymentId }) => {
  switch (id) {
    case 'blik':
      return (
        <div className="flex items-center justify-center w-12 h-6 bg-black rounded px-1">
          <span className="text-white text-xs font-bold tracking-tight">blik</span>
        </div>
      );
    case 'google_pay':
      return (
        <div className="flex items-center gap-0.5 px-2 py-1 border border-gray-300 rounded-md">
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-xs font-medium text-gray-600">Pay</span>
        </div>
      );
    case 'apple_pay':
      return (
        <div className="flex items-center gap-0.5 px-2 py-1 bg-black rounded-md">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          <span className="text-xs font-medium text-white">Pay</span>
        </div>
      );
    case 'card':
      return (
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-[#1A1F71] tracking-tight">VISA</span>
          <div className="flex -space-x-1">
            <div className="w-3 h-3 rounded-full bg-[#EB001B]"></div>
            <div className="w-3 h-3 rounded-full bg-[#F79E1B]"></div>
          </div>
        </div>
      );
    case 'transfer':
      return (
        <div className="text-orange-500 font-semibold text-sm">tpay</div>
      );
    case 'paypo':
      return (
        <div className="text-green-600 font-bold text-sm">PayPo</div>
      );
    case 'cod':
      return (
        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function PaymentMethod({ initialData, onSubmit, onBack }: PaymentMethodProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentId>(
    (initialData.method as PaymentId) || 'blik'
  );

  const selectedOption = paymentOptions.find(opt => opt.id === selectedMethod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      method: selectedMethod as PaymentData['method'],
      extraFee: selectedOption?.extraFee || 0,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Płatność</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="divide-y divide-gray-100">
          {paymentOptions.map((option) => (
            <label
              key={option.id}
              className={`
                flex items-center justify-between px-6 py-4 cursor-pointer transition-colors
                ${selectedMethod === option.id ? 'bg-gray-50' : 'hover:bg-gray-50'}
              `}
            >
              <div className="flex items-center gap-4">
                {/* Radio button */}
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${selectedMethod === option.id
                      ? 'border-orange-500'
                      : 'border-gray-300'
                    }
                  `}
                >
                  {selectedMethod === option.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  )}
                </div>

                <input
                  type="radio"
                  name="payment"
                  value={option.id}
                  checked={selectedMethod === option.id}
                  onChange={() => setSelectedMethod(option.id)}
                  className="sr-only"
                />

                {/* Name and badge */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">{option.name}</span>
                  {option.badge && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      {option.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side: icon and price */}
              <div className="flex items-center gap-4">
                <PaymentIcon id={option.id} />
                <span className="text-gray-500 text-sm min-w-[40px] text-right">
                  {option.extraFee === 0 ? '0 zł' : `${option.extraFee} zł`}
                </span>
              </div>
            </label>
          ))}
        </div>

        {/* Security note */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Bezpieczne płatności szyfrowane SSL</span>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between px-6 py-4 border-t">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 text-gray-600 font-medium hover:text-gray-900 transition-colors"
          >
            ← Wstecz
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            Dalej →
          </button>
        </div>
      </form>
    </div>
  );
}
