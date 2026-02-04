'use client';

import { useState, useEffect } from 'react';
import { X, Gift, UserPlus, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

// ============================================
// WELCOME DISCOUNT POPUP
// Shows -20% discount offer for non-logged users
// Only on homepage, once per session
// ============================================

const POPUP_DELAY_MS = 2000; // Show after 2 seconds
const POPUP_SESSION_KEY = 'welcome_popup_shown_this_session';

export function WelcomeDiscountPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Wait for client mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Only show on homepage
    if (pathname !== '/') return;
    
    // Don't show if user is logged in or still loading
    if (isLoading) return;
    if (isAuthenticated) return;

    // Check if popup was already shown this session
    const shownThisSession = sessionStorage.getItem(POPUP_SESSION_KEY);
    if (shownThisSession) return;

    // Show popup after delay
    const timer = setTimeout(() => {
      setIsOpen(true);
      // Mark as shown for this session
      sessionStorage.setItem(POPUP_SESSION_KEY, 'true');
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isMounted, isAuthenticated, isLoading, pathname]);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto animate-slideUp overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-secondary-700 rounded-full transition-colors z-10"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>

          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-full mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Specjalnie dla Ciebie!
            </h2>
            <p className="text-orange-100">
              Mamy dla Ciebie wyjątkową ofertę powitalną
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Discount badge */}
            <div className="text-center mb-6">
              <div className="inline-block">
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  -20%
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                na pierwsze zakupy
              </p>
            </div>

            {/* How it works */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <Mail size={18} className="text-gray-500 dark:text-gray-400" />
                Jak to działa?
              </h3>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Załóż bezpłatne konto</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Otrzymasz kod rabatowy na adres e-mail</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Użyj kodu przy zamówieniu</span>
                </li>
              </ol>
            </div>

            {/* Urgency */}
            <p className="text-center text-sm text-red-500 font-medium mb-4">
              ⏰ Kod ważny tylko 14 dni od rejestracji!
            </p>

            {/* CTA Button */}
            <Link
              href="/register"
              onClick={handleClose}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
            >
              <UserPlus size={20} />
              Załóż konto i odbierz zniżkę
              <ArrowRight size={18} />
            </Link>

            {/* Already have account */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              Masz już konto?{' '}
              <Link 
                href="/login" 
                onClick={handleClose}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Zaloguj się
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
