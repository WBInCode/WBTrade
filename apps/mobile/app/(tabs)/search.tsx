// Search screen component
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { Colors } from '../../constants/Colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import ProductGrid from '../../components/product/ProductGrid';
import type { Product } from '../../services/types';

// ─── Constants ───────────────────────────────────────────────
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 15;

// ─── Debounce hook ───────────────────────────────────────────
function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Sort ────────────────────────────────────────────────────
type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popularity' | 'top-rated';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Trafność' },
  { value: 'popularity', label: 'Popularność' },
  { value: 'top-rated', label: 'Najlepiej oceniane' },
  { value: 'newest', label: 'Najnowsze' },
  { value: 'price_asc', label: 'Cena rosnąco' },
  { value: 'price_desc', label: 'Cena malejąco' },
];

function sortProducts(products: Product[], sortBy: SortOption): Product[] {
  if (sortBy === 'relevance' || sortBy === 'popularity') return products;
  const sorted = [...products];
  switch (sortBy) {
    case 'price_asc':
      return sorted.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price_desc':
      return sorted.sort((a, b) => Number(b.price) - Number(a.price));
    case 'newest':
      return sorted.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    case 'top-rated':
      return sorted.sort((a, b) => {
        const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      });
    default:
      return sorted;
  }
}

// ─── API types ───────────────────────────────────────────────
interface SuggestProduct {
  type: 'product';
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  categoryName?: string;
}

interface SuggestCategory {
  type: 'category';
  id: string;
  name: string;
  slug: string;
}

interface SuggestResponse {
  products: SuggestProduct[];
  categories: SuggestCategory[];
}

