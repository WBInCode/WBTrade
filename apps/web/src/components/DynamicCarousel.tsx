'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Map icon names from DB to emojis for ProductCarousel
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

// Map gradient color strings to simple accent names
function extractAccentColor(gradient: string): string {
  if (gradient.includes('violet') || gradient.includes('purple')) return 'purple';
  if (gradient.includes('orange') || gradient.includes('red')) return 'orange';
  if (gradient.includes('emerald') || gradient.includes('teal')) return 'green';
  if (gradient.includes('pink') || gradient.includes('rose')) return 'pink';
  if (gradient.includes('blue') || gradient.includes('cyan')) return 'blue';
  if (gradient.includes('amber') || gradient.includes('yellow')) return 'yellow';
  if (gradient.includes('indigo')) return 'indigo';
  return 'orange';
}

interface CarouselConfig {
  slug: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  productLimit: number;
}

interface DynamicCarouselProps {
  carousel: CarouselConfig;
  /** Pre-fetched products (for above-fold / SSR) */
  initialProducts?: any[];
}

export default function DynamicCarousel({ carousel, initialProducts }: DynamicCarouselProps) {
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return;

    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/carousels/${carousel.slug}/products`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (e) {
        console.error(`Error fetching carousel "${carousel.slug}":`, e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [carousel.slug, initialProducts]);

  if (loading) {
    return (
      <section className="py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-secondary-700 rounded-xl animate-pulse" />
          <div className="h-6 w-40 bg-gray-200 dark:bg-secondary-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[200px] h-[280px] bg-gray-200 dark:bg-secondary-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <ProductCarousel
      title={carousel.name}
      subtitle={carousel.description || undefined}
      products={products}
      viewAllLink={`/products?carousel=${carousel.slug}`}
      accentColor={extractAccentColor(carousel.color)}
      icon={<span>{ICON_EMOJI[carousel.icon] || '⭐'}</span>}
    />
  );
}
