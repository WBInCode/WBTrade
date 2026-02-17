import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { productsApi } from '../services/products';
import type { ProductFilters } from '../services/types';

export function useProducts(filters?: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ['products', filters],
    queryFn: ({ pageParam = 1 }) =>
      productsApi.getAll({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ['product-slug', slug],
    queryFn: () => productsApi.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useBestsellers(limit = 10) {
  return useQuery({
    queryKey: ['bestsellers', limit],
    queryFn: () => productsApi.getBestsellers(limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useFeatured(limit = 10) {
  return useQuery({
    queryKey: ['featured', limit],
    queryFn: () => productsApi.getFeatured(limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSeasonal(limit = 10) {
  return useQuery({
    queryKey: ['seasonal', limit],
    queryFn: () => productsApi.getSeasonal(limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNewProducts(limit = 10) {
  return useQuery({
    queryKey: ['new-products', limit],
    queryFn: () => productsApi.getNewProducts(limit),
    staleTime: 2 * 60 * 1000,
  });
}
