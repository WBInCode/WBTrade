import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { pluralizeProducts } from '../../utils/pluralize';
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
import { Colors, ThemeColors } from '../../constants/Colors';
import { useThemeColors } from '../../hooks/useThemeColors';
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
  const colors = useThemeColors();
  const ds = useMemo(() => createDynamicStyles(colors), [colors]);
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
          { text: 'Kontynuuj jako gość', onPress: () => router.push('/checkout' as any) },
        ]
      );
    } else {
      router.push('/checkout' as any);
    }
  };

  // Empty cart state
  if (!loading && itemCount === 0) {
    return (
      <SafeAreaView style={ds.container} edges={['top']}>
        <View style={ds.header}>
          <Text style={ds.headerTitle}>Koszyk</Text>
        </View>
        <View style={ds.emptyContainer}>
          <Text style={ds.emptyIcon}>🛒</Text>
          <Text style={ds.emptyText}>Twój koszyk jest pusty</Text>
          <Text style={ds.emptyHint}>Dodaj produkty aby kontynuować zakupy</Text>
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
    <SafeAreaView style={ds.container} edges={['top']}>
      <View style={ds.header}>
        <Text style={ds.headerTitle}>Koszyk</Text>
        <Text style={ds.headerSubtitle}>
          {pluralizeProducts(itemCount)}
        </Text>
      </View>

      <ScrollView
        style={ds.scrollView}
        contentContainerStyle={ds.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {/* Cart items grouped by warehouse with shipping info */}
        {packages.map((pkg, pkgIndex) => (
          <View key={pkg.wholesaler} style={ds.packageContainer}>
            {/* Package Header */}
            <View style={ds.packageHeader}>
              <View style={ds.packageHeaderLeft}>
                <View style={[ds.warehouseBadge, { backgroundColor: pkg.color }]}>
                  <Text style={ds.warehouseBadgeText}>📍</Text>
                </View>
                <View style={ds.packageHeaderInfo}>
                  <Text style={ds.packageWarehouseName}>{pkg.displayName}</Text>
                  <Text style={ds.packageCount}>
                    Paczka {pkgIndex + 1}/{totalPackages}
                  </Text>
                </View>
              </View>
              <Text style={ds.packageSubtotal}>
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
            <View style={ds.shippingBar}>
              <View style={ds.shippingBarTop}>
                <View style={ds.shippingLabelRow}>
                  <Text style={ds.shippingIcon}>📦</Text>
                  <Text style={ds.shippingLabel}>Szacowana dostawa</Text>
                  <View style={ds.infoCircle}>
                    <Text style={ds.infoCircleText}>i</Text>
                  </View>
                </View>
                <View>
                  {pkg.subtotal >= FREE_SHIPPING_THRESHOLD ? (
                    <Text style={ds.shippingFree}>GRATIS!</Text>
                  ) : pkg.shippingPrice > 0 ? (
                    <Text style={ds.shippingPrice}>
                      {pkg.shippingPrice.toFixed(2).replace('.', ',')} zł
                    </Text>
                  ) : (
                    <Text style={ds.shippingAtOrder}>obliczana przy zamówieniu</Text>
                  )}
                </View>
              </View>

              {/* Free shipping progress bar */}
              {pkg.subtotal < FREE_SHIPPING_THRESHOLD && (
                <View style={ds.progressBarContainer}>
                  <View style={ds.progressBarTrack}>
                    <View
                      style={[
                        ds.progressBarFill,
                        { width: `${Math.min((pkg.subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={ds.progressBarText}>
                    <Text style={ds.progressBarAmount}>
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
        <View style={ds.couponSection}>
          <Text style={ds.couponLabel}>Kod rabatowy</Text>
          {cart?.couponCode ? (
            <View style={ds.couponApplied}>
              <View style={ds.couponBadge}>
                <Text style={ds.couponBadgeText}>🎫 {cart.couponCode}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Text style={ds.couponRemove}>Usuń</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={ds.couponInputRow}>
              <TextInput
                style={ds.couponInput}
                placeholder="Wpisz kod kuponu"
                placeholderTextColor={colors.placeholder}
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
            <Text style={ds.couponErrorText}>{couponError}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Summary bar */}
      <View style={ds.summary}>
        <View style={ds.summaryRows}>
          <View style={ds.summaryRow}>
            <Text style={ds.summaryLabel}>Suma produktów</Text>
            <Text style={ds.summaryValue}>{subtotal.toFixed(2).replace('.', ',')} zł</Text>
          </View>
          {discount > 0 && (
            <View style={ds.summaryRow}>
              <Text style={ds.discountLabel}>Rabat</Text>
              <Text style={ds.discountValue}>-{discount.toFixed(2).replace('.', ',')} zł</Text>
            </View>
          )}
          <View style={ds.summaryRow}>
            <Text style={ds.summaryLabel}>Szacowana dostawa</Text>
            {loadingShipping ? (
              <Text style={ds.shippingInfo}>Obliczanie...</Text>
            ) : totalShippingCost > 0 ? (
              <Text style={ds.summaryValue}>
                {totalShippingCost.toFixed(2).replace('.', ',')} zł
              </Text>
            ) : (
              <Text style={ds.shippingInfo}>przy zamówieniu</Text>
            )}
          </View>
          {Object.keys(shippingPrices).length > 1 && (
            <Text style={ds.multiPackageInfo}>
              Otrzymasz {Object.keys(shippingPrices).length} przesyłki
            </Text>
          )}
          <View style={[ds.summaryRow, ds.totalRow]}>
            <Text style={ds.totalLabel}>Razem</Text>
            <Text style={ds.totalValue}>
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

const createDynamicStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      backgroundColor: c.card,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: c.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: c.textSecondary,
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
      color: c.text,
      marginBottom: 8,
    },
    emptyHint: {
      fontSize: 14,
      color: c.textSecondary,
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
      backgroundColor: c.card,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
    },
    packageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.backgroundSecondary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
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
    },
    packageHeaderInfo: {
      flex: 1,
    },
    packageWarehouseName: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    packageCount: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 1,
    },
    packageSubtotal: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },

    // Shipping bar styles (per package)
    shippingBar: {
      backgroundColor: c.tintLight,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.tintMuted,
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
      color: c.text,
    },
    infoCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoCircleText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textSecondary,
    },
    shippingFree: {
      fontSize: 14,
      fontWeight: '700',
      color: c.success,
    },
    shippingPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: c.tint,
    },
    shippingAtOrder: {
      fontSize: 12,
      color: c.textMuted,
      fontStyle: 'italic',
    },

    // Progress bar styles
    progressBarContainer: {
      marginTop: 8,
    },
    progressBarTrack: {
      height: 6,
      backgroundColor: c.tintMuted,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: c.tint,
    },
    progressBarText: {
      fontSize: 11,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    progressBarAmount: {
      fontWeight: '600',
      color: c.tint,
    },

    // Coupon section
    couponSection: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
    },
    couponLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
      marginBottom: 10,
    },
    couponInputRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    couponInput: {
      flex: 1,
      backgroundColor: c.inputBackground,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: c.inputText,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    couponApplied: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    couponBadge: {
      backgroundColor: c.successBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    couponBadgeText: {
      color: c.success,
      fontWeight: '600',
      fontSize: 14,
    },
    couponRemove: {
      color: c.destructive,
      fontWeight: '600',
      fontSize: 14,
    },
    couponErrorText: {
      color: c.destructive,
      fontSize: 13,
      marginTop: 6,
    },

    // Summary bar
    summary: {
      backgroundColor: c.card,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: c.border,
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
      color: c.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      color: c.text,
      fontWeight: '500',
    },
    discountLabel: {
      fontSize: 14,
      color: c.success,
    },
    discountValue: {
      fontSize: 14,
      color: c.success,
      fontWeight: '600',
    },
    shippingInfo: {
      fontSize: 12,
      color: c.textMuted,
      fontStyle: 'italic',
    },
    multiPackageInfo: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'right',
      marginBottom: 8,
      marginTop: -4,
    },
    totalRow: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginBottom: 0,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
    },
    totalValue: {
      fontSize: 22,
      fontWeight: '700',
      color: c.tint,
    },
  });
