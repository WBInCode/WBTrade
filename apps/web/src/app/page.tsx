import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroBanner from '../components/HeroBanner';
import Newsletter from '../components/Newsletter';
import FeaturedCarousel from '../components/FeaturedCarousel';
import BelowFoldCarousels from '../components/BelowFoldCarousels';
import Link from 'next/link';
import { serverFetch, REVALIDATE } from '../lib/server-api';

// ISR: regenerate homepage every 2 minutes instead of force-dynamic on every request
export const revalidate = 120;

export default async function HomePage() {
  // Pre-fetch above-fold data server-side — no client waterfall
  let featuredProducts: any[] = [];
  try {
    const res = await serverFetch<{ products: any[] }>('/products/featured?limit=20', {
      revalidate: REVALIDATE.PRODUCTS,
      tags: ['products', 'featured'],
    });
    featuredProducts = res.products;
  } catch (e) {
    // Fallback to client-side fetch if server fetch fails
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
      <Header />
      
      <main className="container-custom py-6">
        {/* Hero Banner Section */}
        <HeroBanner />

        {/* First carousel loads with server-fetched data (above the fold) */}
        <FeaturedCarousel initialProducts={featuredProducts} />
        
        {/* Below-fold carousels use lazy loading */}
        <BelowFoldCarousels />

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