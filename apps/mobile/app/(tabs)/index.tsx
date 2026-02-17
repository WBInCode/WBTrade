import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/Colors';
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
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>WBTrade</Text>
          <Text style={styles.headerSubtitle}>Twój sklep internetowy</Text>
        </View>

        {/* Categories Menu */}
        {data?.categories && data.categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <TouchableOpacity 
              style={styles.categoriesHeader}
              onPress={() => setCategoriesExpanded(!categoriesExpanded)}
            >
              <Text style={styles.categoriesTitle}>Kategorie</Text>
              <Text style={styles.categoriesMainArrow}>
                {categoriesExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            
            {categoriesExpanded && (
              <View style={styles.categoriesList}>
              {data.categories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const hasChildren = category.children && category.children.length > 0;
                
                return (
                  <View key={category.id} style={styles.categoryItem}>
                    <TouchableOpacity
                      style={styles.categoryButton}
                      onPress={() => {
                        if (hasChildren) {
                          setExpandedCategories(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(category.id)) {
                              newSet.delete(category.id);
                            } else {
                              newSet.add(category.id);
                            }
                            return newSet;
                          });
                        } else {
                          router.push(`/(tabs)/search?category=${category.slug}`);
                        }
                      }}
                    >
                      <Text style={styles.categoryMainName}>{category.name}</Text>
                      {hasChildren && (
                        <Text style={styles.categoryArrow}>
                          {isExpanded ? '▼' : '▶'}
                        </Text>
                      )}
                    </TouchableOpacity>
                    
                    {isExpanded && hasChildren && (
                      <View style={styles.subcategoriesList}>
                        {category.children!.map((subcategory) => (
                          <TouchableOpacity
                            key={subcategory.id}
                            style={styles.subcategoryButton}
                            onPress={() => router.push(`/(tabs)/search?category=${subcategory.slug}`)}
                          >
                            <Text style={styles.subcategoryName}>{subcategory.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
              </View>
            )}
          </View>
        )}

        {/* Featured / Polecane */}
        {data?.featured && data.featured.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Polecane</Text>
            <ProductCarousel products={data.featured} />
          </View>
        )}

        {/* New Arrivals / Nowości */}
        {data?.newArrivals && data.newArrivals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🆕 Nowości</Text>
            <ProductCarousel products={data.newArrivals} />
          </View>
        )}

        {/* Bestsellers */}
        {data?.bestsellers && data.bestsellers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Bestsellery</Text>
            <ProductCarousel products={data.bestsellers} />
          </View>
        )}

        {/* Seasonal */}
        {data?.seasonal && data.seasonal.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Sezonowe</Text>
            <ProductCarousel products={data.seasonal} />
          </View>
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
    backgroundColor: Colors.white,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.secondary[600],
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[900],
    paddingHorizontal: 16,
    marginBottom: 12,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.secondary[300],
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[700],
  },
  categoriesSection: {
    backgroundColor: Colors.white,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[900],
    flex: 1,
  },
  categoriesMainArrow: {
    fontSize: 16,
    color: Colors.primary[600],
    fontWeight: '700',
    marginLeft: 8,
  },
  categoriesList: {
    gap: 8,
  },
  categoryItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  categoryMainName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[900],
    flex: 1,
  },
  categoryArrow: {
    fontSize: 12,
    color: Colors.secondary[600],
    marginLeft: 8,
  },
  subcategoriesList: {
    backgroundColor: Colors.secondary[50],
    paddingLeft: 24,
    paddingVertical: 8,
  },
  subcategoryButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  subcategoryName: {
    fontSize: 14,
    color: Colors.secondary[700],
  },
});
