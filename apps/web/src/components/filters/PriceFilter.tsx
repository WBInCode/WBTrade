'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface PriceFilterProps {
  priceRange?: { min: number; max: number };
}

export default function PriceFilter({ priceRange }: PriceFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [debouncedMin, setDebouncedMin] = useState(minPrice);
  const [debouncedMax, setDebouncedMax] = useState(maxPrice);

  // Sync with URL params when they change
  useEffect(() => {
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  // Debounce price changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMin(minPrice);
    }, 500);
    return () => clearTimeout(timer);
  }, [minPrice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMax(maxPrice);
    }, 500);
    return () => clearTimeout(timer);
  }, [maxPrice]);

  // Update URL when debounced values change
  useEffect(() => {
    const currentMin = searchParams.get('minPrice') || '';
    const currentMax = searchParams.get('maxPrice') || '';
    
    if (debouncedMin !== currentMin || debouncedMax !== currentMax) {
      const params = new URLSearchParams(searchParams.toString());
      
      if (debouncedMin) {
        params.set('minPrice', debouncedMin);
      } else {
        params.delete('minPrice');
      }
      
      if (debouncedMax) {
        params.set('maxPrice', debouncedMax);
      } else {
        params.delete('maxPrice');
      }
      
      // Reset to page 1 when filtering
      params.delete('page');
      
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [debouncedMin, debouncedMax, pathname, router, searchParams]);

  const clearPrices = useCallback(() => {
    setMinPrice('');
    setMaxPrice('');
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const hasActiveFilter = minPrice || maxPrice;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-secondary-900">Cena</h3>
        {hasActiveFilter && (
          <button 
            onClick={clearPrices}
            className="text-xs text-primary-500 hover:text-primary-600"
          >
            Wyczyść
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder={priceRange ? `${priceRange.min}` : 'min'}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          min={0}
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          placeholder={priceRange ? `${priceRange.max}` : 'max'}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          min={0}
        />
      </div>
      
      {priceRange && priceRange.min > 0 && priceRange.max > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Zakres: {priceRange.min.toLocaleString()} - {priceRange.max.toLocaleString()} zł
        </p>
      )}
    </div>
  );
}
