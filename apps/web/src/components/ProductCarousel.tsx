'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';

// Simple SVG icons
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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
  compact?: boolean; // For embedded use in cards/containers (cart page, etc.)
}

export default function ProductCarousel({
  title,
  subtitle,
  products,
  viewAllLink,
  viewAllText = 'Zobacz wszystkie',
  accentColor = 'orange',
  icon,
  compact = false,
}: ProductCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      // Calculate progress
      const maxScroll = scrollWidth - clientWidth;
      setScrollProgress(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.querySelector('div')?.offsetWidth || 200;
      const scrollAmount = cardWidth * 2;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <section className={compact ? "py-2 sm:py-3" : "py-4 sm:py-6 md:py-8"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {icon && (
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 dark:bg-primary-900/50 rounded-xl flex items-center justify-center text-base sm:text-xl">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h2>
            {subtitle && (
              <p className="text-[11px] sm:text-sm text-gray-500 dark:text-secondary-400 truncate hidden xs:block">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
          {/* Navigation buttons - hidden on small mobile, visible on larger */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-white dark:bg-secondary-800 text-gray-700 dark:text-secondary-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:shadow-none disabled:bg-gray-100 dark:disabled:bg-secondary-700 disabled:text-gray-300 dark:disabled:text-secondary-500 disabled:scale-100 transition-all duration-150"
              aria-label="Przewiń w lewo"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-white dark:bg-secondary-800 text-gray-700 dark:text-secondary-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:shadow-none disabled:bg-gray-100 dark:disabled:bg-secondary-700 disabled:text-gray-300 dark:disabled:text-secondary-500 disabled:scale-100 transition-all duration-150"
              aria-label="Przewiń w prawo"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* View all link - desktop only */}
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="hidden lg:flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm ml-2"
            >
              {viewAllText}
              <ChevronRightIcon className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Products carousel */}
      <div className={compact ? "relative" : "relative -mx-4 sm:-mx-6 md:mx-0"}>
        <div
          ref={scrollContainerRef}
          className={`flex gap-2.5 sm:gap-3 md:gap-4 overflow-x-auto scroll-smooth pb-3 snap-x snap-mandatory ${compact ? "" : "px-4 sm:px-6 md:px-0"}`}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {products.map((product, index) => (
            <div 
              key={`${product.id}-${index}`} 
              className={compact 
                ? "flex-shrink-0 w-[130px] xs:w-[145px] sm:w-[160px] md:w-[180px] lg:w-[200px] snap-start"
                : "flex-shrink-0 w-[145px] xs:w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] snap-start"
              }
            >
              <ProductCard product={product} showWishlist={true} showAddToCart={true} />
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 bg-gray-200 dark:bg-secondary-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(8, scrollProgress)}%` }}
        />
      </div>

      {/* Mobile view all link */}
      {viewAllLink && (
        <Link
          href={viewAllLink}
          className="lg:hidden flex items-center justify-center gap-1.5 mt-3 py-2.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl font-medium text-sm hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
        >
          {viewAllText}
          <ChevronRightIcon className="w-4 h-4" />
        </Link>
      )}
    </section>
  );
}
