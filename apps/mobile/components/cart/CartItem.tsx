import React, { useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { customAlert } from '../ui/CustomAlert';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import type { CartItem as CartItemType } from '../../services/types';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Quantity bounce animation
  const qtyScale = useRef(new Animated.Value(1)).current;
  const prevQty = useRef(item.quantity);
  useEffect(() => {
    if (item.quantity !== prevQty.current) {
      Animated.sequence([
        Animated.spring(qtyScale, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
        Animated.spring(qtyScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
      ]).start();
    }
    prevQty.current = item.quantity;
  }, [item.quantity, qtyScale]);

  const { variant } = item;
  const product = variant.product;
  const imageUrl = product.images?.[0]?.url;
  const price = Number(variant.price);
  const compareAtPrice = variant.compareAtPrice ? Number(variant.compareAtPrice) : null;
  const lineTotal = price * item.quantity;
  const availableStock = variant.inventory?.[0]
    ? variant.inventory[0].quantity - variant.inventory[0].reserved
    : 99;

  const handleDecrease = () => {
    if (item.quantity <= 1) {
      customAlert(
        'Usuń produkt',
        'Czy na pewno chcesz usunąć ten produkt z koszyka?',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Usuń', style: 'destructive', onPress: () => onRemove(item.id) },
        ]
      );
    } else {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (item.quantity >= availableStock) {
      customAlert('Brak w magazynie', `Maksymalna dostępna ilość: ${availableStock}`);
      return;
    }
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleRemove = () => {
    customAlert(
      'Usuń produkt',
      `Czy na pewno chcesz usunąć "${product.name}" z koszyka?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Usuń', style: 'destructive', onPress: () => onRemove(item.id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Image + Product Info */}
      <TouchableOpacity
        style={styles.productRow}
        onPress={() => router.push(`/product/${product.id}`)}
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>📦</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          {variant.name && variant.name !== product.name && (
            <Text style={styles.variantName} numberOfLines={1}>
              {variant.name}
            </Text>
          )}
          {Object.entries(variant.attributes || {}).length > 0 && (
            <View style={styles.attributesRow}>
              {Object.entries(variant.attributes).map(([key, value]) => (
                <Text key={key} style={styles.attributeText}>
                  {key}: {value}
                </Text>
              ))}
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{price.toFixed(2).replace('.', ',')} zł</Text>
            {compareAtPrice && compareAtPrice > price && (
              <Text style={styles.comparePrice}>{compareAtPrice.toFixed(2).replace('.', ',')} zł</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Quantity + Total + Remove */}
      <View style={styles.bottomRow}>
        <View style={styles.quantityControl}>
          <TouchableOpacity style={styles.qtyButton} onPress={handleDecrease}>
            <Text style={styles.qtyButtonText}>−</Text>
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: qtyScale }] }}>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
          </Animated.View>
          <TouchableOpacity
            style={[styles.qtyButton, item.quantity >= availableStock && styles.qtyButtonDisabled]}
            onPress={handleIncrease}
            disabled={item.quantity >= availableStock}
          >
            <Text style={[styles.qtyButtonText, item.quantity >= availableStock && styles.qtyButtonTextDisabled]}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.lineTotal}>{lineTotal.toFixed(2).replace('.', ',')} zł</Text>

        <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Stock warning */}
      {availableStock <= 5 && availableStock > 0 && (
        <Text style={styles.stockWarning}>
          Pozostało tylko {availableStock} szt.
        </Text>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
  },
  info: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  variantName: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  attributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  attributeText: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  comparePrice: {
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  qtyButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.3,
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  qtyButtonTextDisabled: {
    color: colors.border,
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    minWidth: 32,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
  },
  lineTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.tint,
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.backgroundTertiary,
  },
  removeText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  stockWarning: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 8,
    fontWeight: '500',
  },
});
