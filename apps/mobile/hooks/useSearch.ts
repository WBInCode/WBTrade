import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { productsApi } from '../services/products';
import type { ProductFilters } from '../services/types';

function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useSearch(query: string, filters?: ProductFilters) {
  const debouncedQuery = useDebounce(query, 300);

  const results = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: () => productsApi.search(debouncedQuery, filters),
    enabled: debouncedQuery.length >= 2,
  });

  const suggestions = useQuery({
    queryKey: ['suggestions', debouncedQuery],
    queryFn: () => productsApi.suggest(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return {
    results,
    suggestions,
    debouncedQuery,
  };
}
