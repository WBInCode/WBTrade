import { api } from './api';
import type { Product, ProductsResponse, ProductFilters, Category } from './types';

export const productsApi = {
  getAll: (filters?: ProductFilters) =>
    api.get<ProductsResponse>('/products', filters as Record<string, any>),

  getById: (id: string) =>
    api.get<{ product: Product }>(`/products/${id}`),

  getBySlug: (slug: string) =>
    api.get<{ product: Product }>(`/products/slug/${slug}`),

  getFilters: (category?: string) =>
    api.get<any>('/products/filters', category ? { category } : undefined),

  getBestsellers: (limit?: number) =>
    api.get<{ products: Product[] }>('/products/bestsellers', { limit }),

  getFeatured: (limit?: number) =>
    api.get<{ products: Product[] }>('/products/featured', { limit }),

  getSeasonal: (limit?: number) =>
    api.get<{ products: Product[] }>('/products/seasonal', { limit }),

  getNewProducts: (limit?: number) =>
    api.get<{ products: Product[] }>('/products/new-arrivals', { limit }),

  getSameWarehouse: (productId: string, limit?: number) =>
    api.get<{ products: Product[] }>(`/products/same-warehouse/${productId}`, { limit }),

  getTopRated: (limit?: number) =>
    api.get<{ products: Product[] }>('/products/top-rated', { limit }),

  search: (query: string, filters?: ProductFilters) =>
    api.get<ProductsResponse>('/search', { query, ...filters } as Record<string, any>),

  suggest: (query: string) =>
    api.get<{ suggestions: string[] }>('/search/suggest', { query }),
};

export const categoriesApi = {
  getAll: () =>
    api.get<{ categories: Category[] }>('/categories'),

  getMain: () =>
    api.get<{ categories: Category[] }>('/categories/main'),

  getBySlug: (slug: string) =>
    api.get<{ category: Category }>(`/categories/${slug}`),

  getPath: (slug: string) =>
    api.get<{ path: Category[] }>(`/categories/${slug}/path`),
};
