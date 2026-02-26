'use client';

import { useEffect, useState } from 'react';
import LazyCarousel from './LazyCarousel';
import DynamicCarousel from './DynamicCarousel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface CarouselMeta {
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  productLimit: number;
}

/**
 * Fetches visible carousels from the API and renders them lazily.
 * Skips the first carousel (featured) since it's rendered above the fold by page.tsx.
 */
export default function BelowFoldCarousels() {
  const [carousels, setCarousels] = useState<CarouselMeta[]>([]);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch(`${API_URL}/carousels`);
        if (res.ok) {
          const data = await res.json();
          // Skip the first carousel — it's the above-fold "featured" rendered by page.tsx
          const list: CarouselMeta[] = (data.carousels || []).slice(1);
          setCarousels(list);
        }
      } catch (e) {
        console.error('Error fetching carousel list:', e);
      }
    };
    fetchList();
  }, []);

  if (carousels.length === 0) return null;

  return (
    <>
      {carousels.map((carousel) => (
        <LazyCarousel key={carousel.slug}>
          <DynamicCarousel carousel={carousel} />
        </LazyCarousel>
      ))}
    </>
  );
}
