import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import ProductCarousel from '../../components/product/ProductCarousel';
import type { Product, Category } from '../../services/types';

interface HomeData {
  bestsellers: Product[];
  featured: Product[];
  seasonal: Product[];
  newArrivals: Product[];
  categories: Category[];
}

export default function HomeScreen() {
  const router = useRouter();
  const { itemCount } = useCart();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setError(null);
      
      // Load each independently so one failure doesn't block others
      const results: HomeData = { bestsellers: [], featured: [], seasonal: [], newArrivals: [], categories: [] };
      
      const [bestRes, featRes, seasRes, newRes, catRes] = await Promise.allSettled([
        api.get<{ products: Product[] }>('/products/bestsellers', { limit: 10 }),
        api.get<{ products: Product[] }>('/products/featured', { limit: 10 }),
        api.get<{ products: Product[] }>('/products/seasonal', { limit: 10 }),
        api.get<{ products: Product[] }>('/products/new-arrivals', { limit: 10 }),
        api.get<{ categories: Category[] }>('/categories/main'),
      ]);

      if (bestRes.status === 'fulfilled') results.bestsellers = bestRes.value.products || [];
      if (featRes.status === 'fulfilled') results.featured = featRes.value.products || [];
      if (seasRes.status === 'fulfilled') results.seasonal = seasRes.value.products || [];
      if (newRes.status === 'fulfilled') results.newArrivals = newRes.value.products || [];
      if (catRes.status === 'fulfilled') results.categories = catRes.value.categories || [];

      // If all failed, try regular products endpoint as fallback
      if (!results.bestsellers.length && !results.featured.length && !results.seasonal.length && !results.newArrivals.length) {
        try {
          const fallback = await api.get<{ products: Product[] }>('/products', { limit: 20, sort: 'newest' });
          results.featured = fallback.products || [];
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
          setError('Nie udało się załadować produktów. Sprawdź połączenie z internetem.');
        }
      }

      setData(results);
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError(err.message || 'Nie udało się załadować produktów');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.centerContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>Pociągnij w dół aby spróbować ponownie</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header with logo + search + cart */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerLogo}>WB Trade</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/search')} style={styles.headerIcon}>
                <FontAwesome name="search" size={20} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(tabs)/cart')} style={styles.headerIcon}>
                <FontAwesome name="shopping-cart" size={20} color={Colors.white} />
                {itemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {/* Search bar */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push('/(tabs)/search')}
            activeOpacity={0.8}
          >
            <FontAwesome name="search" size={14} color={Colors.secondary[400]} />
            <Text style={styles.searchPlaceholder}>Szukaj produktów...</Text>
          </TouchableOpacity>
        </View>

        {/* Orange category bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryBar}
          contentContainerStyle={styles.categoryBarContent}
        >
          <TouchableOpacity
            style={styles.categoryBarItem}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.categoryBarText}>Wszystkie</Text>
          </TouchableOpacity>
          {data?.categories?.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryBarItem}
              onPress={() => router.push(`/category/${cat.slug}`)}
            >
              <Text style={styles.categoryBarText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured / Polecane */}
        {data?.featured && data.featured.length > 0 && (
          <ProductCarousel title="Polecane" products={data.featured} />
        )}

        {/* Bestsellers */}
        {data?.bestsellers && data.bestsellers.length > 0 && (
          <ProductCarousel title="Bestsellery" products={data.bestsellers} />
        )}

        {/* New Arrivals / Nowości */}
        {data?.newArrivals && data.newArrivals.length > 0 && (
          <ProductCarousel title="Nowości" products={data.newArrivals} />
        )}

        {/* Seasonal */}
        {data?.seasonal && data.seasonal.length > 0 && (
          <ProductCarousel title="Sezonowe" products={data.seasonal} />
        )}

        {/* View All Products Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.viewAllText}>Zobacz wszystkie produkty</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    backgroundColor: Colors.secondary[900],
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLogo: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary[500],
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    position: 'relative',
    padding: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: Colors.destructive,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: Colors.secondary[400],
  },
  categoryBar: {
    backgroundColor: Colors.primary[500],
    maxHeight: 44,
  },
  categoryBarContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  categoryBarItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  categoryBarText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: Colors.destructive,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: Colors.secondary[600],
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  viewAllButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
