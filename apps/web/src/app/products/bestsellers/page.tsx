'use client';

import { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductListCard from '../../../components/ProductListCard';
import Breadcrumb from '../../../components/Breadcrumb';
import { Product, productsApi } from '../../../lib/api';

export default function BestsellersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBestsellers() {
      try {
        const response = await productsApi.getBestsellers({ limit: 20, days: 90 });
        setProducts(response.products);
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
    { label: 'Bestsellery', href: '/products/bestsellers' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-secondary-900">
      <Header />
      <main className="flex-grow">
        <div className="container-custom py-6">
          <Breadcrumb items={breadcrumbItems} />
          
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 mb-8 text-white">
            <div className="flex items-center gap-4">
              <span className="text-5xl">🔥</span>
              <div>
                <h1 className="text-3xl font-bold">Bestsellery</h1>
                <p className="text-white/80 mt-1">
                  Najchętniej kupowane produkty z ostatnich 90 dni
                </p>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-secondary-800 rounded-lg h-[320px] animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Znaleziono {products.length} produktów
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product, index) => (
                  <div key={product.id} className="relative">
                    {index < 3 && (
                      <div className="absolute -top-2 -left-2 z-10 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        #{index + 1}
                      </div>
                    )}
                    <ProductListCard product={product} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">Brak danych o sprzedaży</p>
              <p className="text-gray-400 mt-2">Bestsellery pojawią się po pierwszych zamówieniach</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
