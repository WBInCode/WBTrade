'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { productsApi, Product } from '@/lib/api';

interface BestsellersCarouselProps {
  limit?: number;
  category?: string; // Optional: filter by category slug
  days?: number; // How many days back to look for sales (default 90)
}

export default function BestsellersCarousel({ 
  limit = 20, 
  category,
  days = 90 
}: BestsellersCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Use new bestsellers endpoint based on actual sales data
        const response = await productsApi.getBestsellers({ limit, category, days });
        setProducts(response.products);
      } catch (error) {
        console.error('Error fetching bestsellers:', error);
        // Fallback: fetch by price if bestsellers endpoint fails
        try {
          const fallback = await productsApi.getAll({ limit, sort: 'price_desc' });
          setProducts(fallback.products);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit, category, days]);

  if (loading) {
    return (
      <section className="py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-100 rounded-lg sm:rounded-xl animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-24 sm:w-32 animate-pulse"></div>
        </div>
        <div className="flex gap-2.5 sm:gap-3 md:gap-4 overflow-hidden -mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] lg:w-[220px] h-[200px] sm:h-[240px] md:h-[280px] bg-gray-100 rounded-xl sm:rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <ProductCarousel
      title="Bestsellery"
      subtitle="Najchętniej kupowane produkty"
      products={products}
      viewAllLink="/products/bestsellers"
      accentColor="orange"
      icon={<span>🔥</span>}
    />
  );
}
