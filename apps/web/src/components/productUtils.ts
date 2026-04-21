import { Product } from '../lib/api';

// Placeholder SVG as data URI
export const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Cpath fill='%23d1d5db' d='M160 150h80v100h-80z'/%3E%3Ccircle fill='%23d1d5db' cx='180' cy='130' r='20'/%3E%3Cpath fill='%23e5e7eb' d='M120 250l60-80 40 50 40-30 60 60v50H120z'/%3E%3C/svg%3E";

// Warehouse locations mapping — loaded from API, with hardcoded fallback
let _warehouseConfig: { prefix: string; location: string; skuPrefix: string }[] | null = null;
let _configFetchedAt = 0;

const FALLBACK_WAREHOUSE_LOCATIONS: Record<string, string> = {
  'leker': 'Chynów',
  'hp': 'Zielona Góra',
  'btp': 'Chotów',
  'dofirmy': 'Koszalin',
  'outlet': 'Rzeszów',
  'hurtownia-kuchenna': 'Hurtownia Kuchenna',
};

// Backward compat export for ProductCard / ProductListCard
export const WAREHOUSE_LOCATIONS = FALLBACK_WAREHOUSE_LOCATIONS;

async function loadWarehouseConfig(): Promise<{ prefix: string; location: string; skuPrefix: string }[]> {
  const now = Date.now();
  if (_warehouseConfig && now - _configFetchedAt < 5 * 60 * 1000) return _warehouseConfig;
  try {
    const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const res = await fetch(`${API_URL}/wholesalers/config`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      _warehouseConfig = data
        .filter((w: any) => w.prefix && w.location)
        .map((w: any) => ({ prefix: w.prefix.toLowerCase(), location: w.location, skuPrefix: (w.skuPrefix || '').toUpperCase() }));
      _configFetchedAt = now;
      return _warehouseConfig!;
    }
  } catch {}
  return [];
}

export function getWarehouseLocation(product: Product): string | null {
  // Synchronous — uses fallback. For dynamic, use getWarehouseLocationAsync.
  const blId = (product as any).baselinkerProductId?.toLowerCase() || '';
  for (const [key, loc] of Object.entries(FALLBACK_WAREHOUSE_LOCATIONS)) {
    if (blId.startsWith(`${key}-`)) return loc;
  }

  const tags = (product as any).tags || [];
  if (tags.some((t: string) => t.toLowerCase() === 'rzeszów')) return FALLBACK_WAREHOUSE_LOCATIONS['outlet'];

  const sku = product.sku?.toUpperCase() || '';
  for (const [key, loc] of Object.entries(FALLBACK_WAREHOUSE_LOCATIONS)) {
    if (sku.startsWith(`${key.toUpperCase()}-`)) return loc;
  }

  return null;
}

export async function getWarehouseLocationAsync(product: Product): Promise<string | null> {
  const config = await loadWarehouseConfig();
  if (config.length === 0) return getWarehouseLocation(product);

  const blId = (product as any).baselinkerProductId?.toLowerCase() || '';
  for (const wh of config) {
    if (wh.prefix && blId.startsWith(wh.prefix)) return wh.location;
  }

  const sku = product.sku?.toUpperCase() || '';
  for (const wh of config) {
    if (wh.skuPrefix && sku.startsWith(wh.skuPrefix)) return wh.location;
  }

  return null;
}

export function calculateDiscountPercent(price: number | string, compareAtPrice: number | string | null | undefined): number {
  if (!compareAtPrice || Number(compareAtPrice) <= Number(price)) return 0;
  return Math.round((1 - Number(price) / Number(compareAtPrice)) * 100);
}

const polishCharsMap: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
};

export function getBrandSlug(brandName: string): string {
  let result = brandName;
  for (const [polish, ascii] of Object.entries(polishCharsMap)) {
    result = result.replace(new RegExp(polish, 'g'), ascii);
  }
  return result
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function getProductBrand(product: Product): string | null {
  // Prefer manufacturer relation from DB
  if ((product as any).manufacturer?.name) {
    return (product as any).manufacturer.name;
  }
  // Fallback to specifications.brand
  const specs = product.specifications as Record<string, unknown> | null | undefined;
  if (specs && typeof specs === 'object' && typeof specs.brand === 'string' && specs.brand.trim()) {
    return specs.brand.trim();
  }
  return null;
}

export function getProductBrandSlug(product: Product): string | null {
  // Prefer manufacturer slug from DB (already generated correctly)
  if ((product as any).manufacturer?.slug) {
    return (product as any).manufacturer.slug;
  }
  const brand = getProductBrand(product);
  return brand ? getBrandSlug(brand) : null;
}
