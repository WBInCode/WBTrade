import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import HeroBanner from '../components/HeroBanner';
import Newsletter from '../components/Newsletter';
import RecommendedProducts from '../components/RecommendedProducts';
import { productsApi, Product } from '../lib/api';
import Link from 'next/link';

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic';

// Demo products for Super Price section (when API has no products)
const demoSuperPriceProducts: Product[] = [
  {
    id: 'demo-1',
    name: 'Profesjonalne słuchawki bezprzewodowe z redukcją szumów',
    price: '129',
    compareAtPrice: '215',
    images: [{ id: 'demo-1-img-1', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300', alt: 'Słuchawki', order: 0 }],
    status: 'active',
  },
  {
    id: 'demo-2',
    name: 'Mysz gamingowa Pro RGB z czujnikiem High DPI',
    price: '45',
    compareAtPrice: '69',
    images: [{ id: 'demo-2-img-1', url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300', alt: 'Mysz gamingowa', order: 0 }],
    status: 'active',
  },
  {
    id: 'demo-3',
    name: 'Smartwatch Series 5 wodoodporny z GPS',
    price: '199',
    compareAtPrice: '299',
    images: [{ id: 'demo-3-img-1', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300', alt: 'Smartwatch', order: 0 }],
    status: 'active',
  },
  {
    id: 'demo-4',
    name: 'Buty sportowe do biegania czerwone limitowana edycja',
    price: '89',
    compareAtPrice: '159',
    images: [{ id: 'demo-4-img-1', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300', alt: 'Buty sportowe', order: 0 }],
    status: 'active',
  },
  {
    id: 'demo-5',
    name: 'Automatyczny ekspres do kawy ze spieniaczem mleka',
    price: '350',
    compareAtPrice: '450',
    images: [{ id: 'demo-5-img-1', url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=300', alt: 'Ekspres do kawy', order: 0 }],
    status: 'active',
  },
];

// Demo recommended products
const demoRecommendedProducts: Product[] = [
  {
    id: 'rec-1',
    name: 'Bawełniane T-shirty zestaw 3 szt. czarny biały szary',
    price: '25',
    images: [{ id: 'rec-1-img-1', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300', alt: 'Koszulki', order: 0 }],
    status: 'active',
  },
  {
    id: 'rec-2',
    name: 'Przenośny głośnik Bluetooth wodoodporny IPX7',
    price: '45',
    images: [{ id: 'rec-2-img-1', url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300', alt: 'Głośnik', order: 0 }],
    status: 'active',
  },
  {
    id: 'rec-3',
    name: 'Minimalistyczna lampka biurkowa LED z ładowaniem bezprzewodowym',
    price: '39.99',
    images: [{ id: 'rec-3-img-1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', alt: 'Lampka biurkowa', order: 0 }],
    status: 'active',
  },
  {
    id: 'rec-4',
    name: 'Buty do biegania lekkie z amortyzacją - czarne',
    price: '79.99',
    images: [{ id: 'rec-4-img-1', url: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=300', alt: 'Buty do biegania', order: 0 }],
    status: 'active',
  },
  {
    id: 'rec-5',
    name: 'Serum do twarzy z witaminą C 20% - rozświetlające',
    price: '19.99',
    images: [{ id: 'rec-5-img-1', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300', alt: 'Serum', order: 0 }],
    status: 'active',
  },
  {
    id: 'rec-6',
    name: 'Bestseller książka - thriller kryminalny nowość 2024',
    price: '12.99',
    images: [{ id: 'rec-6-img-1', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300', alt: 'Książka', order: 0 }],
    status: 'active',
  },
];

export default async function HomePage() {
  let products: Product[] = [];
  let superPriceProducts: Product[] = [];
  
  try {
    const response = await productsApi.getAll({ limit: 12 });
    products = response.products;
    superPriceProducts = products.slice(0, 5);
  } catch (error) {
    console.error('Failed to fetch products:', error);
  }

  // Use demo products if API returns empty
  const displaySuperPriceProducts = superPriceProducts.length > 0 ? superPriceProducts : demoSuperPriceProducts;
  const displayProducts = products.length > 0 ? products : demoRecommendedProducts;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container-custom py-6">
        {/* Hero Banner Section */}
        <HeroBanner />

        {/* Super Price Section */}
        <section className="mb-10 bg-gradient-to-r from-primary-500 to-orange-500 rounded-xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Super Cena</h2>
                  <p className="text-white/80 text-sm">Najlepsze oferty specjalnie dla Ciebie</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
              </div>
            </div>
            <Link 
              href="/products?sale=true"
              className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
              Zobacz wszystkie oferty
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displaySuperPriceProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>

        {/* Recommended For You Section */}
        {/* <RecommendedProducts initialProducts={displayProducts} /> */}

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