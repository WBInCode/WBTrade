import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/Colors';
import ProductGrid from '../../components/product/ProductGrid';
import type { Product } from '../../services/types';

function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popularity';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Trafność' },
  { value: 'popularity', label: 'Popularność' },
  { value: 'newest', label: 'Najnowsze' },
  { value: 'price_asc', label: 'Cena rosnąco' },
  { value: 'price_desc', label: 'Cena malejąco' },
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ warehouse?: string }>();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  const [products, setProducts] = useState<Product[]>([]);
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
      setProducts(response.products || []);
      setTotal(response.total || response.products?.length || 0);
    } catch (err) {
      console.error('Warehouse products error:', err);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const clearWarehouseFilter = () => {
    setWarehouseFilter(null);
    setProducts([]);
    setTotal(0);
    setSearched(false);
    setQuery('');
    // Clear the route param
    router.setParams({ warehouse: '' });
  };

  // Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Live search
  useEffect(() => {
    if (warehouseFilter) return; // Don't live-search when warehouse filter is active
    if (debouncedQuery.length < 2) {
      setProducts([]);
      setTotal(0);
      setSearched(false);
      setSuggestions([]);
      return;
    }

    performSearch(debouncedQuery);
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery, sort, warehouseFilter]);

  // Reload warehouse products when sort changes
  useEffect(() => {
    if (warehouseFilter) {
      loadWarehouseProducts(warehouseFilter);
    }
  }, [sort]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    try {
      const response = await api.get<{ products: Product[]; total: number }>('/search', {
        query: searchQuery,
        sort: sort !== 'relevance' ? sort : undefined,
        limit: 50,
      });
      setProducts(response.products || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Search error:', err);
      // Fallback: try /products endpoint with search
      try {
        const fallback = await api.get<{ products: Product[] }>('/products', {
          search: searchQuery,
          sort: sort !== 'relevance' ? sort : undefined,
          limit: 50,
        });
        setProducts(fallback.products || []);
        setTotal(fallback.products?.length || 0);
      } catch {
        setProducts([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      const data = await api.get<{ suggestions: string[] }>('/search/suggest', {
        query: searchQuery,
      });
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setQuery('');
    setProducts([]);
    setTotal(0);
    setSearched(false);
    setSuggestions([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        {warehouseFilter ? (
          <View style={styles.warehouseFilterBar}>
            <View style={styles.warehouseFilterInfo}>
              <Ionicons name="storefront-outline" size={18} color={Colors.primary[600]} />
              <Text style={styles.warehouseFilterText}>
                {WAREHOUSE_NAMES[warehouseFilter] || `Magazyn ${warehouseFilter}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.warehouseFilterClear} onPress={clearWarehouseFilter}>
              <Ionicons name="close-circle" size={22} color={Colors.secondary[400]} />
            </TouchableOpacity>
          </View>
        ) : (
        <View style={styles.searchInputContainer}>
          <FontAwesome name="search" size={16} color={Colors.secondary[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj produktów..."
            placeholderTextColor={Colors.secondary[400]}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowSuggestions(true);
            }}
            onSubmitEditing={() => {
              if (query.length >= 2) performSearch(query);
            }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <FontAwesome name="times-circle" size={18} color={Colors.secondary[400]} />
            </TouchableOpacity>
          )}
        </View>
        )}
      </View>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && query.length >= 2 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(suggestion)}
            >
              <FontAwesome name="search" size={12} color={Colors.secondary[400]} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sort + Results count */}
      {searched && !loading && products.length > 0 && (
        <View style={styles.toolbar}>
          <Text style={styles.resultCount}>
            {total} wynik{total === 1 ? '' : total < 5 ? 'i' : 'ów'}
          </Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSort(!showSort)}
          >
            <FontAwesome name="sort" size={14} color={Colors.secondary[600]} />
            <Text style={styles.sortButtonText}>
              {SORT_OPTIONS.find((o) => o.value === sort)?.label}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort dropdown */}
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

      {/* Results */}
      <View style={styles.results}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Szukam...</Text>
          </View>
        ) : searched ? (
          products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <View style={styles.centerContent}>
              <FontAwesome name="search" size={40} color={Colors.secondary[300]} />
              <Text style={styles.emptyTitle}>Nie znaleziono produktów</Text>
              <Text style={styles.emptyHint}>
                Spróbuj użyć innych słów kluczowych
              </Text>
            </View>
          )
        ) : (
          <View style={styles.centerContent}>
            <FontAwesome name="search" size={48} color={Colors.secondary[200]} />
            <Text style={styles.emptyHint}>
              Wpisz minimum 2 znaki aby wyszukać
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  searchHeader: {
    backgroundColor: Colors.white,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary[100],
    borderRadius: 10,
    paddingHorizontal: 12,
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
  suggestionsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[100],
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.secondary[700],
  },
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
    borderBottomWidth: 1,
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
