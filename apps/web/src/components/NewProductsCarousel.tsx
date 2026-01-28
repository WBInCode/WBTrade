'use client';

import { useEffect, useState, useRef } from 'react';
import ProductCard from './ProductCard';
import { productsApi, Product } from '@/lib/api';

interface NewProductsCarouselProps {
  limit?: number;
  days?: number; // How many days back to look (default 14)
}

export default function NewProductsCarousel({ 
  limit = 20, 
  days = 14 
}: NewProductsCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Use new products endpoint - products from last 14 days
        const response = await productsApi.getNewProducts({ limit, days });
        setProducts(response.products);
      } catch (error) {
        console.error('Error fetching new products:', error);
        // Fallback: fetch newest products using regular endpoint
        try {
          const fallback = await productsApi.getAll({ limit, sort: 'newest' });
          setProducts(fallback.products);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit, days]);

  if (loading) {
    return (
      <section className="my-8">
        <div className="container-custom">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
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
    <section className="my-8">
      <div className="container-custom">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header with gradient accent */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white text-xl">
                  ✨
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Nowości</h2>
                  <p className="text-sm text-white/80">
                    {products.length > 0 
                      ? "Produkty dodane w ostatnich 2 tygodniach" 
                      : "Brak nowych produktów w ostatnich 2 tygodniach"}
                  </p>
                </div>
              </div>
              <a
                href="/products?sort=newest"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Zobacz wszystkie
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            </div>
          </div>
          
          {/* Products or empty state */}
          <div className="p-6 relative">
            {products.length > 0 ? (
              <>
                {/* Scroll buttons */}
                {canScrollLeft && (
                  <button
                    onClick={() => scroll('left')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                )}
                {canScrollRight && (
                  <button
                    onClick={() => scroll('right')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )}
                
                {/* Products scroll container */}
                <div
                  ref={scrollContainerRef}
                  className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {products.map((product) => (
                    <div key={product.id} className="flex-shrink-0 w-[220px]">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-lg font-medium">Brak nowych produktów</p>
                <p className="text-sm">Produkty dodane w ostatnich 2 tygodniach pojawią się tutaj</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
