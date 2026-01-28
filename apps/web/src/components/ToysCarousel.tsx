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
      <section className="my-8">
        <div className="container-custom">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-5">
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
      title="Zabawki"
      subtitle="Dla małych i dużych"
      products={products}
      viewAllLink="/products/toys"
      accentColor="from-pink-500 to-rose-600"
      icon={<span>🧸</span>}
    />
  );
}
