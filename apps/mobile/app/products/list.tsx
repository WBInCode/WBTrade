import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { api } from '../../services/api';
import ProductGrid from '../../components/product/ProductGrid';
import type { Product } from '../../services/types';

type SortOption = 'popularity' | 'price_asc' | 'price_desc' | 'newest';
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popularity', label: 'Popularność' },
  { value: 'newest', label: 'Najnowsze' },
  { value: 'price_asc', label: 'Cena rosnąco' },
  { value: 'price_desc', label: 'Cena malejąco' },
];

export default function ProductListScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { carousel, carouselName, warehouse, warehouseName } = useLocalSearchParams<{
    carousel?: string;
    carouselName?: string;
    warehouse?: string;
    warehouseName?: string;
  }>();

  const title = carouselName || warehouseName || 'Produkty';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortOption>('popularity');
  const [showSort, setShowSort] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      if (carousel) {
        const res = await api.get<{ products: Product[] }>(`/carousels/${encodeURIComponent(carousel)}/products`);
        setProducts(res.products || []);
      } else if (warehouse) {
        const res = await api.get<{ products: Product[] }>('/products', { warehouse, limit: 100 });
        setProducts(res.products || []);
      }
    } catch {
      setProducts([]);
    }
  }, [carousel, warehouse]);

  useEffect(() => {
    setLoading(true);
    fetchProducts().finally(() => setLoading(false));
  }, [fetchProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  const sortedProducts = useMemo(() => {
    if (sort === 'popularity') return products;
    const sorted = [...products];
    switch (sort) {
      case 'price_asc': return sorted.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price_desc': return sorted.sort((a, b) => Number(b.price) - Number(a.price));
      case 'newest': return sorted.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      default: return sorted;
    }
  }, [products, sort]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundTertiary }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={() => setShowSort(!showSort)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome name="sliders" size={18} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {/* Sort bar */}
        {showSort && (
          <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            {SORT_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.sortChip, sort === o.value && { backgroundColor: colors.tint }]}
                onPress={() => { setSort(o.value); setShowSort(false); }}
              >
                <Text style={[styles.sortChipText, { color: sort === o.value ? '#fff' : colors.textSecondary }]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Count */}
        {!loading && (
          <View style={styles.countRow}>
            <Text style={[styles.countText, { color: colors.textMuted }]}>{sortedProducts.length} produktów</Text>
          </View>
        )}

        {/* Product grid */}
        <ProductGrid
          products={sortedProducts}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          emptyMessage="Brak produktów w tej kolekcji"
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  sortBar: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sortChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.12)',
  },
  sortChipText: { fontSize: 13, fontWeight: '600' },
  countRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  countText: { fontSize: 13 },
});
