import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroBanner from '../components/HeroBanner';
import Newsletter from '../components/Newsletter';
import FeaturedCarousel from '../components/FeaturedCarousel';
import BestsellersCarousel from '../components/BestsellersCarousel';
import ToysCarousel from '../components/ToysCarousel';
import SeasonalCarousel from '../components/SeasonalCarousel';
import NewProductsCarousel from '../components/NewProductsCarousel';
import Link from 'next/link';

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container-custom py-6">
        {/* Hero Banner Section */}
        <HeroBanner />

        {/* Carousels Section */}
        <FeaturedCarousel />
        <BestsellersCarousel />
        <NewProductsCarousel />
        <ToysCarousel />
        <SeasonalCarousel />

        {/* Show More Button */}
        <div className="flex justify-center mb-10">
          <Link 
            href="/products"
            className="px-8 py-3 border border-secondary-300 rounded-lg text-secondary-700 font-medium hover:bg-gray-50 transition-colors"
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