import React from 'react';
import { FlatList, View, Text, ActivityIndicator, RefreshControl } from 'react-native';
import ProductCard, { CARD_WIDTH, CARD_GAP, CARD_PADDING } from './ProductCard';
import Spinner from '../ui/Spinner';
import { Colors } from '../../constants/Colors';
import type { Product } from '../../services/types';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  emptyMessage?: string;
}

export default function ProductGrid({
  products,
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  hasNextPage = false,
  isFetchingNextPage = false,
  emptyMessage = 'Nie znaleziono produktów',
}: ProductGridProps) {
  if (loading && products.length === 0) {
    return <Spinner fullScreen />;
  }

  return (
    <FlatList
      data={products}
      numColumns={2}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={({ item }) => (
        <View style={{ marginBottom: CARD_GAP }}>
          <ProductCard product={item} />
        </View>
      )}
      columnWrapperStyle={{
        gap: CARD_GAP,
        paddingHorizontal: CARD_PADDING,
      }}
      contentContainerStyle={{
        paddingTop: CARD_GAP,
        paddingBottom: 20,
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
            colors={[Colors.primary[500]]}
          />
        ) : undefined
      }
      onEndReached={hasNextPage ? onEndReached : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary[500]} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
          <Text style={{ color: Colors.secondary[400], fontSize: 15 }}>{emptyMessage}</Text>
        </View>
      }
    />
  );
}
