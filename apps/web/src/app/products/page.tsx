'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductListCard from '../../components/ProductListCard';
import ProductListHeader from '../../components/ProductListHeader';
import Pagination from '../../components/Pagination';
import Breadcrumb from '../../components/Breadcrumb';
import { CategoryFilter, DeliveryFilter, PriceFilter, BrandFilter, RamFilter } from '../../components/filters';
import { Product } from '../../lib/api';

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

// Extended demo products for pagination
const allDemoProducts: Product[] = [
  {
    id: 'laptop-1',
    name: 'Lenovo Legion 5 Pro 16ACH6H Ryzen 7 5800H 16GB 1TB RTX 3070',
    price: '1399',
    compareAtPrice: '1599',
    images: [{ id: 'laptop-1-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'Laptop', order: 0 }],
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
    name: 'Dell XPS 15 9520 i7-12700H 32GB 1TB SSD RTX3050Ti',
    price: '2199',
    compareAtPrice: '2499',
    images: [{ id: 'laptop-2-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'Dell XPS', order: 0 }],
    status: 'active',
    rating: '4.7',
    reviewCount: 45,
    storeName: 'OfficialDell',
    hasSmart: true,
    deliveryInfo: 'dostawa za 2 dni',
  },
  {
    id: 'laptop-3',
    name: 'Apple MacBook Pro 14 M3 Pro 18GB 512GB Space Gray',
    price: '8999',
    images: [{ id: 'laptop-3-img-1', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', alt: 'MacBook', order: 0 }],
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
    name: 'ASUS ROG Strix G15 G513RW Ryzen 9 6900HX RTX 3070 Ti',
    price: '6499',
    compareAtPrice: '7299',
    images: [{ id: 'laptop-4-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'ASUS ROG', order: 0 }],
    status: 'active',
    badge: 'outlet',
    rating: '4.6',
    reviewCount: 234,
    storeName: 'ASUSStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-5',
    name: 'HP Omen 16 i7-12700H 16GB 1TB RTX 3060 165Hz',
    price: '4599',
    images: [{ id: 'laptop-5-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'HP Omen', order: 0 }],
    status: 'active',
    rating: '4.4',
    reviewCount: 189,
    storeName: 'HPOfficial',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-6',
    name: 'ASUS ROG Zephyrus G14 GA402RK Ryzen 9 6900HS RX6800S',
    price: '7450',
    images: [{ id: 'laptop-6-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'ASUS ROG', order: 0 }],
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
    name: 'MSI Katana GF66 12UE i7-12700H 16GB RTX 3060',
    price: '3999',
    compareAtPrice: '4499',
    images: [{ id: 'laptop-7-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'MSI Katana', order: 0 }],
    status: 'active',
    rating: '4.3',
    reviewCount: 156,
    storeName: 'MSIGaming',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-8',
    name: 'Acer Nitro 5 AN515-58 i5-12500H 16GB RTX 3050',
    price: '3299',
    images: [{ id: 'laptop-8-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'Acer Nitro', order: 0 }],
    status: 'active',
    rating: '4.2',
    reviewCount: 312,
    storeName: 'AcerStore',
    hasSmart: true,
    deliveryInfo: 'darmowa dostawa',
  },
  {
    id: 'laptop-9',
    name: 'Lenovo IdeaPad Gaming 3 Ryzen 5 6600H RTX 3050',
    price: '2899',
    compareAtPrice: '3299',
    images: [{ id: 'laptop-9-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'Lenovo IdeaPad', order: 0 }],
    status: 'active',
    badge: 'super-price',
    rating: '4.1',
    reviewCount: 421,
    storeName: 'LenovoStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-10',
    name: 'Gigabyte AORUS 15 BKF i7-12700H RTX 4060 32GB',
    price: '5899',
    images: [{ id: 'laptop-10-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'Gigabyte AORUS', order: 0 }],
    status: 'active',
    rating: '4.5',
    reviewCount: 67,
    storeName: 'GigabyteOfficial',
    hasSmart: false,
    deliveryInfo: 'dostawa za 2 dni',
  },
  {
    id: 'laptop-11',
    name: 'Razer Blade 15 i7-12800H RTX 3080 Ti 32GB QHD 240Hz',
    price: '12999',
    images: [{ id: 'laptop-11-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'Razer Blade', order: 0 }],
    status: 'active',
    badge: 'bestseller',
    rating: '4.7',
    reviewCount: 89,
    storeName: 'RazerStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-12',
    name: 'Apple MacBook Air 15 M3 16GB 512GB Midnight',
    price: '6999',
    compareAtPrice: '7499',
    images: [{ id: 'laptop-12-img-1', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', alt: 'MacBook Air', order: 0 }],
    status: 'active',
    rating: '4.9',
    reviewCount: 234,
    storeName: 'AppleStore',
    hasSmart: false,
    deliveryInfo: 'Darmowa dostawa',
  },
  // Page 2
  {
    id: 'laptop-13',
    name: 'Dell G15 5525 Ryzen 7 6800H RTX 3060 16GB 512GB',
    price: '4299',
    images: [{ id: 'laptop-13-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'Dell G15', order: 0 }],
    status: 'active',
    rating: '4.4',
    reviewCount: 178,
    storeName: 'DellStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-14',
    name: 'MSI Pulse GL66 12UEK i7-12700H RTX 3060 16GB',
    price: '4799',
    compareAtPrice: '5299',
    images: [{ id: 'laptop-14-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'MSI Pulse', order: 0 }],
    status: 'active',
    badge: 'outlet',
    rating: '4.3',
    reviewCount: 92,
    storeName: 'MSIGaming',
    hasSmart: true,
    deliveryInfo: 'dostawa za 2 dni',
  },
  {
    id: 'laptop-15',
    name: 'ASUS TUF Gaming F15 FX507ZC i7-12700H RTX 3050',
    price: '3799',
    images: [{ id: 'laptop-15-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'ASUS TUF', order: 0 }],
    status: 'active',
    rating: '4.5',
    reviewCount: 256,
    storeName: 'ASUSStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-16',
    name: 'HP Victus 16 i5-12500H RTX 3050 8GB 512GB',
    price: '2999',
    compareAtPrice: '3499',
    images: [{ id: 'laptop-16-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'HP Victus', order: 0 }],
    status: 'active',
    badge: 'super-price',
    rating: '4.1',
    reviewCount: 345,
    storeName: 'HPStore',
    hasSmart: true,
    deliveryInfo: 'darmowa dostawa',
  },
  {
    id: 'laptop-17',
    name: 'Lenovo Legion 5i Pro i7-12700H RTX 3070 Ti 32GB',
    price: '6999',
    images: [{ id: 'laptop-17-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'Legion 5i Pro', order: 0 }],
    status: 'active',
    badge: 'bestseller',
    rating: '4.8',
    reviewCount: 123,
    storeName: 'LenovoStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-18',
    name: 'Acer Predator Helios 300 i7-12700H RTX 3070',
    price: '5499',
    images: [{ id: 'laptop-18-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'Predator Helios', order: 0 }],
    status: 'active',
    rating: '4.6',
    reviewCount: 201,
    storeName: 'AcerStore',
    hasSmart: false,
    deliveryInfo: 'dostawa za 3 dni',
  },
  {
    id: 'laptop-19',
    name: 'MSI Stealth GS77 i9-12900H RTX 3080 Ti 64GB',
    price: '14999',
    images: [{ id: 'laptop-19-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'MSI Stealth', order: 0 }],
    status: 'active',
    rating: '4.7',
    reviewCount: 34,
    storeName: 'MSIGaming',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-20',
    name: 'Gigabyte G5 KE i5-12500H RTX 3060 16GB 512GB',
    price: '3599',
    compareAtPrice: '3999',
    images: [{ id: 'laptop-20-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'Gigabyte G5', order: 0 }],
    status: 'active',
    rating: '4.2',
    reviewCount: 145,
    storeName: 'GigabyteStore',
    hasSmart: true,
    deliveryInfo: 'dostawa za 2 dni',
  },
  {
    id: 'laptop-21',
    name: 'ASUS ROG Flow X13 Ryzen 9 6900HS RTX 3050 Ti',
    price: '7299',
    images: [{ id: 'laptop-21-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'ROG Flow', order: 0 }],
    status: 'active',
    badge: 'bestseller',
    rating: '4.6',
    reviewCount: 78,
    storeName: 'ASUSStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-22',
    name: 'Apple MacBook Pro 16 M3 Max 36GB 1TB',
    price: '15999',
    images: [{ id: 'laptop-22-img-1', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', alt: 'MacBook Pro 16', order: 0 }],
    status: 'active',
    rating: '4.9',
    reviewCount: 167,
    storeName: 'AppleStore',
    hasSmart: false,
    deliveryInfo: 'Darmowa dostawa',
  },
  {
    id: 'laptop-23',
    name: 'Dell Alienware m15 R7 i7-12700H RTX 3080',
    price: '9999',
    compareAtPrice: '11499',
    images: [{ id: 'laptop-23-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'Alienware', order: 0 }],
    status: 'active',
    badge: 'outlet',
    rating: '4.5',
    reviewCount: 56,
    storeName: 'DellStore',
    hasSmart: true,
    deliveryInfo: 'dostawa za 2 dni',
  },
  {
    id: 'laptop-24',
    name: 'HP Envy 16 i7-12700H RTX 3060 16GB OLED',
    price: '5999',
    images: [{ id: 'laptop-24-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'HP Envy', order: 0 }],
    status: 'active',
    rating: '4.7',
    reviewCount: 89,
    storeName: 'HPStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  // Page 3
  {
    id: 'laptop-25',
    name: 'Lenovo ThinkPad X1 Carbon Gen 10 i7-1280P 32GB',
    price: '8499',
    images: [{ id: 'laptop-25-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'ThinkPad X1', order: 0 }],
    status: 'active',
    badge: 'bestseller',
    rating: '4.8',
    reviewCount: 234,
    storeName: 'LenovoStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-26',
    name: 'ASUS Zenbook Pro 14 Duo OLED i9-12900H RTX 3050 Ti',
    price: '9999',
    images: [{ id: 'laptop-26-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'Zenbook Duo', order: 0 }],
    status: 'active',
    rating: '4.6',
    reviewCount: 45,
    storeName: 'ASUSStore',
    hasSmart: false,
    deliveryInfo: 'dostawa za 3 dni',
  },
  {
    id: 'laptop-27',
    name: 'MSI Creator Z16P i7-12700H RTX 3060 32GB',
    price: '7999',
    compareAtPrice: '8999',
    images: [{ id: 'laptop-27-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'MSI Creator', order: 0 }],
    status: 'active',
    badge: 'outlet',
    rating: '4.5',
    reviewCount: 67,
    storeName: 'MSIStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-28',
    name: 'Dell XPS 17 9720 i7-12700H RTX 3060 32GB 4K+',
    price: '10999',
    images: [{ id: 'laptop-28-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'XPS 17', order: 0 }],
    status: 'active',
    rating: '4.8',
    reviewCount: 123,
    storeName: 'DellStore',
    hasSmart: true,
    deliveryInfo: 'darmowa dostawa',
  },
  {
    id: 'laptop-29',
    name: 'Acer Swift X SFX14 Ryzen 7 5800U RTX 3050 Ti',
    price: '4499',
    compareAtPrice: '4999',
    images: [{ id: 'laptop-29-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'Swift X', order: 0 }],
    status: 'active',
    badge: 'super-price',
    rating: '4.4',
    reviewCount: 189,
    storeName: 'AcerStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-30',
    name: 'Gigabyte AERO 16 OLED i7-12700H RTX 3070 Ti',
    price: '8999',
    images: [{ id: 'laptop-30-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'AERO 16', order: 0 }],
    status: 'active',
    rating: '4.7',
    reviewCount: 56,
    storeName: 'GigabyteStore',
    hasSmart: false,
    deliveryInfo: 'dostawa za 2 dni',
  },
  {
    id: 'laptop-31',
    name: 'HP ZBook Studio G9 i7-12800H RTX A2000 32GB',
    price: '11999',
    images: [{ id: 'laptop-31-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'ZBook Studio', order: 0 }],
    status: 'active',
    badge: 'bestseller',
    rating: '4.6',
    reviewCount: 78,
    storeName: 'HPStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-32',
    name: 'Lenovo Yoga 9i Gen 7 i7-1260P 16GB OLED 2.8K',
    price: '6499',
    images: [{ id: 'laptop-32-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'Yoga 9i', order: 0 }],
    status: 'active',
    rating: '4.7',
    reviewCount: 145,
    storeName: 'LenovoStore',
    hasSmart: true,
    deliveryInfo: 'darmowa dostawa',
  },
  {
    id: 'laptop-33',
    name: 'ASUS ProArt Studiobook 16 OLED H7600ZX i7 RTX 3080',
    price: '12499',
    images: [{ id: 'laptop-33-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'ProArt', order: 0 }],
    status: 'active',
    rating: '4.8',
    reviewCount: 34,
    storeName: 'ASUSStore',
    hasSmart: false,
    deliveryInfo: 'dostawa za 3 dni',
  },
  {
    id: 'laptop-34',
    name: 'Microsoft Surface Laptop Studio i7-11370H RTX 3050 Ti',
    price: '7999',
    compareAtPrice: '8999',
    images: [{ id: 'laptop-34-img-1', url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', alt: 'Surface Studio', order: 0 }],
    status: 'active',
    badge: 'outlet',
    rating: '4.5',
    reviewCount: 167,
    storeName: 'MicrosoftStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
  {
    id: 'laptop-35',
    name: 'Razer Book 13 i7-1165G7 16GB Intel Iris Xe',
    price: '4999',
    images: [{ id: 'laptop-35-img-1', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', alt: 'Razer Book', order: 0 }],
    status: 'active',
    rating: '4.4',
    reviewCount: 89,
    storeName: 'RazerStore',
    hasSmart: true,
    deliveryInfo: 'dostawa za 2 dni',
  },
  {
    id: 'laptop-36',
    name: 'Samsung Galaxy Book3 Ultra i9-13900H RTX 4070',
    price: '13999',
    images: [{ id: 'laptop-36-img-1', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400', alt: 'Galaxy Book3', order: 0 }],
    status: 'active',
    badge: 'bestseller',
    rating: '4.7',
    reviewCount: 45,
    storeName: 'SamsungStore',
    hasSmart: true,
    deliveryInfo: 'dostawa jutro',
  },
];

const ITEMS_PER_PAGE = 12;

const breadcrumbItems = [
  { label: 'Strona główna', href: '/' },
  { label: 'Elektronika', href: '/products?category=electronics' },
  { label: 'Laptopy', href: '/products?category=laptops' },
  { label: 'Laptopy gamingowe' },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return allDemoProducts;
    const query = searchQuery.toLowerCase();
    return allDemoProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.storeName?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Calculate pagination
  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
  const validPage = Math.max(1, Math.min(currentPage, totalPages));
  
  // Get products for current page
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const displayProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container-custom py-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">
            {searchQuery ? (
              <>
                Wyniki dla "{searchQuery}"{' '}
                <span className="text-secondary-400 font-normal text-lg">
                  ({totalProducts.toLocaleString()} {totalProducts === 1 ? 'oferta' : totalProducts < 5 ? 'oferty' : 'ofert'})
                </span>
              </>
            ) : (
              <>
                Laptopy gamingowe{' '}
                <span className="text-secondary-400 font-normal text-lg">
                  ({totalProducts.toLocaleString()} ofert)
                </span>
              </>
            )}
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

            {/* No Results */}
            {displayProducts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Brak wyników</h3>
                <p className="text-gray-500 mb-4">Nie znaleziono produktów pasujących do Twojego wyszukiwania.</p>
                <a href="/products" className="text-primary-500 hover:text-primary-600 font-medium">
                  Zobacz wszystkie produkty →
                </a>
              </div>
            ) : (
              <>
                {/* Product Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayProducts.map((product) => (
                    <ProductListCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination 
                  currentPage={validPage} 
                  totalPages={totalPages} 
                  totalItems={totalProducts}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}