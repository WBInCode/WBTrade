import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import CartItem from '../../components/cart/CartItem';
import Button from '../../components/ui/Button';

export default function CartScreen() {
  const router = useRouter();
  const { cart, itemCount, updateQuantity, removeFromCart, applyCoupon, removeCoupon, refreshCart, loading } = useCart();
  const { isAuthenticated } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.discount || 0;
  const total = cart?.total || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCart();
    setRefreshing(false);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      await applyCoupon(couponCode.trim());
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err.message || 'Nieprawidłowy kod kuponu');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon();
    } catch (err: any) {
      Alert.alert('Błąd', err.message || 'Nie udało się usunąć kuponu');
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Zaloguj się',
        'Aby złożyć zamówienie musisz się zalogować lub kontynuować jako gość.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Zaloguj się', onPress: () => router.push('/(auth)/login') },
          { text: 'Kontynuuj jako gość', onPress: () => router.push('/checkout/') },
        ]
      );
    } else {
      router.push('/checkout/');
    }
  };

  // Empty cart state
  if (!loading && itemCount === 0) {
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

  // Group items by warehouse (like web version)
  const warehouseGroups = items.reduce<Record<string, typeof items>>((groups, item) => {
    const warehouse = item.variant.product.wholesaler || 'default';
    if (!groups[warehouse]) groups[warehouse] = [];
    groups[warehouse].push(item);
    return groups;
  }, {});

  const getWarehouseName = (key: string): string => {
    if (key === 'default') return 'Magazyn WBTrade';
    const parts = key.split('_');
    if (parts.length > 1) return `Magazyn ${parts.slice(1).join(' ')}`;
    return `Magazyn ${key}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Koszyk</Text>
        <Text style={styles.headerSubtitle}>
          {itemCount} {itemCount === 1 ? 'produkt' : itemCount < 5 ? 'produkty' : 'produktów'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Cart items grouped by warehouse */}
        {Object.entries(warehouseGroups).map(([warehouse, warehouseItems]) => (
          <View key={warehouse} style={styles.warehouseGroup}>
            {Object.keys(warehouseGroups).length > 1 && (
              <View style={styles.warehouseHeader}>
                <Text style={styles.warehouseIcon}>📦</Text>
                <Text style={styles.warehouseName}>{getWarehouseName(warehouse)}</Text>
                <Text style={styles.warehouseCount}>
                  {warehouseItems.length} {warehouseItems.length === 1 ? 'produkt' : 'produkty'}
                </Text>
              </View>
            )}
            {warehouseItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </View>
        ))}

        {/* Coupon section */}
        <View style={styles.couponSection}>
          <Text style={styles.couponLabel}>Kod rabatowy</Text>
          {cart?.couponCode ? (
            <View style={styles.couponApplied}>
              <View style={styles.couponBadge}>
                <Text style={styles.couponBadgeText}>🎫 {cart.couponCode}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Text style={styles.couponRemove}>Usuń</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputRow}>
              <TextInput
                style={styles.couponInput}
                placeholder="Wpisz kod kuponu"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Button
                title="Zastosuj"
                onPress={handleApplyCoupon}
                loading={couponLoading}
                size="sm"
                variant="outline"
              />
            </View>
          )}
          {couponError ? (
            <Text style={styles.couponErrorText}>{couponError}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Summary bar */}
      <View style={styles.summary}>
        <View style={styles.summaryRows}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Suma produktów</Text>
            <Text style={styles.summaryValue}>{subtotal.toFixed(2)} zł</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Rabat</Text>
              <Text style={styles.discountValue}>-{discount.toFixed(2)} zł</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Wysyłka</Text>
            <Text style={styles.shippingInfo}>obliczona w następnym kroku</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Do zapłaty</Text>
            <Text style={styles.totalValue}>{total.toFixed(2)} zł</Text>
          </View>
        </View>
        <Button
          title="Dostawa i płatność"
          onPress={handleCheckout}
          fullWidth
          size="lg"
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
    paddingBottom: 24,
  },
  warehouseGroup: {
    marginBottom: 16,
  },
  warehouseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  warehouseIcon: {
    fontSize: 16,
  },
  warehouseName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
    flex: 1,
  },
  warehouseCount: {
    fontSize: 12,
    color: Colors.secondary[500],
  },
  couponSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  couponLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 10,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  couponInput: {
    flex: 1,
    backgroundColor: Colors.secondary[100],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.secondary[900],
  },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponBadge: {
    backgroundColor: Colors.success + '15',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  couponBadgeText: {
    color: Colors.success,
    fontWeight: '600',
    fontSize: 14,
  },
  couponRemove: {
    color: Colors.destructive,
    fontWeight: '600',
    fontSize: 14,
  },
  couponErrorText: {
    color: Colors.destructive,
    fontSize: 13,
    marginTop: 6,
  },
  summary: {
    backgroundColor: Colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[200],
  },
  summaryRows: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.secondary[600],
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.secondary[900],
    fontWeight: '500',
  },
  discountLabel: {
    fontSize: 14,
    color: Colors.success,
  },
  discountValue: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
  },
  shippingInfo: {
    fontSize: 12,
    color: Colors.secondary[400],
    fontStyle: 'italic',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[200],
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary[600],
  },
});
