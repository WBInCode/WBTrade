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
      <section className="my-8">
        <div className="container-custom">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5">
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl"></div>
                <div className="h-6 bg-white/20 rounded w-48"></div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-[220px] h-[300px] bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
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
      accentColor="from-violet-600 to-purple-700"
      icon={<span>⭐</span>}
    />
  );
}
