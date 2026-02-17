import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ProductCard from './ProductCard';
import Spinner from '../ui/Spinner';
import { Colors } from '../../constants/Colors';
import type { Product } from '../../services/types';

interface ProductCarouselProps {
  title: string;
  products: Product[];
  loading?: boolean;
  onSeeAll?: () => void;
}

const CAROUSEL_CARD_WIDTH = 160;

export default function ProductCarousel({
  title,
  products,
  loading = false,
  onSeeAll,
}: ProductCarouselProps) {
  if (loading) {
    return (
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: Colors.secondary[900],
            paddingHorizontal: 16,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
        <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner size="small" />
        </View>
      </View>
    );
  }

  if (products.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: Colors.secondary[900],
          }}
        >
          {title}
        </Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={{ color: Colors.primary[500], fontSize: 14, fontWeight: '500' }}>
              Pokaż wszystkie
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal list */}
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        renderItem={({ item }) => (
          <ProductCard product={item} width={CAROUSEL_CARD_WIDTH} />
        )}
      />
    </View>
  );
}
