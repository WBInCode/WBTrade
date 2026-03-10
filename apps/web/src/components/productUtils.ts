import { Product } from '../lib/api';

// Placeholder SVG as data URI
export const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Cpath fill='%23d1d5db' d='M160 150h80v100h-80z'/%3E%3Ccircle fill='%23d1d5db' cx='180' cy='130' r='20'/%3E%3Cpath fill='%23e5e7eb' d='M120 250l60-80 40 50 40-30 60 60v50H120z'/%3E%3C/svg%3E";

// Warehouse locations mapping
export const WAREHOUSE_LOCATIONS: Record<string, string> = {
  'leker': 'Chynów',
  'hp': 'Zielona Góra',
  'btp': 'Chotów',
  'outlet': 'Rzeszów',
};

export function getWarehouseLocation(product: Product): string | null {
  const blId = (product as any).baselinkerProductId?.toLowerCase() || '';
  if (blId.startsWith('leker-')) return WAREHOUSE_LOCATIONS['leker'];
  if (blId.startsWith('hp-')) return WAREHOUSE_LOCATIONS['hp'];
  if (blId.startsWith('btp-')) return WAREHOUSE_LOCATIONS['btp'];
  if (blId.startsWith('outlet-')) return WAREHOUSE_LOCATIONS['outlet'];

  const tags = (product as any).tags || [];
  if (tags.some((t: string) => t.toLowerCase() === 'rzeszów')) return WAREHOUSE_LOCATIONS['outlet'];

  const sku = product.sku?.toUpperCase() || '';
  if (sku.startsWith('LEKER-')) return WAREHOUSE_LOCATIONS['leker'];
  if (sku.startsWith('HP-')) return WAREHOUSE_LOCATIONS['hp'];
  if (sku.startsWith('BTP-')) return WAREHOUSE_LOCATIONS['btp'];
  if (sku.startsWith('OUTLET-')) return WAREHOUSE_LOCATIONS['outlet'];

  return null;
}

export function calculateDiscountPercent(price: number | string, compareAtPrice: number | string | null | undefined): number {
  if (!compareAtPrice || Number(compareAtPrice) <= Number(price)) return 0;
  return Math.round((1 - Number(price) / Number(compareAtPrice)) * 100);
}
