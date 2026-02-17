import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../services/products';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMainCategories() {
  return useQuery({
    queryKey: ['categories-main'],
    queryFn: () => categoriesApi.getMain(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategoryBySlug(slug: string) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoriesApi.getBySlug(slug),
    enabled: !!slug,
  });
}
