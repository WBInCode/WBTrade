'use client';

import React, { useState } from 'react';
import { PaymentData } from '../page';

interface PaymentMethodProps {
  initialData: PaymentData;
  onSubmit: (data: PaymentData) => void;
  onBack: () => void;
}

type PaymentId = 'payu';

interface PaymentOption {
  id: PaymentId;
  name: string;
  extraFee: number;
  badge?: string;
  description?: string;
}

const paymentOptions: PaymentOption[] = [
  { 
    id: 'payu', 
    name: 'Płatność online', 
    extraFee: 0,
    description: 'BLIK, karta płatnicza, szybki przelew, Google Pay, Apple Pay'
  },
];

// Ikony dla metod płatności
const PaymentIcon = ({ id }: { id: PaymentId }) => {
  switch (id) {
    case 'payu':
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 rounded">
            <span className="text-white text-sm font-bold">PayU</span>
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default function PaymentMethod({ initialData, onSubmit, onBack }: PaymentMethodProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentId>(
    (initialData.method as PaymentId) || 'payu'
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
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{option.name}</span>
                    {option.badge && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <span className="text-xs text-gray-500">{option.description}</span>
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
