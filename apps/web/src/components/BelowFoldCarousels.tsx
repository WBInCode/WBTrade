'use client';

import dynamic from 'next/dynamic';
import LazyCarousel from './LazyCarousel';

// Lazy load below-fold carousels — JS is not downloaded until needed
const BestsellersCarousel = dynamic(() => import('./BestsellersCarousel'), { ssr: false });
const NewProductsCarousel = dynamic(() => import('./NewProductsCarousel'), { ssr: false });
const ToysCarousel = dynamic(() => import('./ToysCarousel'), { ssr: false });
const SeasonalCarousel = dynamic(() => import('./SeasonalCarousel'), { ssr: false });
const TopRatedCarousel = dynamic(() => import('./TopRatedCarousel'), { ssr: false });

export default function BelowFoldCarousels() {
  return (
    <>
      <LazyCarousel>
        <BestsellersCarousel />
      </LazyCarousel>

      <LazyCarousel>
        <TopRatedCarousel />
      </LazyCarousel>

      <LazyCarousel>
        <NewProductsCarousel />
      </LazyCarousel>

      <LazyCarousel>
        <ToysCarousel />
      </LazyCarousel>

      <LazyCarousel>
        <SeasonalCarousel />
      </LazyCarousel>
    </>
  );
}
