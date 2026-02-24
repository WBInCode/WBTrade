import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { couponsApi, UserCoupon } from '../../services/coupons';
import CartItem from '../../components/cart/CartItem';
import Button from '../../components/ui/Button';

export default function CartScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { cart, itemCount, updateQuantity, removeFromCart, applyCoupon, removeCoupon, refreshCart, loading } = useCart();
  const { isAuthenticated } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);

  // Fetch user's active coupons
  const fetchUserCoupons = useCallback(async () => {
    if (!isAuthenticated) return;
    setCouponsLoading(true);
    try {
      const res = await couponsApi.getMyCoupons();
      const active = (res.coupons || []).filter(c => c.status === 'active');
      setUserCoupons(active);
    } catch {
      // silently fail
    } finally {
      setCouponsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUserCoupons();
  }, [fetchUserCoupons]);

  const handleQuickApply = async (code: string) => {
    setCouponLoading(true);
    setCouponError('');
    try {
      await applyCoupon(code);
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err.message || 'Nieprawidłowy kod kuponu');
    } finally {
      setCouponLoading(false);
    }
  };

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

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    header: {
      backgroundColor: colors.card,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
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
      color: colors.text,
      marginBottom: 8,
    },
    emptyHint: {
      fontSize: 14,
      color: colors.textSecondary,
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
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    warehouseHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    warehouseIcon: {
      fontSize: 22,
    },
    warehouseName: {
      fontSize: 15,
      fontWeight: '700',
    },
    warehouseCount: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    warehouseBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    warehouseBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    warehouseItems: {
      paddingTop: 4,
    },
    browseWarehouseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderTopWidth: 1,
    },
    browseWarehouseText: {
      fontSize: 13,
      fontWeight: '600',
    },
    couponSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
    },
    couponLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    couponInputRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    couponInput: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    couponApplied: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    couponBadge: {
      backgroundColor: colors.success + '15',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    couponBadgeText: {
      color: colors.success,
      fontWeight: '600',
      fontSize: 14,
    },
    couponRemove: {
      color: colors.destructive,
      fontWeight: '600',
      fontSize: 14,
    },
    couponErrorText: {
      color: colors.destructive,
      fontSize: 13,
      marginTop: 6,
    },
    availableCoupons: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.backgroundTertiary,
    },
    availableCouponsLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    couponChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.tint + '08',
      borderWidth: 1,
      borderColor: colors.tint + '25',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
    },
    couponChipLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    couponChipCode: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.3,
    },
    couponChipExpiry: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    couponChipRight: {
      alignItems: 'flex-end',
      marginLeft: 8,
    },
    couponChipValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.tint,
    },
    couponChipUse: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.tint,
      marginTop: 2,
    },
    summary: {
      backgroundColor: colors.card,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    discountLabel: {
      fontSize: 14,
      color: colors.success,
    },
    discountValue: {
      fontSize: 14,
      color: colors.success,
      fontWeight: '600',
    },
    shippingInfo: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    totalRow: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginBottom: 0,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    totalValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.tint,
    },
  }), [colors]);

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
  // Merge Outlet into Rzeszów — they are the same warehouse
  const warehouseGroups = items.reduce<Record<string, typeof items>>((groups, item) => {
    let warehouse = item.variant.product.wholesaler || 'default';
    if (warehouse === 'Outlet') warehouse = 'Rzeszów';
    if (!groups[warehouse]) groups[warehouse] = [];
    groups[warehouse].push(item);
    return groups;
  }, {});

  const WAREHOUSE_CONFIG: Record<string, { name: string; color: string; bgColor: string; borderColor: string; icon: string; searchKey: string }> = {
    'HP': { name: 'Magazyn Zielona Góra', color: '#1D4ED8', bgColor: '#EFF6FF', borderColor: '#BFDBFE', icon: '🏢', searchKey: 'hp' },
    'Hurtownia Przemysłowa': { name: 'Magazyn Zielona Góra', color: '#1D4ED8', bgColor: '#EFF6FF', borderColor: '#BFDBFE', icon: '🏢', searchKey: 'hp' },
    'Ikonka': { name: 'Magazyn Białystok', color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE', icon: '📦', searchKey: 'ikonka' },
    'BTP': { name: 'Magazyn Chotów', color: '#047857', bgColor: '#ECFDF5', borderColor: '#A7F3D0', icon: '🌿', searchKey: 'btp' },
    'Leker': { name: 'Magazyn Chynów', color: '#B91C1C', bgColor: '#FEF2F2', borderColor: '#FECACA', icon: '🏠', searchKey: 'leker' },
    'Rzeszów': { name: 'Magazyn Rzeszów', color: '#BE185D', bgColor: '#FDF2F8', borderColor: '#FBCFE8', icon: '📍', searchKey: 'outlet' },
  };

  const getWarehouseInfo = (key: string) => {
    return WAREHOUSE_CONFIG[key] || {
      name: `Magazyn ${key}`,
      color: colors.textSecondary,
      bgColor: colors.backgroundSecondary,
      borderColor: colors.border,
      icon: '📦',
      searchKey: key.toLowerCase(),
    };
  };

  const handleBrowseWarehouse = (warehouse: string) => {
    const info = getWarehouseInfo(warehouse);
    router.push({
      pathname: '/(tabs)/search',
      params: { warehouse: info.searchKey },
    });
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
        {Object.entries(warehouseGroups).map(([warehouse, warehouseItems], index) => {
          const wInfo = getWarehouseInfo(warehouse);
          const showHeader = Object.keys(warehouseGroups).length > 1;
          return (
            <View key={warehouse} style={[
              styles.warehouseGroup,
              showHeader && {
                backgroundColor: colors.card,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: wInfo.borderColor,
                overflow: 'hidden',
                marginBottom: 16,
              },
            ]}>
              {showHeader && (
                <View style={[styles.warehouseHeader, { backgroundColor: wInfo.bgColor, borderBottomColor: wInfo.borderColor }]}> 
                  <View style={styles.warehouseHeaderLeft}>
                    <Text style={styles.warehouseIcon}>{wInfo.icon}</Text>
                    <View>
                      <Text style={[styles.warehouseName, { color: wInfo.color }]}>{wInfo.name}</Text>
                      <Text style={styles.warehouseCount}>
                        {warehouseItems.length} {warehouseItems.length === 1 ? 'produkt' : warehouseItems.length < 5 ? 'produkty' : 'produktów'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.warehouseBadge, { backgroundColor: wInfo.color + '15' }]}>
                    <Text style={[styles.warehouseBadgeText, { color: wInfo.color }]}>Paczka {index + 1}</Text>
                  </View>
                </View>
              )}
              <View style={showHeader ? styles.warehouseItems : undefined}>
                {warehouseItems.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))}
              </View>
              {showHeader && (
                <TouchableOpacity
                  style={[styles.browseWarehouseBtn, { borderTopColor: wInfo.borderColor }]}
                  onPress={() => handleBrowseWarehouse(warehouse)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={wInfo.color} />
                  <Text style={[styles.browseWarehouseText, { color: wInfo.color }]}>
                    Dodaj więcej z tego magazynu
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={wInfo.color} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

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

          {/* User's available coupons */}
          {isAuthenticated && !cart?.couponCode && userCoupons.length > 0 && (
            <View style={styles.availableCoupons}>
              <Text style={styles.availableCouponsLabel}>Twoje dostępne kupony:</Text>
              {userCoupons.map((c) => {
                const valueLabel =
                  c.type === 'PERCENTAGE'
                    ? `-${c.value}%`
                    : c.type === 'FREE_SHIPPING'
                      ? 'Darmowa dostawa'
                      : `-${c.value} zł`;
                const remaining = c.expiresAt
                  ? Math.max(0, Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : null;

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.couponChip}
                    onPress={() => handleQuickApply(c.code)}
                    activeOpacity={0.7}
                    disabled={couponLoading}
                  >
                    <View style={styles.couponChipLeft}>
                      <FontAwesome name="ticket" size={14} color={colors.tint} style={{ transform: [{ rotate: '-45deg' }] }} />
                      <View>
                        <Text style={styles.couponChipCode}>{c.code}</Text>
                        {remaining !== null && (
                          <Text style={styles.couponChipExpiry}>
                            {remaining > 0 ? `Ważny jeszcze ${remaining} dn.` : 'Ostatni dzień!'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.couponChipRight}>
                      <Text style={styles.couponChipValue}>{valueLabel}</Text>
                      <Text style={styles.couponChipUse}>Użyj</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
            <Text style={styles.summaryLabel}>Wysyłka</Text>
            <Text style={styles.shippingInfo}>obliczona w następnym kroku</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Do zapłaty</Text>
            <Text style={styles.totalValue}>{total.toFixed(2).replace('.', ',')} zł</Text>
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
