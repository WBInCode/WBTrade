'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { productsApi, Product } from '@/lib/api';

interface NewProductsCarouselProps {
  limit?: number;
  days?: number; // How many days back to look (default 14)
}

export default function NewProductsCarousel({ 
  limit = 20, 
  days = 14 
}: NewProductsCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Use new products endpoint - products from last 14 days
        const response = await productsApi.getNewProducts({ limit, days });
        setProducts(response.products);
      } catch (error) {
        console.error('Error fetching new products:', error);
        // Fallback: fetch newest products using regular endpoint
        try {
          const fallback = await productsApi.getAll({ limit, sort: 'newest' });
          setProducts(fallback.products);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit, days]);

  if (loading) {
    return (
      <section className="py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-100 rounded-lg sm:rounded-xl animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-20 sm:w-28 animate-pulse"></div>
        </div>
        <div className="flex gap-2.5 sm:gap-3 md:gap-4 overflow-hidden -mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] lg:w-[220px] h-[200px] sm:h-[240px] md:h-[280px] bg-gray-100 rounded-xl sm:rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <ProductCarousel
      title="Nowości"
      subtitle="Produkty z ostatnich 2 tygodni"
      products={products}
      viewAllLink="/products?sort=newest"
      accentColor="green"
      icon={<span>✨</span>}
    />
  );
}
