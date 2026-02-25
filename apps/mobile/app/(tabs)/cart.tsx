import React, { useState, useEffect, useMemo } from 'react';
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
import { checkoutApi } from '../../services/orders';
import CartItem from '../../components/cart/CartItem';
import Button from '../../components/ui/Button';

// Free shipping threshold per warehouse (in PLN) - same as backend
const FREE_SHIPPING_THRESHOLD = 300;

// Warehouse display names (by city) - matching web version
const WHOLESALER_CONFIG: Record<string, { name: string; color: string }> = {
  'HP': { name: 'Magazyn Zielona Góra', color: '#3b82f6' },
  'Hurtownia Przemysłowa': { name: 'Magazyn Zielona Góra', color: '#3b82f6' },
  'Ikonka': { name: 'Magazyn Białystok', color: '#a855f7' },
  'BTP': { name: 'Magazyn Chotów', color: '#22c55e' },
  'Leker': { name: 'Magazyn Chynów', color: '#ef4444' },
  'Gastro': { name: 'Magazyn Chotów', color: '#eab308' },
  'Horeca': { name: 'Magazyn Chotów', color: '#f97316' },
  'Forcetop': { name: 'Magazyn Chotów', color: '#14b8a6' },
  'Rzeszów': { name: 'Magazyn Rzeszów', color: '#ec4899' },
  'Outlet': { name: 'Magazyn Rzeszów', color: '#ec4899' },
  'default': { name: 'Magazyn Chynów', color: '#6b7280' },
};

function getWholesalerConfig(wholesaler: string | null | undefined) {
  if (!wholesaler) return WHOLESALER_CONFIG['default'];
  return WHOLESALER_CONFIG[wholesaler] || { name: wholesaler, color: '#6b7280' };
}

