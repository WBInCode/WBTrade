'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { productsApi, Product } from '@/lib/api';

interface FeaturedCarouselProps {
  featuredProductIds?: string[]; // Optional: manually specify products
  fallbackLimit?: number;
}

export default function FeaturedCarousel({
  featuredProductIds,
  fallbackLimit = 20,
}: FeaturedCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Use new featured endpoint that supports admin-curated products
        const response = await productsApi.getFeatured({
          limit: fallbackLimit,
          productIds: featuredProductIds,
        });
        setProducts(response.products);
      } catch (error) {
        console.error('Error fetching featured products:', error);
        // Fallback: fetch newest products
        try {
          const fallback = await productsApi.getAll({
            limit: fallbackLimit,
            sort: 'newest',
          });
          setProducts(fallback.products);
        } catch (e) {
          console.error('Fallback also failed:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [featuredProductIds, fallbackLimit]);

  if (loading) {
    return (
      <section className="py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-100 rounded-lg sm:rounded-xl animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-28 sm:w-40 animate-pulse"></div>
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
      title="Polecane dla Ciebie"
      subtitle="Specjalnie wybrane produkty"
      products={products}
      viewAllLink="/products/featured"
      accentColor="purple"
      icon={<span>⭐</span>}
    />
  );
}
