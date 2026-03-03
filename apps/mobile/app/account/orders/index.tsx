import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { pluralizeProducts } from '../../../utils/pluralize';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useThemeColors } from '../../../hooks/useThemeColors';
import type { ThemeColors } from '../../../constants/Colors';
import { ordersApi } from '../../../services/orders';
import type { Order } from '../../../services/types';

// --- Status config ---

type StatusKey = Order['status'];

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

const getStatusMap = (colors: ThemeColors): Record<StatusKey, StatusConfig> => ({
  OPEN: { label: 'Otwarte', bg: colors.warningBg, text: colors.warningText },
  PENDING: { label: 'Nowe', bg: colors.warningBg, text: colors.warningText },
  CONFIRMED: { label: 'Potwierdzone', bg: colors.tintLight, text: colors.tint },
  PROCESSING: { label: 'W realizacji', bg: colors.tintLight, text: colors.tint },
  SHIPPED: { label: 'Wysłane', bg: colors.tintMuted, text: colors.tint },
  DELIVERED: { label: 'Dostarczone', bg: colors.successBg, text: colors.successText },
  CANCELLED: { label: 'Anulowane', bg: colors.destructiveBg, text: colors.destructiveText },
  REFUNDED: { label: 'Zwrócone', bg: colors.backgroundTertiary, text: colors.textSecondary },
});

function getStatusConfig(status: string, colors: ThemeColors): StatusConfig {
  const statusMap = getStatusMap(colors);
  return statusMap[status as StatusKey] ?? { label: status, bg: colors.backgroundTertiary, text: colors.textSecondary };
}

// --- Format helpers ---

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPrice(value: number): string {
  const num = Number(value) || 0;
  return `${num.toFixed(2).replace('.', ',')} zł`;
}

// --- Order card ---

const OrderCard = React.memo(function OrderCard({
  order,
  onPress,
}: {
  order: Order;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusCfg = getStatusConfig(order.status, colors);
  const itemCount = order.items?.length ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
        <View style={[styles.chip, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.chipText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <FontAwesome name="calendar-o" size={14} color={colors.textMuted} />
        <Text style={styles.cardLabel}>{formatDate(order.createdAt)}</Text>
      </View>

      <View style={styles.cardRow}>
        <FontAwesome name="cube" size={14} color={colors.textMuted} />
        <Text style={styles.cardLabel}>
          {pluralizeProducts(itemCount)}
        </Text>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.totalLabel}>Łącznie</Text>
        <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
      </View>

      <View style={styles.cardArrow}>
        <FontAwesome name="chevron-right" size={14} color={colors.inputBorder} />
      </View>
    </TouchableOpacity>
  );
});

// --- Main screen ---

export default function OrdersScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (pageNum: number, append = false) => {
      try {
        setError(null);
        const res = await ordersApi.getAll(pageNum, 15);
        const data = res as any;
        const fetched: Order[] = data.orders ?? [];
        setOrders((prev) => (append ? [...prev, ...fetched] : fetched));
        setTotalPages(data.totalPages ?? data.pagination?.totalPages ?? 1);
      } catch (err: any) {
        setError('Nie udało się pobrać zamówień');
      }
    },
    [],
  );

  // initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchOrders(1);
      setLoading(false);
    })();
  }, [fetchOrders]);

  // pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchOrders(1);
    setRefreshing(false);
  }, [fetchOrders]);

  // infinite scroll
  const onEndReached = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const next = page + 1;
    await fetchOrders(next, true);
    setPage(next);
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, fetchOrders]);

  const handleOrderPress = useCallback(
    (order: Order) => {
      router.push(`/account/orders/${order.id}` as any);
    },
    [router],
  );

  // --- renders ---

  const renderItem = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard order={item} onPress={() => handleOrderPress(item)} />
    ),
    [handleOrderPress],
  );

  const keyExtractor = useCallback((item: Order) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
    );
  }, [loadingMore, styles, colors]);

  // --- empty / error / loading states ---

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Moje zamówienia' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={styles.loadingText}>Ładowanie zamówień…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Moje zamówienia' }} />
        <View style={styles.center}>
          <FontAwesome name="exclamation-circle" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Moje zamówienia' }} />
        <View style={styles.center}>
          <FontAwesome name="shopping-bag" size={64} color={colors.inputBorder} />
          <Text style={styles.emptyTitle}>Nie masz jeszcze zamówień</Text>
          <Text style={styles.emptyHint}>Złóż swoje pierwsze zamówienie już dziś!</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.replace('/(tabs)/search' as any)}
          >
            <Text style={styles.browseBtnText}>Przeglądaj produkty</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Moje zamówienia' }} />
      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.tint]}
            tintColor={colors.tint}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
      />
    </SafeAreaView>
  );
}

// --- Styles ---

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },

  // card
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.tint,
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },

  // loading
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },

  // error
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.tint,
    borderRadius: 8,
  },
  retryText: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 14,
  },

  // empty
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  browseBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: colors.tint,
    borderRadius: 8,
  },
  browseBtnText: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 15,
  },

  // footer
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