export default function CartScreen() {
  const router = useRouter();
  const { cart, itemCount, updateQuantity, removeFromCart, applyCoupon, removeCoupon, refreshCart, loading } = useCart();
  const { isAuthenticated } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [shippingPrices, setShippingPrices] = useState<Record<string, number>>({});
  const [totalShippingCost, setTotalShippingCost] = useState<number>(0);
  const [loadingShipping, setLoadingShipping] = useState(false);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.discount || 0;
  const total = cart?.total || 0;

  // Fetch shipping prices per package (same logic as web version)
  useEffect(() => {
    async function fetchShippingPrices() {
      if (!cart?.items || cart.items.length === 0) return;

      setLoadingShipping(true);
      try {
        const cartItems = cart.items.map(item => ({
          variantId: item.variant.id,
          quantity: item.quantity,
        }));

        const response = await checkoutApi.getShippingPerPackage(cartItems);

        // Build shipping prices per wholesaler - use LOWEST available price
        const prices: Record<string, number> = {};
        let lowestTotal = 0;
        for (const pkg of response.packagesWithOptions) {
          const wholesaler = pkg.package.wholesaler || 'default';
          const availableMethods = pkg.shippingMethods.filter((m: any) => m.available);
          if (availableMethods.length > 0) {
            const lowestPrice = Math.min(...availableMethods.map((m: any) => m.price));
            prices[wholesaler] = lowestPrice;
            lowestTotal += lowestPrice;
          }
        }
        setShippingPrices(prices);
        setTotalShippingCost(lowestTotal);
      } catch (err) {
        console.error('Failed to fetch shipping prices:', err);
      } finally {
        setLoadingShipping(false);
      }
    }

    fetchShippingPrices();
  }, [cart?.items]);

  // Group items by warehouse and calculate per-package subtotals
  const packages = useMemo(() => {
    if (!items.length) return [];

    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      const wholesaler = item.variant.product.wholesaler || 'default';
      if (!grouped[wholesaler]) grouped[wholesaler] = [];
      grouped[wholesaler].push(item);
    }

    return Object.entries(grouped).map(([wholesaler, packageItems]) => {
      const config = getWholesalerConfig(wholesaler);
      const pkgSubtotal = packageItems.reduce(
        (sum, item) => sum + (Number(item.variant.price) * item.quantity),
        0
      );

      return {
        wholesaler,
        displayName: config.name,
        color: config.color,
        items: packageItems,
        subtotal: pkgSubtotal,
        shippingPrice: shippingPrices[wholesaler] || 0,
      };
    });
  }, [items, shippingPrices]);

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

  const totalPackages = packages.length;

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
        {/* Cart items grouped by warehouse with shipping info */}
        {packages.map((pkg, pkgIndex) => (
          <View key={pkg.wholesaler} style={styles.packageContainer}>
            {/* Package Header */}
            <View style={styles.packageHeader}>
              <View style={styles.packageHeaderLeft}>
                <View style={[styles.warehouseBadge, { backgroundColor: pkg.color }]}>
                  <Text style={styles.warehouseBadgeText}>📍</Text>
                </View>
                <View style={styles.packageHeaderInfo}>
                  <Text style={styles.packageWarehouseName}>{pkg.displayName}</Text>
                  <Text style={styles.packageCount}>
                    Paczka {pkgIndex + 1}/{totalPackages}
                  </Text>
                </View>
              </View>
              <Text style={styles.packageSubtotal}>
                {pkg.subtotal.toFixed(2).replace('.', ',')} zł
              </Text>
            </View>

            {/* Package Items */}
            {pkg.items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))}

            {/* Estimated Delivery per Package */}
            <View style={styles.shippingBar}>
              <View style={styles.shippingBarTop}>
                <View style={styles.shippingLabelRow}>
                  <Text style={styles.shippingIcon}>📦</Text>
                  <Text style={styles.shippingLabel}>Szacowana dostawa</Text>
                  <View style={styles.infoCircle}>
                    <Text style={styles.infoCircleText}>i</Text>
                  </View>
                </View>
                <View>
                  {pkg.subtotal >= FREE_SHIPPING_THRESHOLD ? (
                    <Text style={styles.shippingFree}>GRATIS!</Text>
                  ) : pkg.shippingPrice > 0 ? (
                    <Text style={styles.shippingPrice}>
                      {pkg.shippingPrice.toFixed(2).replace('.', ',')} zł
                    </Text>
                  ) : (
                    <Text style={styles.shippingAtOrder}>obliczana przy zamówieniu</Text>
                  )}
                </View>
              </View>

              {/* Free shipping progress bar */}
              {pkg.subtotal < FREE_SHIPPING_THRESHOLD && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min((pkg.subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressBarText}>
                    <Text style={styles.progressBarAmount}>
                      {(FREE_SHIPPING_THRESHOLD - pkg.subtotal).toFixed(2).replace('.', ',')} zł
                    </Text>
                    {' '}do darmowej dostawy
                  </Text>
                </View>
              )}
            </View>
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
            <Text style={styles.summaryValue}>{subtotal.toFixed(2).replace('.', ',')} zł</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Rabat</Text>
              <Text style={styles.discountValue}>-{discount.toFixed(2).replace('.', ',')} zł</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Szacowana dostawa</Text>
            {loadingShipping ? (
              <Text style={styles.shippingInfo}>Obliczanie...</Text>
            ) : totalShippingCost > 0 ? (
              <Text style={styles.summaryValue}>
                {totalShippingCost.toFixed(2).replace('.', ',')} zł
              </Text>
            ) : (
              <Text style={styles.shippingInfo}>przy zamówieniu</Text>
            )}
          </View>
          {Object.keys(shippingPrices).length > 1 && (
            <Text style={styles.multiPackageInfo}>
              Otrzymasz {Object.keys(shippingPrices).length} przesyłki
            </Text>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Razem</Text>
            <Text style={styles.totalValue}>
              {(total + totalShippingCost).toFixed(2).replace('.', ',')} zł
            </Text>
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

  // Package container styles
  packageContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondary[50],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  packageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  warehouseBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warehouseBadgeText: {
    fontSize: 14,
    color: Colors.white,
  },
  packageHeaderInfo: {
    flex: 1,
  },
  packageWarehouseName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  packageCount: {
    fontSize: 11,
    color: Colors.secondary[500],
    marginTop: 1,
  },
  packageSubtotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[900],
  },

  // Shipping bar styles (per package)
  shippingBar: {
    backgroundColor: '#fff7ed', // orange-50
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#fed7aa', // orange-200
  },
  shippingBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shippingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shippingIcon: {
    fontSize: 14,
  },
  shippingLabel: {
    fontSize: 13,
    color: Colors.secondary[700],
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.secondary[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCircleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary[600],
  },
  shippingFree: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a', // green-600
  },
  shippingPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c', // orange-600
  },
  shippingAtOrder: {
    fontSize: 12,
    color: Colors.secondary[500],
    fontStyle: 'italic',
  },

  // Progress bar styles
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#fed7aa', // orange-200
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary[500],
  },
  progressBarText: {
    fontSize: 11,
    color: Colors.secondary[600],
    textAlign: 'center',
    marginTop: 4,
  },
  progressBarAmount: {
    fontWeight: '600',
    color: '#ea580c', // orange-600
  },

  // Coupon section
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

  // Summary bar
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
  multiPackageInfo: {
    fontSize: 12,
    color: Colors.secondary[500],
    textAlign: 'right',
    marginBottom: 8,
    marginTop: -4,
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
