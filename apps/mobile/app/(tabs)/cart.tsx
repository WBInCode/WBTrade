import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import Button from '../../components/ui/Button';

export default function CartScreen() {
  const router = useRouter();
  const { cart, itemCount, updateQuantity, removeFromCart, loading } = useCart();
  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.discount || 0;
  const total = cart?.total || 0;

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Koszyk</Text>
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (itemCount === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Koszyk</Text>
        </View>
        <View style={styles.emptyContainer}>
          <FontAwesome name="shopping-cart" size={64} color={Colors.secondary[300]} />
          <Text style={styles.emptyText}>Twój koszyk jest pusty</Text>
          <Text style={styles.emptyHint}>Dodaj produkty aby kontynuować zakupy</Text>
          <Button
            title="Przeglądaj produkty"
            onPress={() => router.push('/(tabs)')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Koszyk</Text>
        <Text style={styles.headerSubtitle}>
          {itemCount} {itemCount === 1 ? 'produkt' : itemCount < 5 ? 'produkty' : 'produktów'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => {
          const imageUrl = item.variant?.product?.images?.[0]?.url;
          const productName = item.variant?.product?.name || 'Produkt';
          const variantName = item.variant?.name || '';
          const unitPrice = Number(item.variant?.price) || 0;
          const lineTotal = item.quantity * unitPrice;

          return (
            <View key={item.id} style={styles.cartItem}>
              {/* Image */}
              <TouchableOpacity
                onPress={() => router.push(`/product/${item.variant?.product?.id}`)}
                style={styles.itemImageContainer}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.itemImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <FontAwesome name="image" size={20} color={Colors.secondary[300]} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{productName}</Text>
                {variantName ? (
                  <Text style={styles.itemVariant}>{variantName}</Text>
                ) : null}
                <Text style={styles.itemUnitPrice}>{unitPrice.toFixed(2)} zł / szt.</Text>

                {/* Quantity controls */}
                <View style={styles.quantityRow}>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => {
                        if (item.quantity <= 1) {
                          removeFromCart(item.id);
                        } else {
                          updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                    >
                      <FontAwesome
                        name={item.quantity <= 1 ? 'trash-o' : 'minus'}
                        size={12}
                        color={item.quantity <= 1 ? Colors.destructive : Colors.secondary[700]}
                      />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <FontAwesome name="plus" size={12} color={Colors.secondary[700]} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemTotal}>{lineTotal.toFixed(2)} zł</Text>
                </View>
              </View>

              {/* Remove button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromCart(item.id)}
              >
                <FontAwesome name="times" size={16} color={Colors.secondary[400]} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Summary */}
      <View style={styles.summary}>
        {discount > 0 && (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Suma produktów:</Text>
              <Text style={styles.summarySecondary}>{subtotal.toFixed(2)} zł</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rabat:</Text>
              <Text style={[styles.summarySecondary, { color: Colors.success }]}>
                -{discount.toFixed(2)} zł
              </Text>
            </View>
          </>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Do zapłaty:</Text>
          <Text style={styles.summaryTotalValue}>{total.toFixed(2)} zł</Text>
        </View>
        <Button
          title="Przejdź do kasy"
          onPress={() => {
            alert('Checkout będzie dostępny wkrótce');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  header: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.secondary[500],
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.secondary[900],
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  cartItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    position: 'relative',
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.secondary[100],
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginBottom: 2,
  },
  itemVariant: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginBottom: 2,
  },
  itemUnitPrice: {
    fontSize: 12,
    color: Colors.secondary[400],
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    borderRadius: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[900],
    minWidth: 28,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    backgroundColor: Colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[200],
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.secondary[500],
  },
  summarySecondary: {
    fontSize: 14,
    color: Colors.secondary[700],
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  summaryTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary[600],
  },
});
