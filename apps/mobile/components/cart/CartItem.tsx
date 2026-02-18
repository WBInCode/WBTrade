import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import type { CartItem as CartItemType } from '../../services/types';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const router = useRouter();
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
      Alert.alert(
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
      Alert.alert('Brak w magazynie', `Maksymalna dostępna ilość: ${availableStock}`);
      return;
    }
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleRemove = () => {
    Alert.alert(
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
          <Text style={styles.qtyValue}>{item.quantity}</Text>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.secondary[100],
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
    color: Colors.secondary[900],
    lineHeight: 20,
  },
  variantName: {
    fontSize: 12,
    color: Colors.secondary[500],
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
    color: Colors.secondary[600],
    backgroundColor: Colors.secondary[100],
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
    color: Colors.secondary[900],
  },
  comparePrice: {
    fontSize: 13,
    color: Colors.secondary[400],
    textDecorationLine: 'line-through',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[200],
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary[300],
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
    color: Colors.secondary[700],
  },
  qtyButtonTextDisabled: {
    color: Colors.secondary[300],
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[900],
    minWidth: 32,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.secondary[300],
    paddingVertical: 6,
  },
  lineTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.secondary[100],
  },
  removeText: {
    fontSize: 16,
    color: Colors.secondary[600],
    fontWeight: '600',
  },
  stockWarning: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 8,
    fontWeight: '500',
  },
});
