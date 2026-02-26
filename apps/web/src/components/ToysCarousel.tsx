'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { Product } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ToysCarouselProps {
  limit?: number;
}

export default function ToysCarousel({
  limit = 20,
}: ToysCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      try {
        // Use dedicated public endpoint that handles manual+automatic merge server-side
        const response = await fetch(`${API_URL}/products/toys?limit=${limit}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Error fetching toys:', error);
        // Fallback: try bestsellers with category filter
        try {
          const fallback = await fetch(`${API_URL}/products/bestsellers?category=zabawki&limit=${limit}`, {
            signal: controller.signal,
          });
          if (fallback.ok) {
            const data = await fallback.json();
            setProducts(data.products || data || []);
          }
        } catch (e: any) {
          if (e?.name !== 'AbortError') {
            console.error('Fallback also failed:', e);
            setProducts([]);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [limit]);

  // Don't render if no products
  if (!loading && products.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-100 dark:bg-primary-900/30 rounded-lg sm:rounded-xl animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-gray-200 dark:bg-secondary-700 rounded w-20 sm:w-24 animate-pulse"></div>
        </div>
        <div className="flex gap-2.5 sm:gap-3 md:gap-4 overflow-hidden -mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] lg:w-[220px] h-[200px] sm:h-[240px] md:h-[280px] bg-gray-100 dark:bg-secondary-800 rounded-xl sm:rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <ProductCarousel
      title="Zabawki"
      subtitle="Dla małych i dużych"
      products={products}
      viewAllLink="/products/toys"
      accentColor="pink"
      icon={<span>🧸</span>}
    />
  );
}
