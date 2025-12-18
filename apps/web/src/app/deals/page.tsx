'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { Product } from '../../lib/api';

// Category pills
const categoryPills = [
  { id: 'all', label: 'Wszystkie kategorie', icon: 'grid' },
  { id: 'fashion', label: 'Moda', icon: 'fashion' },
  { id: 'electronics', label: 'Elektronika', icon: 'electronics' },
  { id: 'home', label: 'Dom i Ogród', icon: 'home' },
  { id: 'sports', label: 'Sport', icon: 'sports' },
  { id: 'kids', label: 'Dziecko', icon: 'kids' },
  { id: 'automotive', label: 'Motoryzacja', icon: 'automotive' },
];

// Sidebar categories
const sidebarCategories = [
  { name: 'Komputery', count: 2034 },
  { name: 'Telefony', count: 1240 },
  { name: 'AGD', count: 890 },
  { name: 'Narzędzia', count: 560 },
  { name: 'Zabawki', count: 430 },
];

// Top discounts products
const topDiscounts = [
  {
    id: '1',
    name: 'Słuchawki bezprzewodowe z ANC Premium...',
    price: '549.00',
    compareAtPrice: '929.00',
    discount: 41,
    rating: 4.8,
    reviewCount: 1200,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
  },
  {
    id: '2',
    name: 'Aparat natychmiastowy - Edycja Vintage',
    price: '249.00',
    compareAtPrice: '489.00',
    discount: 50,
    rating: 4.9,
    reviewCount: 560,
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300',
  },
  {
    id: '3',
    name: 'Doniczka ceramiczna z sukulentem',
    price: '49.00',
    compareAtPrice: '99.00',
    discount: 50,
    rating: 4.5,
    reviewCount: 89,
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300',
  },
  {
    id: '4',
    name: 'Nike Air Czerwone Sportowe - Limitowana edycja',
    price: '349.00',
    compareAtPrice: '729.00',
    discount: 52,
    rating: 4.7,
    reviewCount: 320,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300',
  },
  {
    id: '5',
    name: 'Dell UltraSharp 27" Monitor 4K',
    price: '999.00',
    compareAtPrice: '1679.00',
    discount: 41,
    rating: 4.6,
    reviewCount: 230,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300',
  },
  {
    id: '6',
    name: 'Minimalistyczny biały zegarek na rękę',
    price: '199.00',
    compareAtPrice: '489.00',
    discount: 42,
    rating: 4.3,
    reviewCount: 112,
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300',
  },
];

// Trending products
const trendingProducts = [
  {
    id: '10',
    name: 'Klasyczny zegarek analogowy czarna skóra',
    price: '599.00',
    compareAtPrice: '799.00',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    badge: 'super-price',
  },
  {
    id: '11',
    name: 'DJI Mini 2 SE Dron Quadcopter',
    price: '1149.00',
    compareAtPrice: '1349.00',
    discount: 15,
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400',
  },
  {
    id: '12',
    name: 'Chanel Coco Mademoiselle Woda perfumowana',
    price: '489.00',
    compareAtPrice: '599.00',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400',
  },
  {
    id: '13',
    name: 'Sony WH-1000XM4 z redukcją szumów',
    price: '1199.00',
    compareAtPrice: '1399.00',
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400',
    badge: 'bestseller',
    deliveryInfo: 'WYSYŁKA W 3 DNI',
  },
  {
    id: '14',
    name: 'Breville Barista Express Ekspres do kawy',
    price: '2399.00',
    compareAtPrice: '2799.00',
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400',
  },
  {
    id: '15',
    name: 'Fitbit Charge 5 Zaawansowany tracker fitness',
    price: '419.00',
    compareAtPrice: '599.00',
    discount: 30,
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
  },
  {
    id: '16',
    name: 'Philips Sonicare ProtectiveClean 5100',
    price: '239.00',
    compareAtPrice: '359.00',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
  },
  {
    id: '17',
    name: 'MacBook Air M1 256GB Złoty',
    price: '3599.00',
    compareAtPrice: '3999.00',
    discount: 10,
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400',
  },
];

// Deal of the day
const dealOfDay = {
  name: 'Apple Watch Series 9 GPS 41mm aluminiowa koperta',
  price: '329.00',
  compareAtPrice: '499.00',
  image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400',
  sold: 75,
  available: 12,
};

function CategoryIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'grid':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case 'fashion':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'electronics':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'home':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'sports':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'kids':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'automotive':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-6 4h4M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function DealsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-custom py-6">
        {/* Hero Section */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Summer Clearance Banner */}
          <div className="col-span-2 relative bg-gradient-to-r from-amber-600 to-yellow-500 rounded-2xl overflow-hidden h-64">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-700/90 to-transparent z-10"></div>
            <img
              src="https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800"
              alt="Summer Sale"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="relative z-20 p-8 h-full flex flex-col justify-center">
              <span className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded mb-4 w-fit">
                MEGA KAMPANIA
              </span>
              <h1 className="text-4xl font-bold text-white mb-2">Letnia</h1>
              <h2 className="text-4xl font-bold text-white mb-4">Wyprzedaż</h2>
              <p className="text-white/90 mb-6 max-w-xs">
                Do 70% zniżki na wybraną elektronikę, modę i artykuły domowe. Nie przegap!
              </p>
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-lg w-fit transition-colors">
                Sprawdź oferty
              </button>
            </div>
          </div>

          {/* Deal of the Day */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-900">Okazja dnia</span>
              </div>
              <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded">Kończy się</span>
            </div>

            <div className="relative mb-4">
              <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 z-10">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
                <img
                  src={dealOfDay.image}
                  alt={dealOfDay.name}
                  className="w-full h-full object-contain p-4"
                />
              </div>
            </div>

            <h3 className="text-sm text-gray-900 text-center mb-3">{dealOfDay.name}</h3>

            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-2xl font-bold text-orange-500">${dealOfDay.price}</span>
              <span className="text-sm text-gray-400 line-through">${dealOfDay.compareAtPrice}</span>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${dealOfDay.sold}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Sprzedano: {dealOfDay.sold}%</span>
              <span>Dostępnych: {dealOfDay.available}</span>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
          {categoryPills.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <CategoryIcon icon={cat.icon} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Top Discounts Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">Top Zniżki</h2>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                +50% TANIEJ
              </span>
            </div>
            <Link href="/deals/discounts" className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">
              Zobacz wszystkie
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-6 gap-4">
            {topDiscounts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="group">
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-square bg-gray-50 p-3">
                    {product.discount && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded z-10">
                        -{product.discount}%
                      </span>
                    )}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs text-gray-700 line-clamp-2 mb-2 min-h-[2rem]">{product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs text-gray-500">{product.rating} ({product.reviewCount})</span>
                    </div>
                    <div className="text-xs text-gray-400 line-through">${product.compareAtPrice}</div>
                    <div className="text-base font-bold text-orange-500">${product.price}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="w-56 shrink-0">
            {/* Categories */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
              <h3 className="font-semibold text-gray-900 mb-4">Kategorie</h3>
              <div className="space-y-3">
                {sidebarCategories.map((cat) => (
                  <label key={cat.name} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      checked={selectedFilters.includes(cat.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFilters([...selectedFilters, cat.name]);
                        } else {
                          setSelectedFilters(selectedFilters.filter(f => f !== cat.name));
                        }
                      }}
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">
                      {cat.name} <span className="text-gray-400">({cat.count})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
              <h3 className="font-semibold text-gray-900 mb-4">Cena</h3>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Od"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="text"
                  placeholder="Do"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                Zastosuj
              </button>
            </div>
          </aside>

          {/* Trending Products */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Popularne teraz</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sortuj:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="relevance">Trafność</option>
                  <option value="price-low">Cena: od najniższej</option>
                  <option value="price-high">Cena: od najwyższej</option>
                  <option value="newest">Najnowsze</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              {trendingProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`} className="group">
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square bg-gray-50 p-4">
                      {product.badge === 'super-price' && (
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10 uppercase">
                          Super Cena
                        </span>
                      )}
                      {product.badge === 'bestseller' && (
                        <span className="absolute top-2 left-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10 uppercase">
                          Bestseller
                        </span>
                      )}
                      {product.discount && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10">
                          -{product.discount}%
                        </span>
                      )}
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm text-gray-700 line-clamp-2 mb-2 min-h-[2.5rem]">{product.name}</h3>
                      {product.compareAtPrice && (
                        <div className="text-xs text-gray-400 line-through">${product.compareAtPrice}</div>
                      )}
                      <div className="text-lg font-bold text-orange-500">${product.price}</div>
                      {product.deliveryInfo && (
                        <div className="text-[10px] text-gray-500 mt-1 uppercase">{product.deliveryInfo}</div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Show More Button */}
            <div className="text-center">
              <button className="px-8 py-3 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                Pokaż więcej ofert
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container-custom py-10">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">WBTrade Okazje</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">O nas</Link></li>
                <li><Link href="/careers" className="text-sm text-gray-500 hover:text-gray-700">Kariera</Link></li>
                <li><Link href="/press" className="text-sm text-gray-500 hover:text-gray-700">Dla prasy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Pomoc</h4>
              <ul className="space-y-2">
                <li><Link href="/shipping" className="text-sm text-gray-500 hover:text-gray-700">Dostawa i zwroty</Link></li>
                <li><Link href="/order-status" className="text-sm text-gray-500 hover:text-gray-700">Status zamówienia</Link></li>
                <li><Link href="/payment" className="text-sm text-gray-500 hover:text-gray-700">Metody płatności</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Dla sprzedających</h4>
              <ul className="space-y-2">
                <li><Link href="/sell" className="text-sm text-gray-500 hover:text-gray-700">Sprzedawaj na WBTrade</Link></li>
                <li><Link href="/advertising" className="text-sm text-gray-500 hover:text-gray-700">Reklama</Link></li>
                <li><Link href="/seller-center" className="text-sm text-gray-500 hover:text-gray-700">Centrum sprzedawcy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Aplikacja</h4>
              <div className="flex gap-2">
                <button className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg hover:bg-gray-800">
                  App Store
                </button>
                <button className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg hover:bg-gray-800">
                  Google Play
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 flex items-center justify-between text-sm text-gray-500">
            <span>© 2025 WBTrade. Wszelkie prawa zastrzeżone.</span>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-gray-700">Polityka prywatności</Link>
              <Link href="/terms" className="hover:text-gray-700">Regulamin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
