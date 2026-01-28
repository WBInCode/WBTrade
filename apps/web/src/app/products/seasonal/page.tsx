'use client';

import { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductListCard from '../../../components/ProductListCard';
import Breadcrumb from '../../../components/Breadcrumb';
import { Product, productsApi } from '../../../lib/api';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface SeasonConfig {
  title: string;
  subtitle: string;
  gradient: string;
  icon: string;
}

const seasonConfigs: Record<Season, SeasonConfig> = {
  spring: {
    title: 'Wiosenna Kolekcja',
    subtitle: 'Świeże produkty na wiosnę',
    gradient: 'from-green-500 to-emerald-600',
    icon: '🌸',
  },
  summer: {
    title: 'Letnie Hity',
    subtitle: 'Gorące oferty na lato',
    gradient: 'from-yellow-500 to-orange-500',
    icon: '☀️',
  },
  autumn: {
    title: 'Jesienne Nowości',
    subtitle: 'Przygotuj się na jesień',
    gradient: 'from-amber-600 to-orange-700',
    icon: '🍂',
  },
  winter: {
    title: 'Zimowa Wyprzedaż',
    subtitle: 'Najlepsze okazje zimowe',
    gradient: 'from-blue-500 to-cyan-600',
    icon: '❄️',
  },
};

function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export default function SeasonalPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentSeason = getCurrentSeason();
  const config = seasonConfigs[currentSeason];

  useEffect(() => {
    async function fetchSeasonal() {
      try {
        const response = await productsApi.getSeasonal({ limit: 20, season: currentSeason });
        setProducts(response.products);
      } catch (error) {
        console.error('Failed to fetch seasonal products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSeasonal();
  }, [currentSeason]);

  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: config.title, href: '/products/seasonal' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow">
        <div className="container-custom py-6">
          <Breadcrumb items={breadcrumbItems} />
          
          {/* Header */}
          <div className={`bg-gradient-to-r ${config.gradient} rounded-2xl p-8 mb-8 text-white`}>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{config.icon}</span>
              <div>
                <h1 className="text-3xl font-bold">{config.title}</h1>
                <p className="text-white/80 mt-1">{config.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg h-[320px] animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-gray-600 mb-4">
                Znaleziono {products.length} produktów
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductListCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">Brak produktów sezonowych</p>
              <p className="text-gray-400 mt-2">Sprawdź ponownie wkrótce</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
