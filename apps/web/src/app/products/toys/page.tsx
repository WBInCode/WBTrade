'use client';

import { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductListCard from '../../../components/ProductListCard';
import Breadcrumb from '../../../components/Breadcrumb';
import { Product, productsApi } from '../../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ToysPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchToys() {
      const categorySlug = 'zabawki';
      const limit = 20;
      
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
          limit: remainingSlots + manualProductIds.length,
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
        console.error('Failed to fetch toys:', error);
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
    }
    fetchToys();
  }, []);

  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: 'Zabawki', href: '/products/toys' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-secondary-900">
      <Header />
      <main className="flex-grow">
        <div className="container-custom py-6">
          <Breadcrumb items={breadcrumbItems} />
          
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl p-8 mb-8 text-white">
            <div className="flex items-center gap-4">
              <span className="text-5xl">🧸</span>
              <div>
                <h1 className="text-3xl font-bold">Zabawki</h1>
                <p className="text-white/80 mt-1">
                  Dla małych i dużych
                </p>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-secondary-800 rounded-lg h-[320px] animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-gray-600 mb-4">
                Znaleziono {products.length} produktów
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductListCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">Brak produktów</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
