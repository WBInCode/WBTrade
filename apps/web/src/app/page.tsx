import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import HeroBanner from '../components/HeroBanner';
import CountdownTimer from '../components/CountdownTimer';
import { productsApi, Product } from '../lib/api';
import Link from 'next/link';

// Category icons data
const categoryIcons = [
  { name: 'Telefony', icon: '📱', href: '/products?category=phones' },
  { name: 'Moda', icon: '👕', href: '/products?category=fashion' },
  { name: 'Dom', icon: '🏠', href: '/products?category=home' },
  { name: 'Sport', icon: '⚽', href: '/products?category=sport' },
  { name: 'Dziecko', icon: '👶', href: '/products?category=kids' },
  { name: 'Auto', icon: '🚗', href: '/products?category=auto' },
  { name: 'Zwierzęta', icon: '🐕', href: '/products?category=pets' },
  { name: 'Narzędzia', icon: '🔧', href: '/products?category=tools' },
];

// Brand logos
const brands = ['SAMSUNG', 'adidas', 'LEGO', 'SONY', 'PHILIPS', 'BOSCH', 'NIKE', 'XIAOMI', 'APPLE'];

// Demo products for Super Price section (when API has no products)
const demoSuperPriceProducts: Product[] = [
  {
    id: 'demo-1',
    name: 'Profesjonalne słuchawki bezprzewodowe z redukcją szumów',
    price: '129',
    compareAtPrice: '215',
    images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300', alt: 'Słuchawki' }],
    status: 'active',
  },
  {
    id: 'demo-2',
    name: 'Mysz gamingowa Pro RGB z czujnikiem High DPI',
    price: '45',
    compareAtPrice: '69',
    images: [{ url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300', alt: 'Mysz gamingowa' }],
    status: 'active',
  },
  {
    id: 'demo-3',
    name: 'Smartwatch Series 5 wodoodporny z GPS',
    price: '199',
    compareAtPrice: '299',
    images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300', alt: 'Smartwatch' }],
    status: 'active',
  },
  {
    id: 'demo-4',
    name: 'Buty sportowe do biegania czerwone limitowana edycja',
    price: '89',
    compareAtPrice: '159',
    images: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300', alt: 'Buty sportowe' }],
    status: 'active',
  },
  {
    id: 'demo-5',
    name: 'Automatyczny ekspres do kawy ze spieniaczem mleka',
    price: '350',
    compareAtPrice: '450',
    images: [{ url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=300', alt: 'Ekspres do kawy' }],
    status: 'active',
  },
];

// Demo recommended products
const demoRecommendedProducts: Product[] = [
  {
    id: 'rec-1',
    name: 'Bawełniane T-shirty zestaw 3 szt. czarny biały szary',
    price: '25',
    images: [{ url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300', alt: 'Koszulki' }],
    status: 'active',
  },
  {
    id: 'rec-2',
    name: 'Przenośny głośnik Bluetooth wodoodporny IPX7',
    price: '45',
    images: [{ url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300', alt: 'Głośnik' }],
    status: 'active',
  },
  {
    id: 'rec-3',
    name: 'Minimalistyczna lampka biurkowa LED z ładowaniem bezprzewodowym',
    price: '39.99',
    images: [{ url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', alt: 'Lampka biurkowa' }],
    status: 'active',
  },
  {
    id: 'rec-4',
    name: 'Buty do biegania Ultraboost męskie rozmiar 43',
    price: '110',
    images: [{ url: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=300', alt: 'Buty do biegania' }],
    status: 'active',
  },
  {
    id: 'rec-5',
    name: 'Serum z witaminą C do twarzy rozjaśniające 50ml',
    price: '15.50',
    images: [{ url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300', alt: 'Serum' }],
    status: 'active',
  },
  {
    id: 'rec-6',
    name: 'Atomowe nawyki James Clear twarda oprawa',
    price: '18',
    images: [{ url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300', alt: 'Książka' }],
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

        {/* Category Icons */}
        <section className="flex justify-center gap-2 sm:gap-4 lg:gap-8 py-6 mb-8 overflow-x-auto scrollbar-hide">
          {categoryIcons.map((category) => (
            <Link 
              key={category.name}
              href={category.href}
              className="flex flex-col items-center gap-2 p-2 sm:p-3 hover:bg-gray-100 rounded-xl transition-colors group min-w-[60px]"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 group-hover:bg-primary-50 flex items-center justify-center transition-colors text-2xl">
                {category.icon}
              </div>
              <span className="text-xs text-secondary-600 group-hover:text-secondary-900 text-center whitespace-nowrap">
                {category.name}
              </span>
            </Link>
          ))}
        </section>

        {/* Super Price Section */}
        <section className="mb-10 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <h2 className="text-xl font-bold text-secondary-900">Super Cena</h2>
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded">HIT</span>
              <div className="hidden sm:flex items-center gap-2 text-sm text-secondary-500">
                <span>Oferta kończy się za</span>
                <CountdownTimer />
              </div>
            </div>
            <Link 
              href="/products?sale=true"
              className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              Zobacz wszystkie
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displaySuperPriceProducts.map((product) => (
              <ProductCard key={product.id} product={product} showDelivery />
            ))}
          </div>
        </section>

        {/* Official Stores / Brands */}
        <section className="mb-10 py-6 border-y border-gray-200">
          <h3 className="text-sm font-medium text-secondary-500 mb-4">Oficjalne sklepy</h3>
          <div className="flex items-center justify-between gap-6 overflow-x-auto scrollbar-hide">
            {brands.map((brand) => (
              <Link 
                key={brand}
                href={`/products?brand=${brand.toLowerCase()}`}
                className="text-lg font-bold text-secondary-400 hover:text-secondary-700 transition-colors whitespace-nowrap"
              >
                {brand}
              </Link>
            ))}
          </div>
        </section>

        {/* Recommended For You Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-secondary-900">Polecane dla Ciebie</h2>
            <div className="hidden sm:flex items-center gap-2">
              <button className="px-4 py-2 text-sm font-medium text-secondary-900 bg-gray-100 rounded-lg">
                Wszystkie
              </button>
              <button className="px-4 py-2 text-sm text-secondary-500 hover:bg-gray-50 rounded-lg">
                Bestsellery
              </button>
              <button className="px-4 py-2 text-sm text-secondary-500 hover:bg-gray-50 rounded-lg">
                Nowości
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          {/* Show More Button */}
          <div className="flex justify-center mt-8">
            <Link 
              href="/products"
              className="px-8 py-3 border border-secondary-300 rounded-lg text-secondary-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Pokaż więcej produktów
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}