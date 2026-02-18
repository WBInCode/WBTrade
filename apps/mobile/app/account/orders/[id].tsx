import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { Colors } from '../../../constants/Colors';
import { ordersApi } from '../../../services/orders';
import type { Order, OrderItem } from '../../../services/types';

// ─── Status config ───

type StatusKey = Order['status'];

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  icon: string;
}

const STATUS_MAP: Record<StatusKey, StatusConfig> = {
  PENDING:    { label: 'Nowe',          bg: '#dbeafe', text: '#1e40af', icon: 'clock-o' },
  CONFIRMED:  { label: 'Potwierdzone',  bg: '#dbeafe', text: '#1e40af', icon: 'check' },
  PROCESSING: { label: 'W realizacji',  bg: '#fef3c7', text: '#92400e', icon: 'cog' },
  SHIPPED:    { label: 'Wysłane',       bg: '#ffedd5', text: '#c2410c', icon: 'truck' },
  DELIVERED:  { label: 'Dostarczone',   bg: '#dcfce7', text: '#166534', icon: 'check-circle' },
  CANCELLED:  { label: 'Anulowane',     bg: '#fee2e2', text: '#991b1b', icon: 'times-circle' },
  REFUNDED:   { label: 'Zwrócone',      bg: '#fce7f3', text: '#9d174d', icon: 'undo' },
};

