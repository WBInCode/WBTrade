'use client';

import React, { useState } from 'react';
import { PaymentData } from '../page';

interface PaymentMethodProps {
  initialData: PaymentData;
  onSubmit: (data: PaymentData) => void;
  onBack: () => void;
}

const paymentOptions = [
  {
    id: 'blik',
    name: 'BLIK',
    description: 'Szybka płatność kodem BLIK z aplikacji bankowej',
    extraFee: 0,
    icon: '📱',
    popular: true,
  },
  {
    id: 'card',
    name: 'Karta płatnicza',
    description: 'Visa, Mastercard, American Express',
    extraFee: 0,
    icon: '💳',
    popular: false,
  },
  {
    id: 'transfer',
    name: 'Przelew online',
    description: 'Przelewy24 - wybierz swój bank',
    extraFee: 0,
    icon: '🏦',
    popular: false,
  },
  {
    id: 'cod',
    name: 'Płatność przy odbiorze',
    description: 'Zapłać gotówką lub kartą kurierowi',
    extraFee: 5,
    icon: '💰',
    popular: false,
  },
] as const;

export default function PaymentMethod({ initialData, onSubmit, onBack }: PaymentMethodProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentData['method']>(initialData.method);

  const selectedOption = paymentOptions.find(opt => opt.id === selectedMethod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      method: selectedMethod,
      extraFee: selectedOption?.extraFee || 0,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-6">Metoda płatności</h2>

      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          {paymentOptions.map((option) => (
            <label
              key={option.id}
              className={`
                flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all relative
                ${selectedMethod === option.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                name="payment"
                value={option.id}
                checked={selectedMethod === option.id}
                onChange={() => setSelectedMethod(option.id as PaymentData['method'])}
                className="sr-only"
              />
              
              {option.popular && (
                <span className="absolute -top-2 right-4 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded">
                  Popularne
                </span>
              )}
              
              <span className="text-2xl mr-4">{option.icon}</span>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{option.name}</span>
                  <span className={`font-semibold ${option.extraFee === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {option.extraFee === 0 ? 'Bez opłat' : `+${option.extraFee.toFixed(2)} zł`}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </div>

              <div
                className={`
                  w-5 h-5 rounded-full border-2 ml-4 flex-shrink-0 mt-1
                  ${selectedMethod === option.id
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-gray-300'
                  }
                `}
              >
                {selectedMethod === option.id && (
                  <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </label>
          ))}
        </div>

        {/* Payment icons */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-sm text-gray-500 mb-3">Obsługiwane metody płatności:</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 bg-gray-100 rounded text-sm font-medium">Visa</div>
            <div className="px-3 py-1.5 bg-gray-100 rounded text-sm font-medium">Mastercard</div>
            <div className="px-3 py-1.5 bg-gray-100 rounded text-sm font-medium">BLIK</div>
            <div className="px-3 py-1.5 bg-gray-100 rounded text-sm font-medium">Przelewy24</div>
            <div className="px-3 py-1.5 bg-gray-100 rounded text-sm font-medium">Apple Pay</div>
            <div className="px-3 py-1.5 bg-gray-100 rounded text-sm font-medium">Google Pay</div>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-green-800 font-medium">
              Wszystkie transakcje są szyfrowane (SSL/TLS)
            </span>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors"
          >
            ← Wstecz
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors focus:ring-4 focus:ring-orange-200"
          >
            Dalej: Podsumowanie →
          </button>
        </div>
      </form>
    </div>
  );
}
