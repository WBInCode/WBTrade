'use client';

import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Breadcrumb from '../../../components/Breadcrumb';
import Link from 'next/link';

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  safetyInfo?: string;
  euRepName?: string;
  euRepAddress?: string;
  euRepEmail?: string;
  _count: { products: number };
}

export default function ManufacturerPageClient({ manufacturer }: { manufacturer: Manufacturer }) {
  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: 'Producenci', href: '/producenci' },
    { label: manufacturer.name },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
      <Header />

      <main className="container-custom py-6 px-4">
        <Breadcrumb items={breadcrumbItems} />

        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-secondary-800 rounded-2xl p-6 sm:p-8 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {manufacturer.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {manufacturer._count.products} produktów w ofercie
            </p>
          </div>

          {/* Dane kontaktowe */}
          <div className="bg-white dark:bg-secondary-800 rounded-2xl p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Dane producenta
            </h2>

            <div className="space-y-5">
              {manufacturer.address && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Adres</p>
                    <p className="text-gray-900 dark:text-white whitespace-pre-line">{manufacturer.address}</p>
                  </div>
                </div>
              )}

              {manufacturer.email && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</p>
                    <a href={`mailto:${manufacturer.email}`} className="text-orange-500 hover:underline">{manufacturer.email}</a>
                  </div>
                </div>
              )}

              {manufacturer.phone && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefon</p>
                    <a href={`tel:${manufacturer.phone}`} className="text-orange-500 hover:underline">{manufacturer.phone}</a>
                  </div>
                </div>
              )}

              {manufacturer.website && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Strona internetowa</p>
                    <a href={manufacturer.website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">{manufacturer.website}</a>
                  </div>
                </div>
              )}

              {!manufacturer.address && !manufacturer.email && !manufacturer.phone && !manufacturer.website && (
                <p className="text-gray-400 text-sm">Dane kontaktowe producenta nie zostały jeszcze uzupełnione.</p>
              )}
            </div>
          </div>

          {/* Bezpieczeństwo */}
          {manufacturer.safetyInfo && (
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                Ostrzeżenia i informacje o bezpieczeństwie
              </h2>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-200 whitespace-pre-line">{manufacturer.safetyInfo}</p>
              </div>
            </div>
          )}

          {/* Podmiot odpowiedzialny w UE */}
          {manufacturer.euRepName && (
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🇪🇺 Podmiot odpowiedzialny w UE
              </h2>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">{manufacturer.euRepName}</p>
                {manufacturer.euRepAddress && <p className="text-sm text-blue-700 dark:text-blue-300">{manufacturer.euRepAddress}</p>}
                {manufacturer.euRepEmail && (
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <a href={`mailto:${manufacturer.euRepEmail}`} className="hover:underline">{manufacturer.euRepEmail}</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Link do produktów */}
          <div className="text-center">
            <Link
              href={`/products?search=${encodeURIComponent(manufacturer.name)}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-medium"
            >
              Zobacz produkty {manufacturer.name}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
