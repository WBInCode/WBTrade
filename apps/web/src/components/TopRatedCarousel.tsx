'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { productsApi, Product } from '@/lib/api';

interface TopRatedCarouselProps {
  limit?: number;
}

export default function TopRatedCarousel({ limit = 20 }: TopRatedCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productsApi.getTopRated({ limit });
        setProducts(response.products);
      } catch (error) {
        console.error('Error fetching top-rated products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit]);

  if (loading) {
    return (
      <section className="py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-100 dark:bg-primary-900/30 rounded-lg sm:rounded-xl animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-gray-200 dark:bg-secondary-700 rounded w-24 sm:w-32 animate-pulse"></div>
        </div>
        <div className="flex gap-2.5 sm:gap-3 md:gap-4 overflow-hidden -mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] lg:w-[220px] h-[200px] sm:h-[240px] md:h-[280px] bg-gray-100 dark:bg-secondary-800 rounded-xl sm:rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <ProductCarousel
      title="Najlepiej oceniane"
      subtitle="Produkty z najwyższymi ocenami klientów"
      products={products}
      viewAllLink="/products?tab=top-rated"
      accentColor="yellow"
      icon={<span className="text-lg">&#11088;</span>}
    />
  );
}
