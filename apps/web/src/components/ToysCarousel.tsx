'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { productsApi, Product } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ToysCarouselProps {
  categorySlug?: string;
  limit?: number;
}

export default function ToysCarousel({
  categorySlug = 'zabawki',
  limit = 20,
}: ToysCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let manualProducts: Product[] = [];
        let manualProductIds: string[] = [];
        
        // Check if admin has manually selected toys products (they go first)
        try {
          const settingsRes = await fetch(`${API_URL}/admin/settings/carousels`);
          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            if (settings.carousels?.toys?.productIds?.length > 0) {
              manualProductIds = settings.carousels.toys.productIds;
              const response = await productsApi.getAll({ limit: 100 });
              manualProducts = manualProductIds
                .map((id: string) => response.products.find((p: Product) => p.id === id))
                .filter(Boolean) as Product[];
            }
          }
        } catch (e) {
          console.error('Error fetching settings:', e);
        }
        
        // If we have enough manual products, use them
        if (manualProducts.length >= limit) {
          setProducts(manualProducts.slice(0, limit));
          setLoading(false);
          return;
        }
        
        // Get automatic products to fill remaining slots
        const remainingSlots = limit - manualProducts.length;
        let automaticProducts: Product[] = [];
        
        // Try to get bestsellers from this category
        const response = await productsApi.getBestsellers({ 
          limit: remainingSlots + manualProductIds.length, // Get extra to filter
          category: categorySlug 
        });
        
        // Filter out manual products from automatic results
        automaticProducts = response.products
          .filter((p: Product) => !manualProductIds.includes(p.id))
          .slice(0, remainingSlots);
        
        // If not enough bestsellers, fallback to any category products
        if (automaticProducts.length < remainingSlots) {
          const fallback = await productsApi.getAll({
            limit: remainingSlots - automaticProducts.length + manualProductIds.length,
            category: categorySlug,
          });
          const additionalProducts = fallback.products
            .filter((p: Product) => !manualProductIds.includes(p.id) && !automaticProducts.some(ap => ap.id === p.id))
            .slice(0, remainingSlots - automaticProducts.length);
          automaticProducts = [...automaticProducts, ...additionalProducts];
        }
        
        // Combine: manual first, then automatic
        setProducts([...manualProducts, ...automaticProducts]);
      } catch (error) {
        console.error('Error fetching toys:', error);
        // Fallback
        try {
          const fallback = await productsApi.getAll({
            limit,
            category: categorySlug,
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
  }, [categorySlug, limit]);

  if (loading) {
    return (
      <section className="py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-100 rounded-lg sm:rounded-xl animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-20 sm:w-24 animate-pulse"></div>
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
      title="Zabawki"
      subtitle="Dla małych i dużych"
      products={products}
      viewAllLink="/products/toys"
      accentColor="pink"
      icon={<span>🧸</span>}
    />
  );
}
