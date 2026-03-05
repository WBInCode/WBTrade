'use client';

import { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductListCard from '../../../components/ProductListCard';
import Breadcrumb from '../../../components/Breadcrumb';
import { Product } from '../../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function BestsellersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBestsellers() {
      try {
        // Fetch from admin-configured carousel (same source as homepage)
        const res = await fetch(`${API_URL}/carousels/bestsellery/products`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch bestsellers:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBestsellers();
  }, []);

  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: 'Bestsellery' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-secondary-900">
      <Header />
      <main className="flex-grow">
        <div className="container-custom py-6">
          <Breadcrumb items={breadcrumbItems} />

          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 sm:p-8 mb-6 text-white">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-4xl sm:text-5xl">🔥</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Bestsellery</h1>
                <p className="text-white/80 mt-1 text-sm sm:text-base">
                  Najchętniej kupowane produkty
                </p>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-secondary-700 h-[280px] sm:h-[320px] animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                {products.length} {products.length === 1 ? 'produkt' : products.length < 5 ? 'produkty' : 'produktów'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                {products.map((product, index) => (
                  <div key={product.id} className="relative">
                    {index < 3 && (
                      <div className="absolute -top-1.5 -left-1.5 z-10 bg-orange-500 text-white text-[10px] sm:text-xs font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-md">
                        #{index + 1}
                      </div>
                    )}
                    <ProductListCard product={product} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-2xl border border-gray-200 dark:border-secondary-700">
              <span className="text-5xl mb-4 block">🔥</span>
              <p className="text-gray-500 dark:text-gray-400 text-lg">Brak bestsellerów</p>
              <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm">Bestsellery pojawią się wkrótce</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
