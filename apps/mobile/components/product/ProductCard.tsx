import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
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

  const price = Number(
    typeof product.price === 'string' ? parseFloat(product.price) : product.price
  ) || 0;
  const compareAt = product.compareAtPrice
    ? Number(
        typeof product.compareAtPrice === 'string'
          ? parseFloat(product.compareAtPrice)
          : product.compareAtPrice
      )
    : null;
  const hasDiscount = compareAt != null && compareAt > price;

  const imageUrl = product.images?.[0]?.url;

  const badgeMap: Record<string, { text: string; variant: 'danger' | 'primary' | 'success' | 'warning' }> = {
    'super-price': { text: 'Super cena', variant: 'danger' },
    outlet: { text: 'Outlet', variant: 'warning' },
    bestseller: { text: 'Bestseller', variant: 'primary' },
    new: { text: 'Nowość', variant: 'success' },
  };

  const badge = product.badge ? badgeMap[product.badge] : null;

  // Check stock from variants
  const hasStock = product.variants
    ? product.variants.some((v) => v.stock > 0)
    : true;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {/* Clickable area */}
      <TouchableOpacity
        onPress={() => router.push(`/product/${product.id}`)}
        activeOpacity={0.7}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <FontAwesome name="image" size={24} color={Colors.secondary[300]} />
            </View>
          )}

          {/* Badge */}
          {badge && (
            <View style={styles.badgeContainer}>
              <Badge text={badge.text} variant={badge.variant} />
            </View>
          )}

          {/* Discount percentage */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{Math.round(((compareAt - price) / compareAt) * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.name}>
            {product.name}
          </Text>

          <View style={styles.priceRow}>
            <Text
              style={[
                styles.price,
                hasDiscount && { color: Colors.destructive },
              ]}
            >
              {price.toFixed(2)} zł
            </Text>
            {hasDiscount && (
              <Text style={styles.oldPrice}>
                {compareAt.toFixed(2)} zł
              </Text>
            )}
          </View>

          {/* Delivery info */}
          <Text style={[styles.deliveryText, !hasStock && styles.deliveryOutOfStock]}>
            {hasStock ? 'Wysyłka w 24-72h' : 'Niedostępny'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Add to cart button */}
      <TouchableOpacity
        style={[styles.addButton, !hasStock && styles.addButtonDisabled]}
        onPress={() => router.push(`/product/${product.id}`)}
        activeOpacity={0.8}
      >
        <FontAwesome name="shopping-cart" size={13} color={Colors.white} />
        <Text style={styles.addButtonText}>Do koszyka</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.secondary[100],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.destructive,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  info: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[100],
  },
  name: {
    fontSize: 13,
    color: Colors.secondary[800],
    lineHeight: 18,
    marginBottom: 4,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  oldPrice: {
    fontSize: 12,
    color: Colors.secondary[400],
    textDecorationLine: 'line-through',
  },
  deliveryText: {
    fontSize: 11,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  deliveryOutOfStock: {
    color: Colors.destructive,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    paddingVertical: 8,
    gap: 6,
  },
  addButtonDisabled: {
    backgroundColor: Colors.secondary[300],
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

export { CARD_WIDTH, CARD_GAP, CARD_PADDING };
