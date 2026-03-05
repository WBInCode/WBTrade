'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import ProductListCard from '../../../../components/ProductListCard';
import Breadcrumb from '../../../../components/Breadcrumb';
import { Product } from '../../../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Map icon names to emojis (same as DynamicCarousel)
const ICON_EMOJI: Record<string, string> = {
  star: '⭐',
  flame: '🔥',
  gift: '🎁',
  snowflake: '❄️',
  sparkles: '✨',
  'shopping-bag': '🛍️',
  'trending-up': '📈',
  clock: '🕐',
  'layout-grid': '📦',
};

interface CarouselConfig {
  slug: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  productLimit: number;
}

export default function CarouselPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [carousel, setCarousel] = useState<CarouselConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch carousel config and products in parallel
        const [carouselsRes, productsRes] = await Promise.all([
          fetch(`${API_URL}/carousels`),
          fetch(`${API_URL}/carousels/${slug}/products`),
        ]);

        if (carouselsRes.ok) {
          const data = await carouselsRes.json();
          const found = data.carousels?.find((c: CarouselConfig) => c.slug === slug);
          if (found) setCarousel(found);
        }

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch carousel data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchData();
  }, [slug]);

  const name = carousel?.name || slug;
  const icon = carousel ? (ICON_EMOJI[carousel.icon] || '⭐') : '⭐';
  const description = carousel?.description;

  // Extract gradient colors for header
  const gradientClass = carousel?.color || 'from-primary-500 to-primary-700';

  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: name },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-secondary-900">
      <Header />
      <main className="flex-grow">
        <div className="container-custom py-6">
          <Breadcrumb items={breadcrumbItems} />

          {/* Header */}
          <div className={`bg-gradient-to-r ${gradientClass} rounded-2xl p-6 sm:p-8 mb-6 text-white`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-4xl sm:text-5xl">{icon}</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
                {description && (
                  <p className="text-white/80 mt-1 text-sm sm:text-base">{description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-secondary-700 h-[280px] sm:h-[320px] animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                {products.length} {products.length === 1 ? 'produkt' : products.length < 5 ? 'produkty' : 'produktów'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                {products.map((product) => (
                  <ProductListCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-2xl border border-gray-200 dark:border-secondary-700">
              <span className="text-5xl mb-4 block">{icon}</span>
              <p className="text-gray-500 dark:text-gray-400 text-lg">Brak produktów</p>
              <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm">Produkty pojawią się wkrótce</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
