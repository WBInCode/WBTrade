import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import Badge from '../ui/Badge';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Product } from '../../services/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 16;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

interface ProductCardProps {
  product: Product;
  width?: number;
}

function ProductCard({ product, width }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isInWishlist, toggle: toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [adding, setAdding] = useState(false);
  const isFav = isInWishlist(product.id);
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
        style={styles.clickable}
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
              <FontAwesome name="image" size={24} color={colors.border} />
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

          {/* Heart / Favourite */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={(e) => {
              e.stopPropagation();
              if (!user) {
                router.push('/(auth)/login');
                return;
              }
              toggleWishlist(product.id);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FontAwesome
              name={isFav ? 'heart' : 'heart-o'}
              size={18}
              color={isFav ? colors.destructive : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.name}>
            {product.name}
          </Text>

          {/* Star rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <FontAwesome
                key={star}
                name="star"
                size={10}
                color={
                  star <= Math.round(Number(product.rating || 0))
                    ? '#f59e0b'
                    : colors.border
                }
              />
            ))}
            <Text style={styles.ratingText}>
              ({product.reviewCount || 0})
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text
              style={[
                styles.price,
                hasDiscount && { color: colors.destructive },
              ]}
            >
              {price.toFixed(2).replace('.', ',')} zł
            </Text>
            {hasDiscount && (
              <Text style={styles.oldPrice}>
                {compareAt.toFixed(2).replace('.', ',')} zł
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
        style={[styles.addButton, !hasStock && styles.addButtonDisabled, adding && styles.addButtonAdding]}
        onPress={async () => {
          if (!hasStock || adding) return;
          const variantId = product.variants?.[0]?.id;
          if (!variantId) {
            router.push(`/product/${product.id}`);
            return;
          }
          setAdding(true);
          try {
            await addToCart(variantId, 1, {
              productId: product.id,
              name: product.name,
              imageUrl: imageUrl,
              price,
              quantity: 1,
              warehouse: product.wholesaler || undefined,
            });
          } catch {}
          setAdding(false);
        }}
        activeOpacity={0.8}
        disabled={!hasStock || adding}
      >
        {adding ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <>
            <FontAwesome name="shopping-cart" size={13} color={colors.textInverse} />
            <Text style={styles.addButtonText}>Do koszyka</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  clickable: {
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.backgroundTertiary,
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
    backgroundColor: colors.destructive,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  heartBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  info: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  name: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    height: 36,
    marginBottom: 2,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 2,
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
    color: colors.text,
  },
  oldPrice: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  deliveryText: {
    fontSize: 11,
    color: colors.tint,
    fontWeight: '500',
  },
  deliveryOutOfStock: {
    color: colors.destructive,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
    paddingVertical: 8,
    gap: 6,
  },
  addButtonDisabled: {
    backgroundColor: colors.border,
  },
  addButtonAdding: {
    opacity: 0.8,
  },
  addButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
});

export { CARD_WIDTH, CARD_GAP, CARD_PADDING };

export default React.memo(ProductCard);
