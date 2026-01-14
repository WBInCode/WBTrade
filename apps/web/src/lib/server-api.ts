/**
 * Server-side API utilities for Next.js App Router
 * Uses fetch with Next.js caching and revalidation
 */

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Cache tags for granular revalidation
export const CACHE_TAGS = {
  PRODUCTS: 'products',
  PRODUCT: (id: string) => `product-${id}`,
  CATEGORIES: 'categories',
  CATEGORY: (slug: string) => `category-${slug}`,
  BESTSELLERS: 'bestsellers',
} as const;

// Revalidation times in seconds
export const REVALIDATE = {
  PRODUCTS: 60, // 1 minute
  PRODUCT_DETAIL: 60, // 1 minute
  CATEGORIES: 300, // 5 minutes
  BESTSELLERS: 120, // 2 minutes
  STATIC: 3600, // 1 hour for rarely changing content
} as const;

interface FetchOptions {
  revalidate?: number | false;
  tags?: string[];
  cache?: 'force-cache' | 'no-store';
}

/**
 * Server-side fetch with caching support
 */
export async function serverFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { revalidate = 60, tags = [], cache } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const fetchOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    headers: {
      'Content-Type': 'application/json',
    },
    next: {
      revalidate: cache === 'no-store' ? 0 : revalidate,
      tags,
    },
  };

  if (cache) {
    fetchOptions.cache = cache;
  }

  const response = await fetch(url, fetchOptions as RequestInit);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ========================================
// Product Types
// ========================================

export interface ServerProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  sku: string;
  status: string;
  images: Array<{ id: string; url: string; alt: string | null; order: number }>;
  category: { id: string; name: string; slug: string } | null;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
  }>;
  specifications?: Record<string, unknown>;
  rating?: string;
  reviewCount?: number;
}

export interface ServerProductsResponse {
  products: ServerProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServerCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  productCount: number;
  children?: ServerCategory[];
}

// ========================================
// Product APIs (Server-side)
// ========================================

/**
 * Get all products with pagination (server-side)
 */
export async function getProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<ServerProductsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.category) searchParams.set('category', params.category);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.minPrice) searchParams.set('minPrice', params.minPrice.toString());
  if (params?.maxPrice) searchParams.set('maxPrice', params.maxPrice.toString());

  const queryString = searchParams.toString();
  const endpoint = `/products${queryString ? `?${queryString}` : ''}`;

  return serverFetch<ServerProductsResponse>(endpoint, {
    revalidate: REVALIDATE.PRODUCTS,
    tags: [CACHE_TAGS.PRODUCTS],
  });
}

/**
 * Get single product by ID (server-side)
 */
export async function getProduct(id: string): Promise<ServerProduct> {
  return serverFetch<ServerProduct>(`/products/${id}`, {
    revalidate: REVALIDATE.PRODUCT_DETAIL,
    tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT(id)],
  });
}

/**
 * Get product by slug (server-side)
 */
export async function getProductBySlug(slug: string): Promise<ServerProduct> {
  return serverFetch<ServerProduct>(`/products/slug/${slug}`, {
    revalidate: REVALIDATE.PRODUCT_DETAIL,
    tags: [CACHE_TAGS.PRODUCTS],
  });
}

/**
 * Get bestseller products for static generation
 */
export async function getBestsellers(limit: number = 100): Promise<ServerProduct[]> {
  const response = await serverFetch<ServerProductsResponse>('/products?sort=bestseller&limit=' + limit, {
    revalidate: REVALIDATE.BESTSELLERS,
    tags: [CACHE_TAGS.BESTSELLERS],
  });
  return response.products;
}

/**
 * Get all product IDs for static generation
 * Returns only top bestsellers for pre-building
 */
export async function getProductIdsForStaticGeneration(): Promise<string[]> {
  // Pre-build only top 100 bestsellers
  const bestsellers = await getBestsellers(100);
  return bestsellers.map(p => p.id);
}

// ========================================
// Category APIs (Server-side)
// ========================================

/**
 * Get all categories (server-side)
 */
export async function getCategories(): Promise<ServerCategory[]> {
  return serverFetch<ServerCategory[]>('/categories', {
    revalidate: REVALIDATE.CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES],
  });
}

/**
 * Get category by slug (server-side)
 */
export async function getCategoryBySlug(slug: string): Promise<ServerCategory> {
  return serverFetch<ServerCategory>(`/categories/${slug}`, {
    revalidate: REVALIDATE.CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES, CACHE_TAGS.CATEGORY(slug)],
  });
}

/**
 * Get category tree (server-side)
 */
export async function getCategoryTree(): Promise<ServerCategory[]> {
  return serverFetch<ServerCategory[]>('/categories/tree', {
    revalidate: REVALIDATE.CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES],
  });
}

// ========================================
// Utility for calling revalidation from admin
// ========================================

/**
 * Trigger revalidation from admin panel
 */
export async function triggerRevalidation(
  path: string,
  secret: string = process.env.REVALIDATION_SECRET || ''
): Promise<boolean> {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, secret }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Trigger tag-based revalidation
 */
export async function triggerTagRevalidation(
  tag: string,
  secret: string = process.env.REVALIDATION_SECRET || ''
): Promise<boolean> {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, type: 'tag', secret }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
