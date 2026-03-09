import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Animated,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { api } from '../../../services/api';
import ProductGrid from '../../../components/product/ProductGrid';
import type { Product, Category, ProductsResponse } from '../../../services/types';

type SortOption = 'popularity' | 'price_asc' | 'price_desc' | 'newest' | 'name_asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popularity', label: 'Popularność' },
  { value: 'newest', label: 'Najnowsze' },
  { value: 'price_asc', label: 'Cena rosnąco' },
  { value: 'price_desc', label: 'Cena malejąco' },
  { value: 'name_asc', label: 'Nazwa A-Z' },
];

const WAREHOUSES = [
  { id: 'leker', label: 'Leker', location: 'Chynów' },
  { id: 'hp', label: 'HP', location: 'Zielona Góra' },
  { id: 'btp', label: 'BTP', location: 'Chotów' },
  { id: 'outlet', label: 'Outlet', location: 'Rzeszów' },
];

const PAGE_LIMIT = 48;

// ── Filter Modal ──

interface Filters {
  minPrice: string;
  maxPrice: string;
  warehouse: string;
  discounted: boolean;
}

const EMPTY_FILTERS: Filters = { minPrice: '', maxPrice: '', warehouse: '', discounted: false };

function FilterModal({
  visible,
  onClose,
  filters,
  onApply,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (f: Filters) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [local, setLocal] = useState<Filters>(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const hasFilters =
    local.minPrice !== '' || local.maxPrice !== '' || local.warehouse !== '' || local.discounted;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={fStyles.overlay}>
        <View style={[fStyles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[fStyles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[fStyles.sheetTitle, { color: colors.text }]}>Filtry</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <FontAwesome name="times" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={fStyles.sheetBody} keyboardShouldPersistTaps="handled">
            {/* Price range */}
            <Text style={[fStyles.filterLabel, { color: colors.text }]}>Cena (zł)</Text>
            <View style={fStyles.priceRow}>
              <TextInput
                style={[fStyles.priceInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Od"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={local.minPrice}
                onChangeText={(v) => setLocal((p) => ({ ...p, minPrice: v.replace(/[^0-9.,]/g, '') }))}
              />
              <Text style={{ color: colors.textMuted }}>—</Text>
              <TextInput
                style={[fStyles.priceInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Do"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={local.maxPrice}
                onChangeText={(v) => setLocal((p) => ({ ...p, maxPrice: v.replace(/[^0-9.,]/g, '') }))}
              />
            </View>

            {/* Warehouse */}
            <Text style={[fStyles.filterLabel, { color: colors.text, marginTop: 20 }]}>Magazyn</Text>
            {WAREHOUSES.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[
                  fStyles.chipBtn,
                  {
                    borderColor: local.warehouse === w.id ? colors.tint : colors.border,
                    backgroundColor: local.warehouse === w.id ? colors.tintLight : colors.background,
                  },
                ]}
                onPress={() => setLocal((p) => ({ ...p, warehouse: p.warehouse === w.id ? '' : w.id }))}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    fStyles.chipBtnText,
                    { color: local.warehouse === w.id ? colors.tint : colors.text },
                  ]}
                >
                  {w.label} — {w.location}
                </Text>
                {local.warehouse === w.id && (
                  <FontAwesome name="check" size={12} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}

            {/* Discounted */}
            <Text style={[fStyles.filterLabel, { color: colors.text, marginTop: 20 }]}>Promocje</Text>
            <TouchableOpacity
              style={[
                fStyles.chipBtn,
                {
                  borderColor: local.discounted ? colors.tint : colors.border,
                  backgroundColor: local.discounted ? colors.tintLight : colors.background,
                },
              ]}
              onPress={() => setLocal((p) => ({ ...p, discounted: !p.discounted }))}
              activeOpacity={0.7}
            >
              <FontAwesome name="tag" size={14} color={local.discounted ? colors.tint : colors.textMuted} />
              <Text style={[fStyles.chipBtnText, { color: local.discounted ? colors.tint : colors.text }]}>
                Tylko przecenione
              </Text>
              {local.discounted && <FontAwesome name="check" size={12} color={colors.tint} />}
            </TouchableOpacity>
          </ScrollView>

          {/* Actions */}
          <View style={[fStyles.sheetFooter, { borderTopColor: colors.border }]}>
            {hasFilters && (
              <TouchableOpacity
                style={[fStyles.clearBtn, { borderColor: colors.border }]}
                onPress={() => setLocal(EMPTY_FILTERS)}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Wyczyść</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[fStyles.applyBtn, { backgroundColor: colors.tint, flex: hasFilters ? 1 : undefined }]}
              onPress={() => {
                Keyboard.dismiss();
                onApply(local);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 15 }}>Zastosuj filtry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const fStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetBody: { padding: 16 },
  filterLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  chipBtnText: { fontSize: 14, fontWeight: '500', flex: 1 },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  clearBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});

// ── Main Screen ──

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useThemeColors();
  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);
  const navigation = useNavigation();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters & Sort
  const [sort, setSort] = useState<SortOption>('popularity');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.minPrice) c++;
    if (filters.maxPrice) c++;
    if (filters.warehouse) c++;
    if (filters.discounted) c++;
    return c;
  }, [filters]);

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
        const params: Record<string, any> = {
          category: slug,
          sort,
          page: pageNum,
          limit: PAGE_LIMIT,
        };
        if (filters.minPrice) params.minPrice = filters.minPrice.replace(',', '.');
        if (filters.maxPrice) params.maxPrice = filters.maxPrice.replace(',', '.');
        if (filters.warehouse) params.warehouse = filters.warehouse;
        if (filters.discounted) params.discounted = 'true';

        const res = await api.get<any>('/products', params);

        if (pageNum === 1) {
          setProducts(res.products || []);
        } else {
          setProducts((prev) => [...prev, ...(res.products || [])]);
        }

        // API returns flat: { products, total, page, limit, totalPages }
        setTotalPages(res.totalPages ?? res.pagination?.pages ?? 1);
        setTotalProducts(res.total ?? res.pagination?.total ?? 0);
        setPage(pageNum);
      } catch (err: any) {
        setError(err.message || 'Nie udało się pobrać produktów');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [slug, sort, filters]
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

  const handleApplyFilters = useCallback((f: Filters) => {
    setFilters(f);
  }, []);

  const categoryName = category?.name || slug || 'Kategoria';

  // Keep the header title in sync with the loaded category name
  useEffect(() => {
    navigation.setOptions({ title: categoryName });
  }, [categoryName, navigation]);

  // Loading state
  if (loading && products.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: categoryName }} />
        <View style={dynamicStyles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={dynamicStyles.loadingText}>Ładowanie...</Text>
        </View>
      </>
    );
  }

  // Error state
  if (error && products.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: categoryName }} />
        <View style={dynamicStyles.centered}>
          <FontAwesome name="exclamation-triangle" size={40} color={colors.destructive} />
          <Text style={dynamicStyles.errorText}>{error}</Text>
          <TouchableOpacity style={dynamicStyles.retryBtn} onPress={() => fetchProducts(1)}>
            <Text style={dynamicStyles.retryBtnText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: categoryName }} />
      <View style={dynamicStyles.container}>
        {/* Sort + Filter bar */}
        <View style={dynamicStyles.toolbar}>
          <Text style={dynamicStyles.resultCount}>
            {totalProducts} produkt{totalProducts === 1 ? '' : totalProducts < 5 ? 'y' : 'ów'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Filter button */}
            <TouchableOpacity
              style={[dynamicStyles.sortButton, activeFilterCount > 0 && { borderColor: colors.tint }]}
              onPress={() => setShowFilters(true)}
              activeOpacity={0.7}
            >
              <FontAwesome name="sliders" size={14} color={activeFilterCount > 0 ? colors.tint : colors.textSecondary} />
              <Text style={[dynamicStyles.sortButtonText, activeFilterCount > 0 && { color: colors.tint }]}>
                Filtry{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>
            {/* Sort button */}
            <TouchableOpacity
              style={dynamicStyles.sortButton}
              onPress={() => setShowSortMenu(!showSortMenu)}
              activeOpacity={0.7}
            >
              <FontAwesome name="sort" size={14} color={colors.textSecondary} />
              <Text style={dynamicStyles.sortButtonText}>
                {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </Text>
              <FontAwesome
                name={showSortMenu ? 'chevron-up' : 'chevron-down'}
                size={10}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={dynamicStyles.chipBar}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {filters.minPrice !== '' && (
              <View style={[dynamicStyles.activeChip, { backgroundColor: colors.tintLight }]}>
                <Text style={[dynamicStyles.activeChipText, { color: colors.tint }]}>Od {filters.minPrice} zł</Text>
                <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, minPrice: '' }))}>
                  <FontAwesome name="times-circle" size={14} color={colors.tint} />
                </TouchableOpacity>
              </View>
            )}
            {filters.maxPrice !== '' && (
              <View style={[dynamicStyles.activeChip, { backgroundColor: colors.tintLight }]}>
                <Text style={[dynamicStyles.activeChipText, { color: colors.tint }]}>Do {filters.maxPrice} zł</Text>
                <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, maxPrice: '' }))}>
                  <FontAwesome name="times-circle" size={14} color={colors.tint} />
                </TouchableOpacity>
              </View>
            )}
            {filters.warehouse !== '' && (
              <View style={[dynamicStyles.activeChip, { backgroundColor: colors.tintLight }]}>
                <Text style={[dynamicStyles.activeChipText, { color: colors.tint }]}>
                  {WAREHOUSES.find((w) => w.id === filters.warehouse)?.label}
                </Text>
                <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, warehouse: '' }))}>
                  <FontAwesome name="times-circle" size={14} color={colors.tint} />
                </TouchableOpacity>
              </View>
            )}
            {filters.discounted && (
              <View style={[dynamicStyles.activeChip, { backgroundColor: colors.tintLight }]}>
                <Text style={[dynamicStyles.activeChipText, { color: colors.tint }]}>Przecenione</Text>
                <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, discounted: false }))}>
                  <FontAwesome name="times-circle" size={14} color={colors.tint} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* Sort dropdown */}
        {showSortMenu && (
          <View style={dynamicStyles.sortDropdown}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  dynamicStyles.sortOption,
                  sort === option.value && dynamicStyles.sortOptionActive,
                ]}
                onPress={() => handleSortChange(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    dynamicStyles.sortOptionText,
                    sort === option.value && dynamicStyles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sort === option.value && (
                  <FontAwesome name="check" size={12} color={colors.tint} />
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

        {/* Filter Modal */}
        <FilterModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onApply={handleApplyFilters}
          colors={colors}
        />
      </View>
    </>
  );
}

const createDynamicStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textMuted,
    },
    errorText: {
      marginTop: 12,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: colors.tint,
      borderRadius: 8,
    },
    retryBtnText: {
      color: colors.textInverse,
      fontWeight: '600',
    },

    // Toolbar
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resultCount: {
      fontSize: 13,
      color: colors.textMuted,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    sortButtonText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500',
    },

    // Sort dropdown
    sortDropdown: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      borderBottomColor: colors.borderLight,
    },
    sortOptionActive: {
      borderBottomColor: colors.tintMuted,
    },
    sortOptionText: {
      fontSize: 14,
      color: colors.text,
    },
    sortOptionTextActive: {
      color: colors.tint,
      fontWeight: '600',
    },

    // Active filter chips
    chipBar: {
      backgroundColor: colors.card,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    activeChipText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });
