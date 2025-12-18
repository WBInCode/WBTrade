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
  { id: 'all' as TabType, label: 'Wszystkie' },
  { id: 'bestsellers' as TabType, label: 'Bestsellery' },
  { id: 'discounted' as TabType, label: 'Przecenione' },
  { id: 'new' as TabType, label: 'Nowości' },
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
            // Bestsellers - for now, we'll fetch products sorted by name (as a proxy)
            // In a real app, this would be based on order count or a bestseller flag
            const bestsellersResponse = await productsApi.getAll({
              limit: 12,
              sort: 'name_asc',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-secondary-900">Polecane dla Ciebie</h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
        <div className="text-center py-12 text-secondary-500">
          <p>Brak produktów w tej kategorii</p>
        </div>
      )}
    </section>
  );
}
