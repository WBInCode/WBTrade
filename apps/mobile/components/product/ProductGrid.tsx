import React from 'react';
import { FlatList, View, Text, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import ProductCard, { CARD_WIDTH, CARD_GAP, CARD_PADDING, getNumColumns } from './ProductCard';
import Spinner from '../ui/Spinner';
import { useThemeColors } from '../../hooks/useThemeColors';
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
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = getNumColumns(screenWidth);

  if (loading && products.length === 0) {
    return <Spinner fullScreen />;
  }

  return (
    <FlatList
      key={`grid-${numColumns}`}
      data={products}
      numColumns={numColumns}
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
        paddingBottom: 80,
        ...(products.length === 0 && { flexGrow: 1 }),
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        ) : undefined
      }
      onEndReached={hasNextPage ? onEndReached : undefined}
      onEndReachedThreshold={0.5}
      initialNumToRender={8}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews={true}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.backgroundTertiary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <FontAwesome name="inbox" size={32} color={colors.textMuted} />
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6, textAlign: 'center' }}>
            {emptyMessage}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
            Spróbuj zmienić filtry lub wybierz inną kategorię
          </Text>
        </View>
      }
    />
  );
}
