'use client';

import { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductListCard from '../../../components/ProductListCard';
import Breadcrumb from '../../../components/Breadcrumb';
import { Product, productsApi } from '../../../lib/api';

export default function FeaturedPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const response = await productsApi.getFeatured({ limit: 20 });
        setProducts(response.products);
      } catch (error) {
        console.error('Failed to fetch featured products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: 'Polecane', href: '/products/featured' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-secondary-900">
      <Header />
      <main className="flex-grow">
        <div className="container-custom py-6">
          <Breadcrumb items={breadcrumbItems} />
          
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-8 mb-8 text-white">
            <div className="flex items-center gap-4">
              <span className="text-5xl">⭐</span>
              <div>
                <h1 className="text-3xl font-bold">Polecane dla Ciebie</h1>
                <p className="text-white/80 mt-1">
                  Specjalnie wybrane produkty przez nasz zespół
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
                {products.map((product) => (
                  <ProductListCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">Brak polecanych produktów</p>
              <p className="text-gray-400 mt-2">Wróć wkrótce po nowe rekomendacje</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
