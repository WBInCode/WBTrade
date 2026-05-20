import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverFetch, REVALIDATE } from '../../../lib/server-api';
import ManufacturerPageClient from './ManufacturerPageClient';

export const revalidate = 300;

interface ManufacturerPageProps {
  params: Promise<{ slug: string }>;
}

interface ManufacturerData {
  id: string;
  name: string;
  slug: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  safetyInfo?: string;
  euRepName?: string;
  euRepAddress?: string;
  euRepEmail?: string;
  _count: { products: number };
}

async function getManufacturer(slug: string): Promise<ManufacturerData | null> {
  try {
    return await serverFetch<ManufacturerData>(`/manufacturers/slug/${slug}`, {
      revalidate: REVALIDATE.STATIC,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ManufacturerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const manufacturer = await getManufacturer(slug);

  if (!manufacturer) {
    return { title: 'Producent nie znaleziony' };
  }

  return {
    title: `${manufacturer.name} - Producent | WBTrade`,
    description: `Dane producenta ${manufacturer.name}. Adres, kontakt, informacje o bezpieczeństwie produktów (GPSR).`,
  };
}

export default async function ManufacturerPage({ params }: ManufacturerPageProps) {
  const { slug } = await params;
  const manufacturer = await getManufacturer(slug);

  if (!manufacturer) {
    notFound();
  }

  return <ManufacturerPageClient manufacturer={manufacturer} />;
}
