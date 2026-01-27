'use client';

import { useRef, useState, useEffect } from 'react';
import ProductCard from './ProductCard';

// Simple SVG icons
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: any[];
  viewAllLink?: string;
  viewAllText?: string;
  accentColor?: string;
  icon?: React.ReactNode;
}

export default function ProductCarousel({
  title,
  subtitle,
  products,
  viewAllLink,
  viewAllText = 'Zobacz wszystkie',
  accentColor = 'from-gray-600 to-gray-800',
  icon,
}: ProductCarouselProps) {
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

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="my-8">
      <div className="container-custom">
        {/* Modern card wrapper */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header with gradient accent */}
          <div className={`bg-gradient-to-r ${accentColor} px-6 py-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white text-xl">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
                  {subtitle && (
                    <p className="text-white/80 text-sm mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              {viewAllLink && (
                <a
                  href={viewAllLink}
                  className="hidden sm:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
                >
                  {viewAllText}
                  <ChevronRightIcon className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Products carousel */}
          <div className="relative group px-4 py-6">
            {/* Left scroll button */}
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 shadow-xl border border-gray-200 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                aria-label="Przewiń w lewo"
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {/* Products container */}
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scroll-smooth px-2 pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="flex-shrink-0 w-[200px] md:w-[220px] transition-transform duration-200 hover:scale-[1.02]"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Right scroll button */}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 shadow-xl border border-gray-200 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                aria-label="Przewiń w prawo"
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>

          {/* Mobile view all link */}
          {viewAllLink && (
            <div className="sm:hidden border-t border-gray-100 px-6 py-4">
              <a
                href={viewAllLink}
                className={`flex items-center justify-center gap-2 bg-gradient-to-r ${accentColor} text-white font-medium px-4 py-3 rounded-xl transition-all duration-200 hover:shadow-lg`}
              >
                {viewAllText}
                <ChevronRightIcon className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
