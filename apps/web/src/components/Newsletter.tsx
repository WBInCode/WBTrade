'use client';

import { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Proszę podać poprawny adres email');
      return;
    }

    setStatus('loading');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Wystąpił błąd');
      }
    } catch (error) {
      console.error('Newsletter error:', error);
      setStatus('error');
      setMessage('Wystąpił błąd. Spróbuj ponownie później.');
    }
    
    // Reset after 5 seconds
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 5000);
  };

  return (
    <section className="bg-gradient-to-r from-primary-500 to-primary-600 py-8 sm:py-12 mb-10 mx-4 sm:mx-4 lg:mx-8 rounded-2xl sm:rounded-3xl">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6">
        {/* Icon */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
          Zapisz się i odbierz <span className="text-yellow-300">-10%</span> na kolejne zakupy!
        </h2>
        <p className="text-sm sm:text-base text-white/80 mb-2 max-w-xl mx-auto">
          Otrzymaj unikalny kod rabatowy oraz informacje o najlepszych promocjach i ekskluzywnych ofertach.
        </p>
        <p className="text-xs text-white/60 mb-4 sm:mb-6 max-w-xl mx-auto">
          Rabat nie łączy się z promocją powitalną na pierwsze zakupy.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-lg mx-auto px-2 sm:px-0">
          <div className="flex-1 relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Twój adres e-mail"
              disabled={status === 'loading' || status === 'success'}
              className="w-full h-11 sm:h-12 px-4 rounded-lg text-gray-900 placeholder:text-gray-400 text-sm sm:text-base
                       focus:outline-none focus:ring-2 focus:ring-white/50
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {status === 'success' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="h-11 sm:h-12 px-6 sm:px-8 bg-secondary-900 text-white font-semibold rounded-lg text-sm sm:text-base
                     hover:bg-secondary-800 transition-colors
                     disabled:bg-secondary-600 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Zapisuję...</span>
              </>
            ) : (
              'Zapisz się'
            )}
          </button>
        </form>

        {/* Status message */}
        {message && (
          <p className={`mt-3 text-sm ${status === 'error' ? 'text-red-200' : 'text-white'}`}>
            {message}
          </p>
        )}

        {/* Benefits */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-8 text-white/80 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-200 font-semibold">-10% na kolejne zamówienie</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Ekskluzywne oferty</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Wcześniejszy dostęp do wyprzedaży</span>
          </div>
        </div>
      </div>
    </section>
  );
}