// ─── Recent searches helpers ─────────────────────────────────
async function loadRecentSearches(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function saveRecentSearch(query: string): Promise<string[]> {
  try {
    const existing = await loadRecentSearches();
    const filtered = existing.filter((s) => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [query];
  }
}

async function removeRecentSearch(query: string): Promise<string[]> {
  try {
    const existing = await loadRecentSearches();
    const updated = existing.filter((s) => s !== query);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

async function clearAllRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
}

// ═════════════════════════════════════════════════════════════
// SearchScreen
// ═════════════════════════════════════════════════════════════
export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ warehouse?: string }>();
  const inputRef = useRef<TextInput>(null);
  const colors = useThemeColors();

  // Results fade animation
  const resultsFadeAnim = useRef(new Animated.Value(0)).current;

  // Trigger fade-in when results appear
  useEffect(() => {
    if (searched && !loading) {
      resultsFadeAnim.setValue(0);
      Animated.timing(resultsFadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [searched, loading, resultsFadeAnim]);

  // ─── State ─────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  // Results
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sort, setSort] = useState<SortOption>('relevance');
  const [showSort, setShowSort] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState<string | null>(null);

  // Warehouse filter names
  const WAREHOUSE_NAMES: Record<string, string> = {
    'hp': 'Magazyn Zielona Góra',
    'ikonka': 'Magazyn Białystok',
    'btp': 'Magazyn Chotów',
    'leker': 'Magazyn Chynów',
    'outlet': 'Magazyn Rzeszów',
  };

  // Handle warehouse param from cart
  useEffect(() => {
    if (params.warehouse) {
      setWarehouseFilter(params.warehouse);
      loadWarehouseProducts(params.warehouse);
    }
  }, [params.warehouse]);

  const loadWarehouseProducts = async (warehouse: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const response = await api.get<{ products: Product[]; total: number }>('/products', {
        warehouse,
        sort: sort !== 'relevance' ? sort : undefined,
        limit: 50,
      });
      setRawProducts(response.products || []);
      setTotal(response.total || response.products?.length || 0);
    } catch (err) {
      console.error('Warehouse products error:', err);
      setRawProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const clearWarehouseFilter = () => {
    setWarehouseFilter(null);
    setRawProducts([]);
    setTotal(0);
    setSearched(false);
    setQuery('');
    router.setParams({ warehouse: '' });
  };

  // Infinite scroll
  const [displayCount, setDisplayCount] = useState(20);
  const LOAD_MORE_COUNT = 20;

  // Suggestions (live from API while typing)
  const [suggestProducts, setSuggestProducts] = useState<SuggestProduct[]>([]);
  const [suggestCategories, setSuggestCategories] = useState<SuggestCategory[]>([]);

  // Recent & popular
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);

  const sortedProducts = useMemo(() => sortProducts(rawProducts, sort), [rawProducts, sort]);
  const products = useMemo(() => sortedProducts.slice(0, displayCount), [sortedProducts, displayCount]);
  const hasMoreToShow = displayCount < sortedProducts.length;

  const handleLoadMore = useCallback(() => {
    if (hasMoreToShow) {
      setDisplayCount((prev) => prev + LOAD_MORE_COUNT);
    }
  }, [hasMoreToShow]);

  useEffect(() => { setDisplayCount(20); }, [sort]);

  const showIdleState = !searched && query.length < 2;
  const showSuggestions = query.length >= 2 && !searched && (suggestProducts.length > 0 || suggestCategories.length > 0);

  useEffect(() => {
    loadRecentSearches().then(setRecentSearches);
    fetchPopularSearches();
  }, []);

  useEffect(() => {
    if (warehouseFilter) return;
    if (debouncedQuery.length < 2) {
      setSuggestProducts([]);
      setSuggestCategories([]);
      return;
    }
    if (!searched) {
      fetchSuggestions(debouncedQuery);
    }
  }, [debouncedQuery]);

  const fetchPopularSearches = async () => {
    try {
      const data = await api.get<{ searches: string[] }>('/search/popular', { limit: 8 });
      setPopularSearches(data.searches || []);
    } catch {
      setPopularSearches([]);
    }
  };

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    setSuggestProducts([]);
    setSuggestCategories([]);

    const updated = await saveRecentSearch(searchQuery);
    setRecentSearches(updated);
    setDisplayCount(20);

    try {
      const response = await api.get<{ products: Product[]; total: number }>('/search', {
        query: searchQuery,
        limit: 500,
      });
      setRawProducts(response.products || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Search error:', err);
      try {
        const fallback = await api.get<{ products: Product[] }>('/products', {
          search: searchQuery,
          limit: 500,
        });
        setRawProducts(fallback.products || []);
        setTotal(fallback.products?.length || 0);
      } catch {
        setRawProducts([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      const data = await api.get<SuggestResponse>('/search/suggest', {
        query: searchQuery,
      });
      setSuggestProducts(data.products || []);
      setSuggestCategories(data.categories || []);
    } catch {
      setSuggestProducts([]);
      setSuggestCategories([]);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setSearched(false);
      setRawProducts([]);
      setTotal(0);
    }
  };

  const handleSubmit = () => {
    if (query.length >= 2) performSearch(query);
  };

  const handleRecentPress = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const handleRemoveRecent = async (term: string) => {
    const updated = await removeRecentSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = async () => {
    await clearAllRecentSearches();
    setRecentSearches([]);
  };

  const handlePopularPress = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const handleSuggestionProductPress = (product: SuggestProduct) => {
    saveRecentSearch(query).then(setRecentSearches);
    router.push(`/product/${product.id}`);
  };

  const handleSuggestionCategoryPress = (category: SuggestCategory) => {
    saveRecentSearch(query).then(setRecentSearches);
    router.push(`/category/${category.slug}`);
  };

  const handleClear = () => {
    setQuery('');
    setRawProducts([]);
    setTotal(0);
    setSearched(false);
    setSuggestProducts([]);
    setSuggestCategories([]);
    inputRef.current?.focus();
  };

  const handleBack = () => {
    if (searched) {
      setSearched(false);
      setRawProducts([]);
      setTotal(0);
      inputRef.current?.focus();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Search Bar ── */}
      <View style={[styles.searchHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: colors.backgroundTertiary }]}>
          <FontAwesome name="chevron-left" size={16} color={colors.icon} />
        </TouchableOpacity>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.searchBackground }]}>
          <FontAwesome name="search" size={15} color={colors.searchPlaceholder} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.searchText }]}
            placeholder="Czego szukasz?"
            placeholderTextColor={colors.searchPlaceholder}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome name="times-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── IDLE: Recent + Popular ── */}
      {showIdleState && (
        <ScrollView style={[styles.idleContainer, { backgroundColor: colors.card }]} keyboardShouldPersistTaps="handled">
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ostatnio wyszukiwane</Text>
                <TouchableOpacity onPress={handleClearAllRecent}>
                  <Text style={[styles.clearAllText, { color: colors.tint }]}>Wyczyść</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((term, index) => (
                <TouchableOpacity
                  key={`recent-${index}`}
                  style={[styles.recentItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => handleRecentPress(term)}
                >
                  <FontAwesome name="clock-o" size={16} color={colors.textMuted} />
                  <Text style={[styles.recentText, { color: colors.textSecondary }]} numberOfLines={1}>{term}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveRecent(term)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.removeButton}
                  >
                    <FontAwesome name="times" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {popularSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Popularne wyszukiwania</Text>
              </View>
              <View style={styles.popularChips}>
                {popularSearches.map((term, index) => (
                  <TouchableOpacity
                    key={`popular-${index}`}
                    style={[styles.popularChip, { backgroundColor: colors.backgroundTertiary }]}
                    onPress={() => handlePopularPress(term)}
                  >
                    <FontAwesome name="fire" size={12} color={colors.tint} />
                    <Text style={[styles.popularChipText, { color: colors.textSecondary }]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {recentSearches.length === 0 && popularSearches.length === 0 && (
            <View style={styles.emptyIdle}>
              <FontAwesome name="search" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyIdleText, { color: colors.textMuted }]}>Wpisz czego szukasz</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── SUGGESTIONS (while typing) ── */}
      {showSuggestions && (
        <ScrollView style={[styles.suggestionsScroll, { backgroundColor: colors.card }]} keyboardShouldPersistTaps="handled">
          {suggestCategories.map((cat) => (
            <TouchableOpacity
              key={`cat-${cat.id}`}
              style={[styles.suggestionRow, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleSuggestionCategoryPress(cat)}
            >
              <View style={[styles.suggestionIconWrap, { backgroundColor: colors.backgroundTertiary }]}>
                <FontAwesome name="th-large" size={14} color={colors.tint} />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={[styles.suggestionName, { color: colors.text }]}>{cat.name}</Text>
                <Text style={[styles.suggestionMeta, { color: colors.textSecondary }]}>Kategoria</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.suggestionRow, { borderBottomColor: colors.borderLight }]} onPress={handleSubmit}>
            <View style={[styles.suggestionIconWrap, { backgroundColor: colors.backgroundTertiary }]}>
              <FontAwesome name="search" size={14} color={colors.textSecondary} />
            </View>
            <Text style={[styles.suggestionSearchText, { color: colors.textSecondary }]}>
              Szukaj: <Text style={[styles.suggestionSearchBold, { color: colors.text }]}>"{query}"</Text>
            </Text>
          </TouchableOpacity>

          {suggestProducts.slice(0, 6).map((product) => (
            <TouchableOpacity
              key={`prod-${product.id}`}
              style={[styles.suggestionRow, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleSuggestionProductPress(product)}
            >
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  style={[styles.suggestionImage, { backgroundColor: colors.backgroundTertiary }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.suggestionImage, styles.suggestionImagePlaceholder, { backgroundColor: colors.backgroundTertiary }]}>
                  <FontAwesome name="image" size={14} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.suggestionContent}>
                <Text style={[styles.suggestionName, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
                <Text style={[styles.suggestionPrice, { color: colors.text }]}>{Number(product.price).toFixed(2).replace('.', ',')} zł</Text>
                {product.categoryName && (
                  <Text style={[styles.suggestionMeta, { color: colors.textSecondary }]}>{product.categoryName}</Text>
                )}
              </View>
              <FontAwesome name="chevron-right" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Szukam...</Text>
        </View>
      )}

      {/* ── WAREHOUSE FILTER BAR ── */}
      {warehouseFilter && (
        <View style={[styles.warehouseFilterBar, { backgroundColor: colors.tintLight, borderBottomColor: colors.border }]}>
          <View style={styles.warehouseFilterInfo}>
            <FontAwesome name="building-o" size={16} color={colors.tint} />
            <Text style={[styles.warehouseFilterText, { color: colors.tint }]}>
              {WAREHOUSE_NAMES[warehouseFilter] || warehouseFilter}
            </Text>
          </View>
          <TouchableOpacity style={styles.warehouseFilterClear} onPress={clearWarehouseFilter}>
            <FontAwesome name="times-circle" size={20} color={colors.tint} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── RESULTS ── */}
      {searched && !loading && (
        <Animated.View style={{ flex: 1, opacity: resultsFadeAnim }}>
          {products.length > 0 && (
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                {sortedProducts.length} wynik{sortedProducts.length === 1 ? '' : sortedProducts.length < 5 ? 'i' : 'ów'}
                {warehouseFilter ? ` z ${WAREHOUSE_NAMES[warehouseFilter] || warehouseFilter}` : query ? ` dla "${query}"` : ''}
              </Text>
              <TouchableOpacity
                style={[styles.sortButton, { borderColor: colors.border }]}
                onPress={() => setShowSort(!showSort)}
              >
                <FontAwesome name="sort-amount-desc" size={13} color={colors.icon} />
                <Text style={[styles.sortButtonText, { color: colors.textSecondary }]}>
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                </Text>
                <FontAwesome
                  name={showSort ? 'chevron-up' : 'chevron-down'}
                  size={10}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {showSort && (
            <View style={[styles.sortDropdown, { backgroundColor: colors.card, borderBottomColor: colors.border, shadowColor: colors.shadow }]}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.sortOption, { borderBottomColor: colors.borderLight }]}
                  onPress={() => {
                    setSort(option.value);
                    setShowSort(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: colors.textSecondary },
                      sort === option.value && { color: colors.tint, fontWeight: '600' },
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

          <View style={styles.results}>
            {products.length > 0 ? (
              <ProductGrid
                products={products}
                onEndReached={handleLoadMore}
                hasNextPage={hasMoreToShow}
                isFetchingNextPage={false}
              />
            ) : (
              <View style={styles.centerContent}>
                <FontAwesome name="search" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Nie znaleziono produktów</Text>
                <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>Spróbuj użyć innych słów kluczowych</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },

  searchHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, gap: 8,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  searchInputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, paddingHorizontal: 14, gap: 8,
  },
  searchInput: {
    flex: 1, paddingVertical: 10, fontSize: 16,
  },

  idleContainer: { flex: 1 },
  section: { paddingTop: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  clearAllText: { fontSize: 13, fontWeight: '500' },
  recentItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentText: { flex: 1, fontSize: 15 },
  removeButton: { padding: 4 },
  popularChips: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 8, paddingBottom: 16,
  },
  popularChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  popularChipText: { fontSize: 13 },
  emptyIdle: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIdleText: { fontSize: 15 },

  suggestionsScroll: { flex: 1 },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionIconWrap: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestionImage: { width: 44, height: 44, borderRadius: 6 },
  suggestionImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  suggestionContent: { flex: 1 },
  suggestionName: { fontSize: 14, lineHeight: 18 },
  suggestionPrice: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  suggestionMeta: { fontSize: 12, marginTop: 1 },
  suggestionSearchText: { flex: 1, fontSize: 14 },
  suggestionSearchBold: { fontWeight: '600' },

  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultCount: { flex: 1, fontSize: 13 },
  sortButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1,
  },
  sortButtonText: { fontSize: 13 },
  sortDropdown: {
    borderBottomWidth: 1, elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  sortOption: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortOptionText: { fontSize: 14 },

  results: { flex: 1 },
  centerContent: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, paddingHorizontal: 32, gap: 12,
  },
  loadingText: { fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyHint: { fontSize: 14, textAlign: 'center' },

  warehouseFilterBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  warehouseFilterInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warehouseFilterText: { fontSize: 15, fontWeight: '600' },
  warehouseFilterClear: { padding: 2 },
});
