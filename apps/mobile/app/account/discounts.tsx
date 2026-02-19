import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { couponsApi, UserCoupon } from '../../services/coupons';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'WELCOME_DISCOUNT': return 'Zniżka powitalna';
    case 'NEWSLETTER': return 'Newsletter';
    case 'REFERRAL': return 'Polecenie';
    case 'CAMPAIGN': return 'Kampania';
    default: return 'Rabat';
  }
}

function CouponCard({ coupon }: { coupon: UserCoupon }) {
  const { show } = useToast();
  const isActive = coupon.status === 'active';
  const remaining = daysLeft(coupon.expiresAt);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(coupon.code);
    show('Kod skopiowany do schowka!', 'success');
  };

  const valueText =
    coupon.type === 'PERCENTAGE'
      ? `-${coupon.value}%`
      : coupon.type === 'FREE_SHIPPING'
        ? 'Darmowa dostawa'
        : `-${coupon.value} zł`;

  return (
    <View style={[styles.card, !isActive && styles.cardInactive]}>
      {/* Left accent */}
      <View style={[styles.cardAccent, !isActive && styles.cardAccentInactive]} />

      <View style={styles.cardContent}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={styles.cardBadgeWrap}>
            <View style={[styles.sourceBadge, !isActive && styles.sourceBadgeInactive]}>
              <Text style={[styles.sourceText, !isActive && styles.sourceTextInactive]}>
                {sourceLabel(coupon.couponSource)}
              </Text>
            </View>
            {coupon.status === 'used' && (
              <View style={styles.usedBadge}>
                <FontAwesome name="check" size={10} color={Colors.white} />
                <Text style={styles.usedBadgeText}>Wykorzystany</Text>
              </View>
            )}
            {coupon.status === 'expired' && (
              <View style={styles.expiredBadge}>
                <FontAwesome name="clock-o" size={10} color={Colors.white} />
                <Text style={styles.expiredBadgeText}>Wygasł</Text>
              </View>
            )}
          </View>
          <Text style={[styles.valueText, !isActive && styles.valueTextInactive]}>
            {valueText}
          </Text>
        </View>

        {/* Code row */}
        <TouchableOpacity
          style={[styles.codeRow, !isActive && styles.codeRowInactive]}
          onPress={isActive ? handleCopy : undefined}
          activeOpacity={isActive ? 0.7 : 1}
        >
          <Text style={[styles.codeText, !isActive && styles.codeTextInactive]}>
            {coupon.code}
          </Text>
          {isActive && (
            <FontAwesome name="copy" size={16} color={Colors.primary[500]} />
          )}
        </TouchableOpacity>

        {/* Info row */}
        <View style={styles.infoRow}>
          {coupon.expiresAt && (
            <View style={styles.infoItem}>
              <FontAwesome name="calendar" size={12} color={Colors.secondary[400]} />
              <Text style={styles.infoText}>
                {isActive && remaining !== null
                  ? `Ważny jeszcze ${remaining} ${remaining === 1 ? 'dzień' : 'dni'}`
                  : `Do ${formatDate(coupon.expiresAt)}`}
              </Text>
            </View>
          )}
          {coupon.minimumAmount && (
            <View style={styles.infoItem}>
              <FontAwesome name="shopping-cart" size={12} color={Colors.secondary[400]} />
              <Text style={styles.infoText}>Min. {coupon.minimumAmount} zł</Text>
            </View>
          )}
        </View>

        {/* Hint */}
        {isActive && (
          <Text style={styles.hintText}>
            Użyj kodu w koszyku podczas składania zamówienia
          </Text>
        )}
      </View>
    </View>
  );
}

export default function DiscountsScreen() {
  const { isAuthenticated } = useAuth();
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      const data = await couponsApi.getMyCoupons();
      setCoupons(data.coupons);
    } catch (err) {
      console.warn('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchCoupons();
    else setLoading(false);
  }, [isAuthenticated]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const activeCoupons = coupons.filter(c => c.status === 'active');
  const inactiveCoupons = coupons.filter(c => c.status !== 'active');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Moje rabaty',
          headerTintColor: Colors.primary[500],
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      ) : coupons.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <FontAwesome name="ticket" size={48} color={Colors.secondary[300]} />
          </View>
          <Text style={styles.emptyTitle}>Brak rabatów</Text>
          <Text style={styles.emptySubtitle}>
            Tutaj pojawią się Twoje kody rabatowe i zniżki
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary[500]}
            />
          }
        >
          {/* Active coupons */}
          {activeCoupons.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Aktywne ({activeCoupons.length})</Text>
              {activeCoupons.map(c => (
                <CouponCard key={c.id} coupon={c} />
              ))}
            </>
          )}

          {/* Inactive coupons */}
          {inactiveCoupons.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                Historia ({inactiveCoupons.length})
              </Text>
              {inactiveCoupons.map(c => (
                <CouponCard key={c.id} coupon={c} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // ── Empty state ──
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[700],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.secondary[400],
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Section ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 12,
  },

  // ── Card ──
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardInactive: {
    opacity: 0.65,
  },
  cardAccent: {
    width: 5,
    backgroundColor: Colors.primary[500],
  },
  cardAccentInactive: {
    backgroundColor: Colors.secondary[300],
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },

  // ── Top row ──
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  sourceBadge: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceBadgeInactive: {
    backgroundColor: Colors.secondary[100],
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  sourceTextInactive: {
    color: Colors.secondary[500],
  },
  usedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  usedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary[400],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary[600],
  },
  valueTextInactive: {
    color: Colors.secondary[400],
  },

  // ── Code ──
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondary[50],
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    borderStyle: 'dashed',
  },
  codeRowInactive: {
    borderStyle: 'solid',
    borderColor: Colors.secondary[200],
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
    letterSpacing: 1.5,
  },
  codeTextInactive: {
    color: Colors.secondary[400],
  },

  // ── Info ──
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.secondary[500],
  },
  hintText: {
    fontSize: 11,
    color: Colors.secondary[400],
    marginTop: 8,
    fontStyle: 'italic',
  },
});
