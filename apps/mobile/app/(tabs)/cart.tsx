import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import Button from '../../components/ui/Button';

export default function CartScreen() {
  const router = useRouter();
  const { cart, itemCount } = useCart();
  const items = cart?.items || [];
  const total = cart?.total || 0;

  if (itemCount === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Koszyk</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
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
        <Text style={styles.headerSubtitle}>{itemCount} {itemCount === 1 ? 'produkt' : 'produkty'}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.variant.product.name}
              </Text>
              <Text style={styles.itemPrice}>
                {item.quantity} x {Number(item.variant.price).toFixed(2)} zł
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              {(item.quantity * Number(item.variant.price)).toFixed(2)} zł
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Suma:</Text>
          <Text style={styles.summaryValue}>{total.toFixed(2)} zł</Text>
        </View>
        <Button
          title="Przejdź do kasy"
          onPress={() => {
            // TODO: Implement checkout flow
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
    color: Colors.secondary[600],
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.secondary[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: Colors.secondary[600],
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  summary: {
    backgroundColor: Colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary[900],
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary[600],
  },
});
