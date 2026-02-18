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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { Colors } from '../../constants/Colors';
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
type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popularity';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Trafność' },
  { value: 'popularity', label: 'Popularność' },
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
    // Clear the route param
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

  // Reset display count when sort changes
  useEffect(() => { setDisplayCount(20); }, [sort]);

  // View states
  const showIdleState = !searched && query.length < 2;
  const showSuggestions = query.length >= 2 && !searched && (suggestProducts.length > 0 || suggestCategories.length > 0);

  // ─── Load initial data ────────────────────────────────────
  useEffect(() => {
    loadRecentSearches().then(setRecentSearches);
    fetchPopularSearches();
  }, []);

  // ─── Live suggestions while typing ────────────────────────
  useEffect(() => {
    if (warehouseFilter) return; // Don't live-search when warehouse filter is active
    if (debouncedQuery.length < 2) {
      setSuggestProducts([]);
      setSuggestCategories([]);
      return;
    }
    if (!searched) {
      fetchSuggestions(debouncedQuery);
    }
  }, [debouncedQuery]);

  // ─── API calls ────────────────────────────────────────────
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

    // Save to recent
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

  // ─── Handlers ─────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Search Bar ── */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={16} color={Colors.secondary[600]} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <FontAwesome name="search" size={15} color={Colors.secondary[400]} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Czego szukasz?"
            placeholderTextColor={Colors.secondary[400]}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome name="times-circle" size={17} color={Colors.secondary[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── IDLE: Recent + Popular ── */}
      {showIdleState && (
        <ScrollView style={styles.idleContainer} keyboardShouldPersistTaps="handled">
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ostatnio wyszukiwane</Text>
                <TouchableOpacity onPress={handleClearAllRecent}>
                  <Text style={styles.clearAllText}>Wyczyść</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((term, index) => (
                <TouchableOpacity
                  key={`recent-${index}`}
                  style={styles.recentItem}
                  onPress={() => handleRecentPress(term)}
                >
                  <FontAwesome name="clock-o" size={16} color={Colors.secondary[400]} />
                  <Text style={styles.recentText} numberOfLines={1}>{term}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveRecent(term)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.removeButton}
                  >
                    <FontAwesome name="times" size={14} color={Colors.secondary[400]} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {popularSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popularne wyszukiwania</Text>
              </View>
              <View style={styles.popularChips}>
                {popularSearches.map((term, index) => (
                  <TouchableOpacity
                    key={`popular-${index}`}
                    style={styles.popularChip}
                    onPress={() => handlePopularPress(term)}
                  >
                    <FontAwesome name="fire" size={12} color={Colors.primary[500]} />
                    <Text style={styles.popularChipText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {recentSearches.length === 0 && popularSearches.length === 0 && (
            <View style={styles.emptyIdle}>
              <FontAwesome name="search" size={40} color={Colors.secondary[200]} />
              <Text style={styles.emptyIdleText}>Wpisz czego szukasz</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── SUGGESTIONS (while typing) ── */}
      {showSuggestions && (
        <ScrollView style={styles.suggestionsScroll} keyboardShouldPersistTaps="handled">
          {/* Category suggestions */}
          {suggestCategories.map((cat) => (
            <TouchableOpacity
              key={`cat-${cat.id}`}
              style={styles.suggestionRow}
              onPress={() => handleSuggestionCategoryPress(cat)}
            >
              <View style={styles.suggestionIconWrap}>
                <FontAwesome name="th-large" size={14} color={Colors.primary[500]} />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionName}>{cat.name}</Text>
                <Text style={styles.suggestionMeta}>Kategoria</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={Colors.secondary[300]} />
            </TouchableOpacity>
          ))}

          {/* "Search for" row */}
          <TouchableOpacity style={styles.suggestionRow} onPress={handleSubmit}>
            <View style={styles.suggestionIconWrap}>
              <FontAwesome name="search" size={14} color={Colors.secondary[500]} />
            </View>
            <Text style={styles.suggestionSearchText}>
              Szukaj: <Text style={styles.suggestionSearchBold}>"{query}"</Text>
            </Text>
          </TouchableOpacity>

          {/* Product suggestions */}
          {suggestProducts.slice(0, 6).map((product) => (
            <TouchableOpacity
              key={`prod-${product.id}`}
              style={styles.suggestionRow}
              onPress={() => handleSuggestionProductPress(product)}
            >
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  style={styles.suggestionImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.suggestionImage, styles.suggestionImagePlaceholder]}>
                  <FontAwesome name="image" size={14} color={Colors.secondary[300]} />
                </View>
              )}
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.suggestionPrice}>{Number(product.price).toFixed(2)} zł</Text>
                {product.categoryName && (
                  <Text style={styles.suggestionMeta}>{product.categoryName}</Text>
                )}
              </View>
              <FontAwesome name="chevron-right" size={12} color={Colors.secondary[300]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Szukam...</Text>
        </View>
      )}

      {/* ── RESULTS ── */}
      {searched && !loading && (
        <>
          {products.length > 0 && (
            <View style={styles.toolbar}>
              <Text style={styles.resultCount}>
                {sortedProducts.length} wynik{sortedProducts.length === 1 ? '' : sortedProducts.length < 5 ? 'i' : 'ów'} dla "{query}"
              </Text>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setShowSort(!showSort)}
              >
                <FontAwesome name="sort-amount-desc" size={13} color={Colors.secondary[600]} />
                <Text style={styles.sortButtonText}>
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                </Text>
                <FontAwesome
                  name={showSort ? 'chevron-up' : 'chevron-down'}
                  size={10}
                  color={Colors.secondary[500]}
                />
              </TouchableOpacity>
            </View>
          )}

          {showSort && (
            <View style={styles.sortDropdown}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.sortOption, sort === option.value && styles.sortOptionActive]}
                  onPress={() => {
                    setSort(option.value);
                    setShowSort(false);
                  }}
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
                <FontAwesome name="search" size={40} color={Colors.secondary[300]} />
                <Text style={styles.emptyTitle}>Nie znaleziono produktów</Text>
                <Text style={styles.emptyHint}>Spróbuj użyć innych słów kluczowych</Text>
              </View>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },

  // Search bar
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary[100],
    borderRadius: 24,
    paddingHorizontal: 14,
    gap: 8,
  },
  warehouseFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary[50],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  warehouseFilterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warehouseFilterText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  warehouseFilterClear: {
    padding: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.secondary[900],
  },

  // Idle state
  idleContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  section: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary[700],
  },
  clearAllText: {
    fontSize: 13,
    color: Colors.primary[500],
    fontWeight: '500',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.secondary[200],
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: Colors.secondary[700],
  },
  removeButton: {
    padding: 4,
  },
  popularChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 16,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary[100],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  popularChipText: {
    fontSize: 13,
    color: Colors.secondary[700],
  },
  emptyIdle: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIdleText: {
    fontSize: 15,
    color: Colors.secondary[400],
  },

  // Suggestions
  suggestionsScroll: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.secondary[200],
  },
  suggestionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: Colors.secondary[100],
  },
  suggestionImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    color: Colors.secondary[800],
    lineHeight: 18,
  },
  suggestionPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginTop: 2,
  },
  suggestionMeta: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 1,
  },
  suggestionSearchText: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary[600],
  },
  suggestionSearchBold: {
    fontWeight: '600',
    color: Colors.secondary[800],
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
    flex: 1,
    fontSize: 13,
    color: Colors.secondary[500],
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.secondary[300],
  },
  sortButtonText: {
    fontSize: 13,
    color: Colors.secondary[700],
  },
  sortDropdown: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
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
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.secondary[100],
  },
  sortOptionActive: {},
  sortOptionText: {
    fontSize: 14,
    color: Colors.secondary[700],
  },
  sortOptionTextActive: {
    color: Colors.primary[600],
    fontWeight: '600',
  },

  // Results
  results: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.secondary[500],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary[700],
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
  },


});
