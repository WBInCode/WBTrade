import { Metadata } from 'next';
import { getCategoryBySlug } from '../../lib/server-api';
import ProductsClient from './ProductsClient';

// ISR: revalidate listing pages every 5 minutes
export const revalidate = 300;

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = typeof params.category === 'string' ? params.category : '';
  const searchQuery = typeof params.search === 'string' ? params.search : '';

  // Search results page
  if (searchQuery) {
    return {
      title: `Wyniki wyszukiwania: ${searchQuery} | WBTrade`,
      description: `Znajdź "${searchQuery}" w najlepszych cenach w WBTrade. Szybka wysyłka, bezpieczne płatności.`,
      robots: { index: false }, // Don't index search results
    };
  }

  // Category page
  if (categorySlug) {
    try {
      const category = await getCategoryBySlug(categorySlug);
      if (category) {
        const name = category.name.replace(/^\d+\.\s*/, '');
        return {
          title: `${name} | WBTrade`,
          description: `Odkryj najlepsze produkty w kategorii ${name}. Szybka wysyłka, bezpieczne płatności, najlepsze ceny w WBTrade.`,
          openGraph: {
            title: `${name} | WBTrade`,
            description: `Odkryj najlepsze produkty w kategorii ${name}.`,
            type: 'website',
          },
        };
      }
    } catch {
      // Fall through to default
    }
  }

  // Default products page
  return {
    title: 'Wszystkie produkty | WBTrade',
    description: 'Przeglądaj tysiące produktów w najlepszych cenach. Elektronika, zabawki, dom i ogród, i wiele więcej. Szybka wysyłka z WBTrade.',
    openGraph: {
      title: 'Wszystkie produkty | WBTrade',
      description: 'Przeglądaj tysiące produktów w najlepszych cenach.',
      type: 'website',
    },
  };
}

export default function ProductsPage() {
  return <ProductsClient />;
}
