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
    accentColor: 'green',
    icon: '🌸',
    tag: 'wiosna',
  },
  summer: {
    title: 'Letnie Hity',
    subtitle: 'Gorące oferty na lato',
    accentColor: 'orange',
    icon: '☀️',
    tag: 'lato',
  },
  autumn: {
    title: 'Jesienne Nowości',
    subtitle: 'Przygotuj się na jesień',
    accentColor: 'orange',
    icon: '🍂',
    tag: 'jesien',
  },
  winter: {
    title: 'Zimowa Wyprzedaż',
    subtitle: 'Najlepsze okazje zimowe',
    accentColor: 'blue',
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
      <section className="py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-100 rounded-lg sm:rounded-xl animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-28 sm:w-36 animate-pulse"></div>
        </div>
        <div className="flex gap-2.5 sm:gap-3 md:gap-4 overflow-hidden -mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] lg:w-[220px] h-[200px] sm:h-[240px] md:h-[280px] bg-gray-100 rounded-xl sm:rounded-2xl animate-pulse"></div>
          ))}
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
