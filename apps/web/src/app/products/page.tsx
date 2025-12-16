import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductListCard from '../../components/ProductListCard';
import ProductListHeader from '../../components/ProductListHeader';
import Pagination from '../../components/Pagination';
import Breadcrumb from '../../components/Breadcrumb';
import { CategoryFilter, DeliveryFilter, PriceFilter, BrandFilter, RamFilter } from '../../components/filters';
import { productsApi, Product } from '../../lib/api';

// Demo categories
const categories = [
  { 
    name: 'Laptopy', 
    slug: 'laptops',
    children: [
      { name: 'Laptopy gamingowe', slug: 'gaming-laptops' },
      { name: 'Ultrabooki', slug: 'ultrabooks' },
      { name: '2 w 1', slug: '2-in-1s' },
      { name: 'Laptopy biznesowe', slug: 'business-laptops' },
    ]
  }
];

// Demo products for product list
const demoProducts: Product[] = [
  {
    id: 'laptop-1',
    name: 'Lenovo Legion 5 Pro 16ACH6H Ryzen 7 5800H 16GB 1TB...',
    price: '1399',
    compareAtPrice: '1599',
    images: [{ url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'Laptop' }],
    status: 'active',
    badge: 'super-price',
    rating: '4.5',
    reviewCount: 128,
    storeName: 'TechStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-2',
    name: 'Dell XPS 15 9520 i7-12700H 32GB 1TB SSD RTX3050Ti...',
    price: '2199',
    compareAtPrice: '2499',
    images: [{ url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'Dell XPS' }],
    status: 'active',
    rating: '4.7',
    reviewCount: 45,
    storeName: 'OfficialDell',
    hasSmart: true,
    deliveryInfo: 'dostawa za 2 dni',
  },
  {
    id: 'laptop-3',
    name: 'Apple iPad Pro 12.9 M2 Wi-Fi 256GB Gwiezdna szarość',
    price: '1099',
    images: [{ url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400', alt: 'iPad Pro' }],
    status: 'active',
    badge: 'bestseller',
    rating: '4.9',
    reviewCount: 850,
    storeName: 'AppleStore',
    hasSmart: false,
    deliveryInfo: 'Darmowa dostawa',
  },
  {
    id: 'laptop-4',
    name: 'Razer BlackWidow V3 Green Switch klawiatura mechaniczna',
    price: '89',
    compareAtPrice: '129',
    images: [{ url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400', alt: 'Klawiatura' }],
    status: 'active',
    badge: 'outlet',
    rating: '4.2',
    reviewCount: 42,
    storeName: 'GamingGear',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-5',
    name: 'Logitech G Pro X Superlight mysz bezprzewodowa gaming',
    price: '149',
    images: [{ url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', alt: 'Mysz' }],
    status: 'active',
    rating: '4.6',
    reviewCount: 2180,
    storeName: 'LogitechOfficial',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-6',
    name: 'ASUS ROG Zephyrus G14 GA401QM Ryzen 9 5900HS',
    price: '1450',
    images: [{ url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'ASUS ROG' }],
    status: 'active',
    badge: 'bestseller',
    rating: '4.8',
    reviewCount: 84,
    storeName: 'ASUSStore',
    hasSmart: true,
    deliveryInfo: 'dostawa za 3 dni',
  },
  {
    id: 'laptop-7',
    name: 'LG UltraGear 27GP850-B NanoIPS 165Hz 1ms',
    price: '399',
    images: [{ url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', alt: 'Monitor' }],
    status: 'active',
    rating: '4.4',
    reviewCount: 341,
    storeName: 'LGOfficial',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-8',
    name: 'Sony WH-1000XM4 słuchawki bezprzewodowe ANC...',
    price: '278',
    images: [{ url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400', alt: 'Słuchawki' }],
    status: 'active',
    rating: '4.9',
    reviewCount: 3289,
    storeName: 'SonyStore',
    hasSmart: false,
    deliveryInfo: 'darmowa dostawa',
  },
];

const breadcrumbItems = [
  { label: 'Strona główna', href: '/' },
  { label: 'Elektronika', href: '/products?category=electronics' },
  { label: 'Laptopy', href: '/products?category=laptops' },
  { label: 'Laptopy gamingowe' },
];

export default async function ProductsPage() {
  let products: Product[] = [];

  try {
    const response = await productsApi.getAll();
    products = response.products;
  } catch (err) {
    // Use demo products on error
  }

  // Use demo products if API returns empty
  const displayProducts = products.length > 0 ? products : demoProducts;
  const totalProducts = 1240; // Demo total

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container-custom py-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">
            Laptopy gamingowe{' '}
            <span className="text-secondary-400 font-normal text-lg">
              ({totalProducts.toLocaleString()} ofert)
            </span>
          </h1>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-24">
              <CategoryFilter categories={categories} currentCategory="gaming-laptops" />
              <DeliveryFilter />
              <PriceFilter />
              <BrandFilter />
              <RamFilter />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header with Tabs, Sort, View Toggle */}
            <ProductListHeader totalProducts={totalProducts} />

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayProducts.map((product) => (
                <ProductListCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            <Pagination currentPage={1} totalPages={15} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}