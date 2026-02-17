import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import Badge from '../ui/Badge';
import type { Product } from '../../services/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 16;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

interface ProductCardProps {
  product: Product;
  width?: number;
}

export default function ProductCard({ product, width }: ProductCardProps) {
  const router = useRouter();
  const cardWidth = width || CARD_WIDTH;

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const compareAt = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice)
      : product.compareAtPrice
    : null;
  const hasDiscount = compareAt && compareAt > price;

  const imageUrl = product.images?.[0]?.url;

  const badgeMap: Record<string, { text: string; variant: 'danger' | 'primary' | 'success' | 'warning' }> = {
    'super-price': { text: 'Super cena', variant: 'danger' },
    outlet: { text: 'Outlet', variant: 'warning' },
    bestseller: { text: 'Bestseller', variant: 'primary' },
    new: { text: 'Nowość', variant: 'success' },
  };

  const badge = product.badge ? badgeMap[product.badge] : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.7}
      style={{
        width: cardWidth,
        backgroundColor: Colors.white,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Image */}
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: Colors.secondary[100] }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: Colors.secondary[400], fontSize: 12 }}>Brak zdjęcia</Text>
          </View>
        )}

        {/* Badge */}
        {badge && (
          <View style={{ position: 'absolute', top: 8, left: 8 }}>
            <Badge text={badge.text} variant={badge.variant} />
          </View>
        )}

        {/* Discount percentage */}
        {hasDiscount && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: Colors.destructive,
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>
              -{Math.round(((compareAt - price) / compareAt) * 100)}%
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ padding: 10 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 13,
            color: Colors.secondary[800],
            lineHeight: 18,
            marginBottom: 6,
          }}
        >
          {product.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: hasDiscount ? Colors.destructive : Colors.secondary[900],
            }}
          >
            {price.toFixed(2)} zł
          </Text>
          {hasDiscount && (
            <Text
              style={{
                fontSize: 12,
                color: Colors.secondary[400],
                textDecorationLine: 'line-through',
              }}
            >
              {compareAt.toFixed(2)} zł
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export { CARD_WIDTH, CARD_GAP, CARD_PADDING };
