import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '../../../constants/Colors';
import { api } from '../../../services/api';
import type { Order } from '../../../services/types';
import Button from '../../../components/ui/Button';

type PaymentStatusType = 'PAID' | 'COMPLETED' | 'PENDING' | 'AWAITING_CONFIRMATION' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | string;

const STATUS_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  title: string;
  message: string;
}> = {
  PAID: {
    icon: 'checkmark-circle',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    title: 'Płatność zrealizowana!',
    message: 'Dziękujemy za zamówienie. Otrzymasz potwierdzenie na email.',
  },
  COMPLETED: {
    icon: 'checkmark-circle',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    title: 'Zamówienie opłacone!',
    message: 'Dziękujemy za zamówienie. Otrzymasz potwierdzenie na email.',
  },
  PENDING: {
    icon: 'time',
    color: '#CA8A04',
    bgColor: '#FEFCE8',
    title: 'Oczekiwanie na płatność...',
    message: 'Trwa przetwarzanie płatności. Proszę czekać.',
  },
  AWAITING_CONFIRMATION: {
    icon: 'phone-portrait-outline',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    title: 'Potwierdź płatność',
    message: 'Potwierdź płatność w aplikacji bankowej lub wpisz kod BLIK.',
  },
  FAILED: {
    icon: 'close-circle',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    title: 'Płatność nie powiodła się',
    message: 'Nie udało się zrealizować płatności. Możesz spróbować ponownie.',
  },
  CANCELLED: {
    icon: 'close-circle',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    title: 'Płatność anulowana',
    message: 'Płatność została anulowana.',
  },
};

export default function OrderConfirmation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>('PENDING');
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [id]);

  // Start polling when payment is pending
  useEffect(() => {
    if (paymentStatus === 'PENDING' || paymentStatus === 'AWAITING_CONFIRMATION') {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [paymentStatus]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ order: Order }>(`/orders/${id}`);
      const orderData = response.order || response as any;
      setOrder(orderData);
      setPaymentStatus(orderData.paymentStatus || orderData.status || 'PENDING');
    } catch (err: any) {
      setError(err.message || 'Nie udało się załadować zamówienia');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    stopPolling();
    pollInterval.current = setInterval(async () => {
      try {
        const response = await api.get<{ order: Order }>(`/orders/${id}`);
        const orderData = response.order || response as any;
        setOrder(orderData);
        const newStatus = orderData.paymentStatus || orderData.status || 'PENDING';
        setPaymentStatus(newStatus);

        // Stop polling if payment is resolved
        if (['PAID', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(newStatus)) {
          stopPolling();
        }
      } catch {
        // Silently retry on next interval
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const handleRetryPayment = async () => {
    if (!id) return;
    setRetryLoading(true);
    try {
      const response = await api.post<{
        success: boolean;
        paymentUrl: string;
        sessionId: string;
        orderId: string;
      }>(`/checkout/payment/retry/${id}`);

      if (response.paymentUrl) {
        router.replace(`/order/${id}/payment?url=${encodeURIComponent(response.paymentUrl)}` as any);
      }
    } catch (err: any) {
      setError(err.message || 'Nie udało się ponowić płatności');
    } finally {
      setRetryLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Ładowanie zamówienia...</Text>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.destructive} />
        <Text style={styles.errorText}>{error || 'Nie znaleziono zamówienia'}</Text>
        <Button title="Wróć do sklepu" onPress={() => router.replace('/(tabs)/' as any)} variant="outline" />
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[paymentStatus] || STATUS_CONFIG.PENDING;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusConfig.bgColor }]}>
        <Ionicons name={statusConfig.icon} size={48} color={statusConfig.color} />
        <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
          {statusConfig.title}
        </Text>
        <Text style={styles.statusMessage}>{statusConfig.message}</Text>

        {(paymentStatus === 'PENDING' || paymentStatus === 'AWAITING_CONFIRMATION') && (
          <ActivityIndicator
            size="small"
            color={statusConfig.color}
            style={{ marginTop: 12 }}
          />
        )}
      </View>

      {/* Order info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informacje o zamówieniu</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Numer zamówienia:</Text>
          <Text style={styles.infoValue}>{order.orderNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={styles.infoValue}>{order.status}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Metoda płatności:</Text>
          <Text style={styles.infoValue}>{order.paymentMethod}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Metoda dostawy:</Text>
          <Text style={styles.infoValue}>{order.shippingMethod}</Text>
        </View>
        {order.paczkomatCode && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Paczkomat:</Text>
            <Text style={styles.infoValue}>{order.paczkomatCode}</Text>
          </View>
        )}
      </View>

      {/* Shipping address */}
      {order.shippingAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adres dostawy</Text>
          <Text style={styles.addressText}>
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
          </Text>
          <Text style={styles.addressText}>{order.shippingAddress.street}</Text>
          <Text style={styles.addressText}>
            {order.shippingAddress.postalCode} {order.shippingAddress.city}
          </Text>
          {order.shippingAddress.phone && (
            <Text style={styles.addressText}>{order.shippingAddress.phone}</Text>
          )}
        </View>
      )}

      {/* Order items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zamówione produkty</Text>
        {order.items.map(item => (
          <View key={item.id} style={styles.productRow}>
            {item.variant?.product?.images?.[0]?.url && (
              <Image
                source={{ uri: item.variant.product.images[0].url }}
                style={styles.productImage}
                contentFit="contain"
              />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.productName}
              </Text>
              {item.variantName && item.variantName !== 'default' && (
                <Text style={styles.productVariant}>{item.variantName}</Text>
              )}
              <Text style={styles.productPrice}>
                {item.quantity} × {item.unitPrice.toFixed(2).replace('.', ',')} zł
              </Text>
            </View>
            <Text style={styles.productTotal}>{item.total.toFixed(2).replace('.', ',')} zł</Text>
          </View>
        ))}
      </View>

      {/* Price summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Podsumowanie</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Produkty:</Text>
          <Text style={styles.priceValue}>{order.subtotal.toFixed(2).replace('.', ',')} zł</Text>
        </View>
        {order.discount > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Rabat:</Text>
            <Text style={[styles.priceValue, { color: Colors.success }]}>
              -{order.discount.toFixed(2).replace('.', ',')} zł
            </Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Dostawa:</Text>
          <Text style={styles.priceValue}>{order.shipping.toFixed(2).replace('.', ',')} zł</Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Razem:</Text>
          <Text style={styles.totalValue}>{order.total.toFixed(2).replace('.', ',')} zł</Text>
        </View>
      </View>

      {/* Retry payment button */}
      {(paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') && (
        <View style={styles.retrySection}>
          <Button
            title="Ponów płatność"
            onPress={handleRetryPayment}
            loading={retryLoading}
            size="lg"
            fullWidth
          />
        </View>
      )}

      {/* Back to shop */}
      <View style={styles.backSection}>
        <Button
          title="Wróć do sklepu"
          onPress={() => router.replace('/(tabs)/' as any)}
          variant="outline"
          size="lg"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.secondary[500],
  },
  errorText: {
    fontSize: 14,
    color: Colors.destructive,
    textAlign: 'center',
    marginVertical: 8,
  },
  statusBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 14,
    color: Colors.secondary[600],
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.secondary[500],
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  addressText: {
    fontSize: 13,
    color: Colors.secondary[600],
    lineHeight: 19,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  productImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: Colors.secondary[100],
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  productVariant: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 1,
  },
  productPrice: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 2,
  },
  productTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.secondary[600],
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 4,
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
  retrySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
});
