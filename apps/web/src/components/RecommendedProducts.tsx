'use client';

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import { productsApi, Product } from '../lib/api';

interface RecommendedProductsProps {
  initialProducts: Product[];
}

type TabType = 'all' | 'bestsellers' | 'discounted' | 'new';

const tabs = [
  { id: 'all' as TabType, label: 'Wszystkie', icon: '📦' },
  { id: 'bestsellers' as TabType, label: 'Bestsellery', icon: '🏆' },
  { id: 'discounted' as TabType, label: 'Przecenione', icon: '💰' },
  { id: 'new' as TabType, label: 'Nowości', icon: '✨' },
];

export default function RecommendedProducts({ initialProducts }: RecommendedProductsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let fetchedProducts: Product[] = [];

        switch (activeTab) {
          case 'all':
            // Use initial products or fetch all
            setProducts(initialProducts);
            setLoading(false);
            return;

          case 'bestsellers':
            // Bestsellers - based on actual sales data from last 90 days
            const bestsellersResponse = await productsApi.getBestsellers({
              limit: 12,
              days: 90,
            });
            fetchedProducts = bestsellersResponse.products;
            break;

          case 'discounted':
            // Discounted - products with compareAtPrice (on sale)
            const allProductsResponse = await productsApi.getAll({
              limit: 50,
            });
            // Filter products that have compareAtPrice and it's higher than current price
            fetchedProducts = allProductsResponse.products.filter(
              (p) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price)
            );
            break;

          case 'new':
            // Newest products
            const newestResponse = await productsApi.getAll({
              limit: 12,
              sort: 'newest',
            });
            fetchedProducts = newestResponse.products;
            break;
        }

        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [activeTab, initialProducts]);

  return (
    <section className="mb-10">
      {/* Professional Header */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title with icon */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Polecane dla Ciebie</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Produkty dobrane specjalnie dla Ciebie</p>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-secondary-700 rounded-xl p-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-secondary-600 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-secondary-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary-600'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Stats bar */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-secondary-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Szybka dostawa</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <span>14 dni na zwrot</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Zaufane opinie klientów</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Brak produktów</h3>
          <p className="text-gray-500 dark:text-gray-400">W tej kategorii nie ma jeszcze produktów</p>
        </div>
      )}
    </section>
  );
}
