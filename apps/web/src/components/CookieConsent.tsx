'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const COOKIE_CONSENT_KEY = 'wb_cookie_consent';

// Pages where cookie consent banner should not appear
const EXCLUDED_PATHS = ['/privacy-plain', '/cookies-plain'];

/**
 * Push Google Consent Mode v2 update to dataLayer
 */
function updateGoogleConsent(analytics: boolean, marketing: boolean) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(arguments);
  }
  gtag('consent', 'update', {
    'ad_storage': marketing ? 'granted' : 'denied',
    'ad_user_data': marketing ? 'granted' : 'denied',
    'ad_personalization': marketing ? 'granted' : 'denied',
    'analytics_storage': analytics ? 'granted' : 'denied',
  });
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    analytics: true,
    marketing: true,
  });
  const pathname = usePathname();

  useEffect(() => {
    // Don't show banner on excluded pages
    if (EXCLUDED_PATHS.includes(pathname)) {
      return;
    }

    // Check if consent was already given
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to avoid flash
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const acceptAll = () => {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    updateGoogleConsent(true, true);
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    const consent = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    updateGoogleConsent(false, false);
    setShowBanner(false);
  };

  const savePreferences = () => {
    const consent = {
      ...preferences,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    updateGoogleConsent(preferences.analytics, preferences.marketing);
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" />
      
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-secondary-700 overflow-hidden">
          {!showSettings ? (
            // Main Banner
            <div className="p-5 sm:p-8">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🍪</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Ta strona używa plików cookies
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    Używamy plików cookies, aby zapewnić najlepsze doświadczenie na naszej stronie. 
                    Pliki cookies pomagają nam analizować ruch, personalizować treści i reklamy oraz 
                    udostępniać funkcje mediów społecznościowych. Możesz zaakceptować wszystkie cookies 
                    lub dostosować swoje preferencje.
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-5 sm:mb-6">
                    Więcej informacji znajdziesz w naszej{' '}
                    <a href="/privacy-plain" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                      Polityce prywatności
                    </a>{' '}
                    i{' '}
                    <a href="/cookies-plain" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                      Polityce cookies
                    </a>.
                  </p>
                  
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={acceptAll}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      Akceptuję wszystkie
                    </button>
                    <button
                      onClick={acceptNecessary}
                      className="w-full border-2 border-gray-300 dark:border-secondary-600 hover:border-gray-400 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      Tylko niezbędne
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium py-2 sm:py-3 px-4 transition-colors text-sm"
                    >
                      Dostosuj ustawienia
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Settings Panel
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ustawienia cookies</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Necessary Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-secondary-700 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Niezbędne</h3>
                      <span className="text-xs bg-gray-200 dark:bg-secondary-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">Zawsze aktywne</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Te pliki cookies są niezbędne do prawidłowego działania strony. Umożliwiają 
                      podstawowe funkcje, takie jak nawigacja i dostęp do bezpiecznych obszarów.
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="w-12 h-6 bg-gray-400 dark:bg-gray-500 rounded-full relative cursor-not-allowed opacity-70">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-secondary-700 rounded-xl">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Analityczne</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Te pliki cookies pomagają nam zrozumieć, jak odwiedzający korzystają z naszej 
                      strony. Zbierają informacje w sposób anonimowy.
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                      className={`w-12 h-6 rounded-full relative transition-colors ${
                        preferences.analytics ? 'bg-orange-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        preferences.analytics ? 'right-1' : 'left-1'
                      }`}></div>
                    </button>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-secondary-700 rounded-xl">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Marketingowe</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Te pliki cookies służą do wyświetlania spersonalizowanych reklam. Mogą być 
                      używane do śledzenia odwiedzających na różnych stronach.
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                      className={`w-12 h-6 rounded-full relative transition-colors ${
                        preferences.marketing ? 'bg-orange-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        preferences.marketing ? 'right-1' : 'left-1'
                      }`}></div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={savePreferences}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Zapisz preferencje
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 border-2 border-gray-300 dark:border-secondary-600 hover:border-gray-400 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Akceptuj wszystkie
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
