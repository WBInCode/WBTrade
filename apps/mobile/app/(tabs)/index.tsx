import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '../../constants/Colors';
import { useMainCategories } from '../../hooks/useCategories';
import { useBestsellers, useFeatured, useNewProducts } from '../../hooks/useProducts';
import ProductCarousel from '../../components/product/ProductCarousel';

export default function HomeScreen() {
  const router = useRouter();
  const categories = useMainCategories();
  const bestsellers = useBestsellers(10);
  const featured = useFeatured(10);
  const newProducts = useNewProducts(10);

  const isRefreshing =
    categories.isRefetching || bestsellers.isRefetching || featured.isRefetching || newProducts.isRefetching;

  const onRefresh = () => {
    categories.refetch();
    bestsellers.refetch();
    featured.refetch();
    newProducts.refetch();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: Colors.white,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.primary[500] }}>
            WBTrade
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <FontAwesome name="search" size={20} color={Colors.secondary[500]} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        {categories.data && categories.data.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          >
            {categories.data.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => router.push(`/category/${cat.slug}`)}
                style={{
                  backgroundColor: Colors.white,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text style={{ fontSize: 13, color: Colors.secondary[700], fontWeight: '500' }}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Hero banner */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 20,
            backgroundColor: Colors.primary[500],
            borderRadius: 12,
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.white, marginBottom: 4 }}>
            Witaj w WBTrade!
          </Text>
          <Text style={{ fontSize: 14, color: Colors.primary[100], lineHeight: 20 }}>
            Odkryj najlepsze produkty w najlepszych cenach. Szybka dostawa i bezpieczne płatności.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/search')}
            style={{
              marginTop: 14,
              backgroundColor: Colors.white,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: Colors.primary[500], fontWeight: '600', fontSize: 14 }}>
              Przeglądaj produkty
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product carousels */}
        <ProductCarousel
          title="Bestsellery"
          products={bestsellers.data || []}
          loading={bestsellers.isLoading}
        />

        <ProductCarousel
          title="Polecane"
          products={featured.data || []}
          loading={featured.isLoading}
        />

        <ProductCarousel
          title="Nowości"
          products={newProducts.data || []}
          loading={newProducts.isLoading}
        />

        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