// Ordered progression for timeline
const STATUS_TIMELINE: StatusKey[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

function getStatusConfig(status: string): StatusConfig {
  return STATUS_MAP[status as StatusKey] ?? { label: status, bg: '#f3f4f6', text: '#374151', icon: 'question' };
}

// ─── Helpers ───

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} zł`;
}

function getPaymentStatusLabel(status?: string): { label: string; color: string } {
  switch (status) {
    case 'PAID': return { label: 'Opłacone', color: Colors.success };
    case 'PENDING': return { label: 'Oczekuje na płatność', color: '#f59e0b' };
    case 'FAILED': return { label: 'Płatność nieudana', color: Colors.destructive };
    case 'REFUNDED': return { label: 'Zwrócone', color: '#9d174d' };
    case 'PARTIALLY_REFUNDED': return { label: 'Częściowo zwrócone', color: '#9d174d' };
    case 'CANCELLED': return { label: 'Anulowana', color: Colors.secondary[500] };
    default: return { label: status ?? '—', color: Colors.secondary[500] };
  }
}

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    przelewy24: 'Przelewy24',
    blik: 'BLIK',
    card: 'Karta płatnicza',
    transfer: 'Przelew bankowy',
    cod: 'Pobranie',
  };
  return map[method?.toLowerCase()] ?? method ?? '—';
}

// ─── Status Timeline ───

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REFUNDED';
  const currentIndex = STATUS_TIMELINE.indexOf(currentStatus as StatusKey);

  const steps = isCancelled
    ? [...STATUS_TIMELINE.slice(0, Math.max(currentIndex, 1)), currentStatus as StatusKey]
    : STATUS_TIMELINE;

  return (
    <View style={styles.timeline}>
      {steps.map((status, i) => {
        const cfg = getStatusConfig(status);
        const isActive = isCancelled
          ? i <= steps.length - 1
          : currentIndex >= i;
        const isLast = i === steps.length - 1;

        return (
          <View key={status} style={styles.timelineStep}>
            {/* Line above */}
            {i > 0 && (
              <View
                style={[
                  styles.timelineLine,
                  { backgroundColor: isActive ? cfg.text : Colors.secondary[200] },
                ]}
              />
            )}
            {/* Dot */}
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor: isActive ? cfg.text : Colors.white,
                  borderColor: isActive ? cfg.text : Colors.secondary[300],
                },
              ]}
            >
              {isActive && (
                <FontAwesome name={cfg.icon as any} size={10} color={Colors.white} />
              )}
            </View>
            {/* Label */}
            <Text
              style={[
                styles.timelineLabel,
                {
                  color: isActive ? cfg.text : Colors.secondary[400],
                  fontWeight: isActive ? '600' : '400',
                },
              ]}
            >
              {cfg.label}
            </Text>
            {/* Line below */}
            {!isLast && (
              <View
                style={[
                  styles.timelineLineBelow,
                  {
                    backgroundColor:
                      (isCancelled ? i < steps.length - 1 : currentIndex > i)
                        ? getStatusConfig(steps[i + 1]).text
                        : Colors.secondary[200],
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Item Row ───

function ItemRow({ item }: { item: OrderItem }) {
  const imageUrl = item.variant?.product?.images?.[0]?.url;

  return (
    <View style={styles.itemRow}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.itemImage} contentFit="contain" />
      ) : (
        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
          <FontAwesome name="image" size={20} color={Colors.secondary[300]} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.productName}
        </Text>
        {item.variantName ? (
          <Text style={styles.itemVariant}>{item.variantName}</Text>
        ) : null}
        <View style={styles.itemBottom}>
          <Text style={styles.itemQty}>
            {item.quantity} szt. × {formatPrice(item.unitPrice)}
          </Text>
          <Text style={styles.itemPrice}>{formatPrice(item.total)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ───

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracking
  const [trackingPackages, setTrackingPackages] = useState<
    Array<{ courierName: string; trackingNumber: string | null; trackingLink?: string; isSent: boolean }>
  >([]);

  // Refund eligibility
  const [refundEligible, setRefundEligible] = useState(false);
  const [refundDaysLeft, setRefundDaysLeft] = useState(0);
  const [refundLoading, setRefundLoading] = useState(false);

  // ── Fetch order + extras ──

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await ordersApi.getById(id);
      const ord: Order = (res as any).order ?? res;
      setOrder(ord);

      // Fetch tracking in parallel (best-effort)
      try {
        const trackRes = await ordersApi.getTracking(id);
        setTrackingPackages((trackRes as any).packages ?? []);
      } catch {
        // No tracking available — that's fine
      }

      // Fetch refund eligibility (best-effort)
      if (ord.status === 'DELIVERED' || ord.status === 'SHIPPED') {
        try {
          const refundRes = await ordersApi.getRefundEligibility(id);
          const data = refundRes as any;
          setRefundEligible(!!data.eligible);
          setRefundDaysLeft(data.daysRemaining ?? 0);
        } catch {
          // ignore
        }
      }
    } catch {
      setError('Nie udało się pobrać szczegółów zamówienia');
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchOrder();
      setLoading(false);
    })();
  }, [fetchOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  }, [fetchOrder]);

  // ── Tracking link ──

  const openTracking = useCallback((link: string) => {
    Linking.openURL(link).catch(() => {
      Alert.alert('Błąd', 'Nie udało się otworzyć linku śledzenia.');
    });
  }, []);

  // ── Request refund ──

  const handleRefund = useCallback(() => {
    Alert.alert(
      'Złóż wniosek o zwrot',
      'Czy na pewno chcesz złożyć wniosek o zwrot tego zamówienia?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Złóż wniosek',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setRefundLoading(true);
            try {
              const res = await ordersApi.requestRefund(id);
              const data = res as any;
              if (data.success) {
                Alert.alert(
                  'Wniosek złożony',
                  `Numer zwrotu: ${data.refundNumber ?? '—'}\n\nAdres do odesłania:\n${
                    data.returnAddress
                      ? `${data.returnAddress.name}\n${data.returnAddress.street}\n${data.returnAddress.postalCode} ${data.returnAddress.city}`
                      : 'Sprawdź email'
                  }`,
                );
                setRefundEligible(false);
                await fetchOrder();
              } else {
                Alert.alert('Błąd', data.message ?? 'Nie udało się złożyć wniosku.');
              }
            } catch {
              Alert.alert('Błąd', 'Nie udało się złożyć wniosku o zwrot.');
            } finally {
              setRefundLoading(false);
            }
          },
        },
      ],
    );
  }, [id, fetchOrder]);

  // ─── Render states ───

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Zamówienie' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Ładowanie zamówienia…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Zamówienie' }} />
        <View style={styles.center}>
          <FontAwesome name="exclamation-circle" size={48} color={Colors.destructive} />
          <Text style={styles.errorText}>{error ?? 'Nie znaleziono zamówienia'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Wróć</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = getStatusConfig(order.status);
  const addr = order.shippingAddress;
  const paymentInfo = getPaymentStatusLabel(order.paymentStatus);
  const sentPackages = trackingPackages.filter((p) => p.trackingNumber);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: `#${order.orderNumber}` }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Zamówienie #{order.orderNumber}</Text>
            <View style={[styles.chip, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.chipText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>Złożono: {formatDate(order.createdAt)}</Text>
        </View>

        {/* ── Status Timeline ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status zamówienia</Text>
          <StatusTimeline currentStatus={order.status} />
        </View>

        {/* ── Tracking ── */}
        {sentPackages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Śledzenie przesyłki</Text>
            {sentPackages.map((pkg, i) => (
              <TouchableOpacity
                key={i}
                style={styles.trackingCard}
                onPress={() => pkg.trackingLink && openTracking(pkg.trackingLink)}
                disabled={!pkg.trackingLink}
                activeOpacity={0.7}
              >
                <View style={styles.trackingLeft}>
                  <FontAwesome name="truck" size={16} color={Colors.primary[600]} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.trackingCourier}>{pkg.courierName}</Text>
                    <Text style={styles.trackingNum}>{pkg.trackingNumber}</Text>
                  </View>
                </View>
                {pkg.trackingLink && (
                  <FontAwesome name="external-link" size={14} color={Colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Products ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Produkty ({order.items.length})
          </Text>
          {order.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </View>

        {/* ── Summary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Podsumowanie</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Produkty</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rabat</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                -{formatPrice(order.discount)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dostawa</Text>
            <Text style={styles.summaryValue}>
              {order.shipping > 0 ? formatPrice(order.shipping) : 'Gratis'}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Łącznie</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        {/* ── Payment & Shipping info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Płatność i dostawa</Text>

          <View style={styles.infoRow}>
            <FontAwesome name="credit-card" size={14} color={Colors.secondary[400]} />
            <Text style={styles.infoLabel}>Metoda płatności</Text>
            <Text style={styles.infoValue}>{getPaymentMethodLabel(order.paymentMethod)}</Text>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome name="money" size={14} color={Colors.secondary[400]} />
            <Text style={styles.infoLabel}>Status płatności</Text>
            <Text style={[styles.infoValue, { color: paymentInfo.color }]}>
              {paymentInfo.label}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome name="truck" size={14} color={Colors.secondary[400]} />
            <Text style={styles.infoLabel}>Metoda wysyłki</Text>
            <Text style={styles.infoValue}>{order.shippingMethod}</Text>
          </View>

          {order.paczkomatCode && (
            <View style={styles.infoRow}>
              <FontAwesome name="map-pin" size={14} color={Colors.secondary[400]} />
              <Text style={styles.infoLabel}>Paczkomat</Text>
              <Text style={styles.infoValue}>{order.paczkomatCode}</Text>
            </View>
          )}
        </View>

        {/* ── Shipping address ── */}
        {addr && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adres dostawy</Text>
            <Text style={styles.addrText}>
              {addr.firstName} {addr.lastName}
            </Text>
            <Text style={styles.addrText}>{addr.street}</Text>
            <Text style={styles.addrText}>
              {addr.postalCode} {addr.city}
            </Text>
            {addr.phone ? (
              <Text style={styles.addrText}>Tel: {addr.phone}</Text>
            ) : null}
            {addr.email ? (
              <Text style={styles.addrText}>Email: {addr.email}</Text>
            ) : null}
          </View>
        )}

        {/* ── Actions ── */}
        {refundEligible && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zwrot</Text>
            <Text style={styles.refundHint}>
              Masz jeszcze {refundDaysLeft} {refundDaysLeft === 1 ? 'dzień' : 'dni'} na złożenie wniosku o zwrot.
            </Text>
            <TouchableOpacity
              style={styles.refundBtn}
              onPress={handleRefund}
              disabled={refundLoading}
              activeOpacity={0.7}
            >
              {refundLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <FontAwesome name="undo" size={14} color={Colors.white} />
                  <Text style={styles.refundBtnText}>Złóż wniosek o zwrot</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 13,
    color: Colors.secondary[500],
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

  // Timeline
  timeline: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 0,
    minHeight: 40,
  },
  timelineLine: {
    position: 'absolute',
    left: 10,
    top: -20,
    width: 2,
    height: 20,
  },
  timelineLineBelow: {
    position: 'absolute',
    left: 10,
    bottom: -20,
    width: 2,
    height: 20,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLabel: {
    marginLeft: 12,
    fontSize: 14,
  },

  // Tracking
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  trackingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingCourier: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary[700],
  },
  trackingNum: {
    fontSize: 12,
    color: Colors.primary[600],
    marginTop: 2,
  },

  // Items
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: Colors.secondary[100],
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  itemVariant: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 2,
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  itemQty: {
    fontSize: 13,
    color: Colors.secondary[500],
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.secondary[500],
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.secondary[700],
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary[600],
  },

  // Payment & shipping info
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.secondary[500],
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary[700],
  },

  // Address
  addrText: {
    fontSize: 14,
    color: Colors.secondary[600],
    lineHeight: 20,
  },

  // Refund
  refundHint: {
    fontSize: 13,
    color: Colors.secondary[500],
    marginBottom: 12,
  },
  refundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.destructive,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refundBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // Loading / error
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.secondary[500],
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.secondary[600],
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
