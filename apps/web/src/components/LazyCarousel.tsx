'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';

interface LazyCarouselProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
}

/**
 * Lazy loading wrapper for carousels - only loads content when near viewport
 * Improves initial page load performance by deferring below-fold content
 */
export default function LazyCarousel({ 
  children, 
  fallback,
  rootMargin = '200px' // Start loading 200px before entering viewport
}: LazyCarouselProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  // Default skeleton fallback
  const defaultFallback = (
    <section className="py-4 sm:py-6 md:py-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-200 dark:bg-secondary-700 rounded-lg sm:rounded-xl animate-pulse"></div>
        <div className="h-4 sm:h-5 bg-gray-200 dark:bg-secondary-700 rounded w-28 sm:w-40 animate-pulse"></div>
      </div>
      <div className="flex gap-2.5 sm:gap-3 md:gap-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 w-[145px] xs:w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] h-[200px] sm:h-[240px] md:h-[280px] bg-gray-100 dark:bg-secondary-800 rounded-xl sm:rounded-2xl animate-pulse"
          />
        ))}
      </div>
    </section>
  );

  return (
    <div ref={containerRef}>
      {isVisible ? children : (fallback || defaultFallback)}
    </div>
  );
}
