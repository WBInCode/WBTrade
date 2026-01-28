'use client';

import React from 'react';
import Link from 'next/link';

interface CheckoutAuthChoiceProps {
  onGuestCheckout: () => void;
  onLoginClick: () => void;
}

export default function CheckoutAuthChoice({ onGuestCheckout, onLoginClick }: CheckoutAuthChoiceProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Jak chcesz kontynuować?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logowanie */}
        <div className="border rounded-lg p-5 hover:border-orange-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Mam już konto</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Zaloguj się, aby skorzystać z zapisanych adresów i śledzić swoje zamówienia.
          </p>
          <button
            onClick={onLoginClick}
            className="w-full bg-orange-500 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Zaloguj się
          </button>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Nie masz konta?{' '}
            <Link href="/register?redirect=/checkout" className="text-orange-500 hover:underline">
              Zarejestruj się
            </Link>
          </p>
        </div>

        {/* Zakupy bez konta */}
        <div className="border rounded-lg p-5 hover:border-gray-400 hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Kupuję bez konta</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Szybkie zakupy bez rejestracji. Wystarczy podać dane do wysyłki.
          </p>
          <button
            onClick={onGuestCheckout}
            className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Kontynuuj bez logowania
          </button>
        </div>
      </div>

      {/* Box z korzyściami rejestracji */}
      <div className="mt-8 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">%</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">
              Załóż konto i odbierz <span className="text-orange-500">-20% rabatu!</span>
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Kod rabatowy -20% na pierwsze zakupy</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Szybszy checkout z zapisanymi adresami</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Historia zamówień i śledzenie przesyłek</span>
              </li>
            </ul>
            <Link 
              href="/register?redirect=/checkout"
              className="inline-flex items-center gap-2 mt-4 text-orange-600 font-medium hover:text-orange-700"
            >
              Załóż konto teraz
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
