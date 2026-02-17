import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import ProductGrid from '../../components/product/ProductGrid';
import type { Product, Category, ProductsResponse } from '../../services/types';

type SortOption = 'popularity' | 'price_asc' | 'price_desc' | 'newest' | 'name_asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popularity', label: 'Popularność' },
  { value: 'newest', label: 'Najnowsze' },
  { value: 'price_asc', label: 'Cena rosnąco' },
  { value: 'price_desc', label: 'Cena malejąco' },
  { value: 'name_asc', label: 'Nazwa A-Z' },
];

const PAGE_LIMIT = 20;

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters & Sort
  const [sort, setSort] = useState<SortOption>('popularity');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchCategory = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await api.get<{ category: Category }>(`/categories/${slug}`);
      setCategory(res.category);
    } catch {
      // Category name will fall back to slug
    }
  }, [slug]);

  const fetchProducts = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (!slug) return;

      if (pageNum === 1 && !isRefresh) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);
      setError(null);

      try {
        const res = await api.get<ProductsResponse>('/products', {
          category: slug,
          sort,
          page: pageNum,
          limit: PAGE_LIMIT,
        });

        if (pageNum === 1) {
          setProducts(res.products || []);
        } else {
          setProducts((prev) => [...prev, ...(res.products || [])]);
        }

        setTotalPages(res.pagination?.pages || 1);
        setPage(pageNum);
      } catch (err: any) {
        setError(err.message || 'Nie udało się pobrać produktów');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [slug, sort]
  );

  // Initial load
  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  useEffect(() => {
    setPage(1);
    setProducts([]);
    fetchProducts(1);
  }, [fetchProducts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1, true);
  }, [fetchProducts]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && page < totalPages) {
      fetchProducts(page + 1);
    }
  }, [loadingMore, page, totalPages, fetchProducts]);

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSort(newSort);
    setShowSortMenu(false);
  }, []);

  const categoryName = category?.name || slug || 'Kategoria';

  // Loading state
  if (loading && products.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: categoryName }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Ładowanie...</Text>
        </View>
      </>
    );
  }

  // Error state
  if (error && products.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: categoryName }} />
        <View style={styles.centered}>
          <FontAwesome name="exclamation-triangle" size={40} color={Colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProducts(1)}>
            <Text style={styles.retryBtnText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: categoryName }} />
      <View style={styles.container}>
        {/* Sort bar */}
        <View style={styles.toolbar}>
          <Text style={styles.resultCount}>
            {products.length} produkt{products.length === 1 ? '' : products.length < 5 ? 'y' : 'ów'}
          </Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
            activeOpacity={0.7}
          >
            <FontAwesome name="sort" size={14} color={Colors.secondary[600]} />
            <Text style={styles.sortButtonText}>
              {SORT_OPTIONS.find((o) => o.value === sort)?.label}
            </Text>
            <FontAwesome
              name={showSortMenu ? 'chevron-up' : 'chevron-down'}
              size={10}
              color={Colors.secondary[500]}
            />
          </TouchableOpacity>
        </View>

        {/* Sort dropdown */}
        {showSortMenu && (
          <View style={styles.sortDropdown}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  sort === option.value && styles.sortOptionActive,
                ]}
                onPress={() => handleSortChange(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sort === option.value && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sort === option.value && (
                  <FontAwesome name="check" size={12} color={Colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Product Grid */}
        <ProductGrid
          products={products}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          hasNextPage={page < totalPages}
          isFetchingNextPage={loadingMore}
          emptyMessage="Brak produktów w tej kategorii"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.secondary[500],
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.secondary[600],
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: '600',
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  resultCount: {
    fontSize: 13,
    color: Colors.secondary[500],
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondary[300],
    backgroundColor: Colors.white,
  },
  sortButtonText: {
    fontSize: 13,
    color: Colors.secondary[700],
    fontWeight: '500',
  },

  // Sort dropdown
  sortDropdown: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
    paddingHorizontal: 16,
    paddingVertical: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[100],
  },
  sortOptionActive: {
    borderBottomColor: Colors.primary[100],
  },
  sortOptionText: {
    fontSize: 14,
    color: Colors.secondary[700],
  },
  sortOptionTextActive: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
});
