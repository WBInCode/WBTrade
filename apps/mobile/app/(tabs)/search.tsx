import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/Colors';
import ProductGrid from '../../components/product/ProductGrid';
import type { Product } from '../../services/types';

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const categorySlug = params.category as string | undefined;
  
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [categoryName, setCategoryName] = useState<string>('');

  // Load products by category on mount if category param exists
  useEffect(() => {
    if (categorySlug) {
      loadCategoryProducts(categorySlug);
    }
  }, [categorySlug]);
  const loadCategoryProducts = async (slug: string) => {
    setLoading(true);
    setSearched(true);
    try {
      // First get category details
      const catResponse = await api.get<{ category: { name: string } }>(`/categories/${slug}`);
      setCategoryName(catResponse.category?.name || slug);
      
      // Then get products for this category
      const response = await api.get<{ products: Product[] }>('/products', {
        category: slug,
        limit: 100,
      });
      setProducts(response.products || []);
    } catch (err) {
      console.error('Category products error:', err);
      setCategoryName(slug);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await api.get<{ products: Product[] }>('/search', {
        q: searchQuery,
        limit: 50,
      });
      setProducts(response.products || []);
    } catch (err) {
      console.error('Search error:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Category Header */}
      {categoryName && (
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{categoryName}</Text>
        </View>
      )}
      
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj produktów..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch(query)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Results */}
      <ScrollView style={styles.scrollView}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary[600]} />
          </View>
        ) : searched ? (
          products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>Nie znaleziono produktów</Text>
              <Text style={styles.emptyHint}>Spróbuj użyć innych słów kluczowych</Text>
            </View>
          )
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>🔍</Text>
            <Text style={styles.emptyHint}>Wpisz nazwę produktu aby wyszukać</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  categoryHeader: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  searchBar: {
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  searchInput: {
    backgroundColor: Colors.secondary[100],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.secondary[900],
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.secondary[600],
    textAlign: 'center',
  },
});
