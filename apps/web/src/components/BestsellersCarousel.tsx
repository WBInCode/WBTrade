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
      <section className="my-8">
        <div className="container-custom">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-5">
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
      title="Bestsellery"
      subtitle="Najchętniej kupowane produkty"
      products={products}
      viewAllLink="/products/bestsellers"
      accentColor="from-orange-500 to-red-600"
      icon={<span>🔥</span>}
    />
  );
}
