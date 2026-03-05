'use client';

import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-secondary-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-12 max-w-lg mx-auto">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Coś poszło nie tak</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Wystąpił błąd podczas ładowania wiadomości. Spróbuj ponownie.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => reset()}
                className="px-5 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Spróbuj ponownie
              </button>
              <Link
                href="/account"
                className="px-5 py-2.5 border border-gray-200 dark:border-secondary-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
              >
                Wróć do konta
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
