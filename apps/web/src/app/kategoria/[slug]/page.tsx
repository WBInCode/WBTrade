'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductListCard from '../../../components/ProductListCard';
import Breadcrumb from '../../../components/Breadcrumb';
import { Product, productsApi, categoriesApi } from '../../../lib/api';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch category info
        const categoryResponse = await categoriesApi.getPath(slug);
        if (categoryResponse.path && categoryResponse.path.length > 0) {
          setCategoryName(categoryResponse.path[categoryResponse.path.length - 1].name);
        }

        // Fetch products from this category
        const response = await productsApi.getAll({ 
          category: slug,
          limit: 100 
        });
        setProducts(response.products);
      } catch (error) {
        console.error('Failed to fetch category data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: categoryName || slug, href: `/kategoria/${slug}` },
  ];

  // Map slugs to gradients and icons
  const categoryStyles: Record<string, { gradient: string; icon: string }> = {
    'zabawki': { gradient: 'from-pink-500 to-rose-600', icon: '🧸' },
    'elektronika': { gradient: 'from-blue-500 to-indigo-600', icon: '📱' },
    'dziecko': { gradient: 'from-purple-500 to-pink-600', icon: '👶' },
    'dom-i-ogrod': { gradient: 'from-green-500 to-emerald-600', icon: '🏡' },
    'sport': { gradient: 'from-orange-500 to-red-600', icon: '⚽' },
  };

  const style = categoryStyles[slug] || { gradient: 'from-gray-600 to-gray-800', icon: '📦' };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow">
        <div className="container-custom py-6">
          <Breadcrumb items={breadcrumbItems} />
          
          {/* Header */}
          <div className={`bg-gradient-to-r ${style.gradient} rounded-2xl p-8 mb-8 text-white`}>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{style.icon}</span>
              <div>
                <h1 className="text-3xl font-bold">{categoryName || slug}</h1>
                <p className="text-white/80 mt-1">
                  Wszystkie produkty z kategorii
                </p>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg h-[320px] animate-pulse" />
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
              <p className="text-gray-500 text-lg">Brak produktów w tej kategorii</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
