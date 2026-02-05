import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroBanner from '../components/HeroBanner';
import Newsletter from '../components/Newsletter';
import FeaturedCarousel from '../components/FeaturedCarousel';
import BestsellersCarousel from '../components/BestsellersCarousel';
import ToysCarousel from '../components/ToysCarousel';
import SeasonalCarousel from '../components/SeasonalCarousel';
import NewProductsCarousel from '../components/NewProductsCarousel';
import LazyCarousel from '../components/LazyCarousel';
import Link from 'next/link';

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
      <Header />
      
      <main className="container-custom py-6">
        {/* Hero Banner Section */}
        <HeroBanner />

        {/* First carousel loads immediately (above the fold) */}
        <FeaturedCarousel />
        
        {/* Below-fold carousels use lazy loading */}
        <LazyCarousel>
          <BestsellersCarousel />
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

        {/* Show More Button */}
        <div className="flex justify-center mb-10">
          <Link 
            href="/products"
            className="px-8 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg text-secondary-700 dark:text-secondary-300 font-medium hover:bg-gray-50 dark:hover:bg-secondary-800 transition-colors"
          >
            Pokaż więcej produktów
          </Link>
        </div>

        {/* Newsletter Section */}
        <Newsletter />
      </main>

      <Footer />
    </div>
  );
}