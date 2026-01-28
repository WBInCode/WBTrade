'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { productsApi, Product } from '@/lib/api';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface SeasonConfig {
  title: string;
  subtitle: string;
  accentColor: string;
  icon: string;
  tag: string;
}

const seasonConfigs: Record<Season, SeasonConfig> = {
  spring: {
    title: 'Wiosenna Kolekcja',
    subtitle: 'Świeże produkty na wiosnę',
    accentColor: 'from-green-500 to-emerald-600',
    icon: '🌸',
    tag: 'wiosna',
  },
  summer: {
    title: 'Letnie Hity',
    subtitle: 'Gorące oferty na lato',
    accentColor: 'from-yellow-500 to-orange-500',
    icon: '☀️',
    tag: 'lato',
  },
  autumn: {
    title: 'Jesienne Nowości',
    subtitle: 'Przygotuj się na jesień',
    accentColor: 'from-amber-600 to-orange-700',
    icon: '🍂',
    tag: 'jesien',
  },
  winter: {
    title: 'Zimowa Wyprzedaż',
    subtitle: 'Najlepsze okazje zimowe',
    accentColor: 'from-blue-500 to-cyan-600',
    icon: '❄️',
    tag: 'zima',
  },
};

function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

interface SeasonalCarouselProps {
  forceSeason?: Season;
  limit?: number;
}

export default function SeasonalCarousel({
  forceSeason,
  limit = 20,
}: SeasonalCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const currentSeason = forceSeason || getCurrentSeason();
  const config = seasonConfigs[currentSeason];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Use new seasonal endpoint that checks for tags and admin-curated products
        const response = await productsApi.getSeasonal({
          limit,
          season: currentSeason,
        });
        setProducts(response.products);
      } catch (error) {
        console.error('Error fetching seasonal products:', error);
        // Fallback: get products on sale
        try {
          const fallback = await productsApi.getAll({
            limit,
            sort: 'newest',
          });
          setProducts(fallback.products);
        } catch (e) {
          console.error('Fallback also failed:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentSeason, limit]);

  if (loading) {
    return (
      <section className="my-8">
        <div className="container-custom">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`bg-gradient-to-r ${config.accentColor} px-6 py-5`}>
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl"></div>
                <div className="h-6 bg-white/20 rounded w-48"></div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-[220px] h-[300px] bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <ProductCarousel
      title={config.title}
      subtitle={config.subtitle}
      products={products}
      viewAllLink="/products/seasonal"
      accentColor={config.accentColor}
      icon={<span>{config.icon}</span>}
    />
  );
}
