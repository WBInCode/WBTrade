import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
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
    case 'APP_DOWNLOAD': return 'Aplikacja mobilna';
    case 'NEWSLETTER': return 'Newsletter';
    case 'REFERRAL': return 'Polecenie';
    case 'CAMPAIGN': return 'Kampania';
    default: return 'Rabat';
  }
}

// ═══════════════════════════════════════
// CouponCard — active/inactive user coupon
// ═══════════════════════════════════════
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

// ═══════════════════════════════════════
// EarnableCard — locked coupon to earn
// ═══════════════════════════════════════
interface EarnableItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  discount: string;
  unlocked: boolean;
  claimed: boolean;
  onClaim?: () => void;
  claiming?: boolean;
}

function EarnableCard({ item }: { item: EarnableItem }) {
  const isLocked = !item.unlocked;

  return (
    <View style={[styles.earnCard, isLocked && styles.earnCardLocked]}>
      {/* Icon circle */}
      <View style={[styles.earnIconWrap, isLocked && styles.earnIconWrapLocked]}>
        <FontAwesome
          name={item.icon as any}
          size={22}
          color={isLocked ? Colors.secondary[400] : Colors.primary[500]}
        />
      </View>

      {/* Content */}
      <View style={styles.earnContent}>
        <View style={styles.earnTopRow}>
          <Text style={[styles.earnTitle, isLocked && styles.earnTitleLocked]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.earnDiscount, isLocked && styles.earnDiscountLocked]}>
            {item.discount}
          </Text>
        </View>
        <Text style={[styles.earnDesc, isLocked && styles.earnDescLocked]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Action */}
        {item.unlocked && !item.claimed && item.onClaim && (
          <TouchableOpacity
            style={styles.earnClaimBtn}
            onPress={item.onClaim}
            activeOpacity={0.8}
            disabled={item.claiming}
          >
            {item.claiming ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <FontAwesome name="check" size={12} color={Colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.earnClaimText}>Odbierz</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {item.claimed && (
          <View style={styles.earnClaimedBadge}>
            <FontAwesome name="check-circle" size={12} color={Colors.success} />
            <Text style={styles.earnClaimedText}>Odebrano</Text>
          </View>
        )}
        {isLocked && (
          <View style={styles.earnLockedBadge}>
            <FontAwesome name="lock" size={11} color={Colors.secondary[400]} />
            <Text style={styles.earnLockedText}>Do odblokowania</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════
export default function DiscountsScreen() {
  const { isAuthenticated } = useAuth();
  const { show } = useToast();
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingApp, setClaimingApp] = useState(false);
  const [appClaimed, setAppClaimed] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      const data = await couponsApi.getMyCoupons();
      setCoupons(data.coupons);
      // Check if app download already claimed
      const hasApp = data.coupons.some(c => c.couponSource === 'APP_DOWNLOAD');
      if (hasApp) setAppClaimed(true);
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

  const handleClaimAppDownload = async () => {
    setClaimingApp(true);
    try {
      await couponsApi.claimAppDownload();
      setAppClaimed(true);
      show('Rabat -5% za aplikację przyznany!', 'success');
      // Refresh list
      fetchCoupons();
    } catch (err: any) {
      if (err?.statusCode === 409) {
        setAppClaimed(true);
        show('Rabat za aplikację został już przyznany', 'info');
      } else {
        console.warn('Failed to claim app download discount:', err);
        show('Nie udało się odebrać rabatu', 'error');
      }
    } finally {
      setClaimingApp(false);
    }
  };

  const activeCoupons = coupons.filter(c => c.status === 'active');
  const inactiveCoupons = coupons.filter(c => c.status !== 'active');

  // ── Earnable coupons list ──
  const earnableItems: EarnableItem[] = [
    {
      id: 'app-download',
      icon: 'mobile',
      title: 'Pobierz aplikację',
      description: 'Zainstaluj aplikację WBTrade i odbierz rabat na zakupy',
      discount: '-5%',
      unlocked: isAuthenticated,
      claimed: appClaimed,
      onClaim: handleClaimAppDownload,
      claiming: claimingApp,
    },
    {
      id: 'newsletter',
      icon: 'envelope',
      title: 'Zapisz się do newslettera',
      description: 'Bądź na bieżąco z promocjami i otrzymaj kod rabatowy',
      discount: '-10%',
      unlocked: false,
      claimed: false,
    },
    {
      id: 'first-review',
      icon: 'star',
      title: 'Wystaw pierwszą opinię',
      description: 'Oceń produkt, który kupiłeś i zdobądź dodatkowy rabat',
      discount: '-5%',
      unlocked: false,
      claimed: false,
    },
    {
      id: 'referral',
      icon: 'users',
      title: 'Poleć znajomemu',
      description: 'Wyślij link polecający — Ty i znajomy dostaniecie rabat',
      discount: '-10%',
      unlocked: false,
      claimed: false,
    },
    {
      id: 'birthday',
      icon: 'birthday-cake',
      title: 'Urodzinowy prezent',
      description: 'Uzupełnij datę urodzenia w profilu i odbierz niespodziankę',
      discount: '-15%',
      unlocked: false,
      claimed: false,
    },
  ];

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
          {/* ═══ Active coupons ═══ */}
          {activeCoupons.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <FontAwesome name="ticket" size={16} color={Colors.primary[500]} />
                <Text style={styles.sectionTitle}>Aktywne ({activeCoupons.length})</Text>
              </View>
              {activeCoupons.map(c => (
                <CouponCard key={c.id} coupon={c} />
              ))}
            </>
          )}

          {/* ═══ Earnable coupons ═══ */}
          <View style={[styles.sectionHeader, activeCoupons.length > 0 && { marginTop: 28 }]}>
            <FontAwesome name="trophy" size={16} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Rabaty do zdobycia</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Wykonaj zadania i zdobywaj dodatkowe zniżki na zakupy!
          </Text>

          {earnableItems.map(item => (
            <EarnableCard key={item.id} item={item} />
          ))}

          {/* ═══ Inactive coupons ═══ */}
          {inactiveCoupons.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                <FontAwesome name="history" size={16} color={Colors.secondary[400]} />
                <Text style={[styles.sectionTitle, { color: Colors.secondary[500] }]}>
                  Historia ({inactiveCoupons.length})
                </Text>
              </View>
              {inactiveCoupons.map(c => (
                <CouponCard key={c.id} coupon={c} />
              ))}
            </>
          )}

          {/* Empty state — only when no coupons at all */}
          {coupons.length === 0 && (
            <View style={styles.emptyMini}>
              <FontAwesome name="ticket" size={28} color={Colors.secondary[300]} />
              <Text style={styles.emptyMiniText}>
                Jeszcze nie masz kuponów. Wykonaj zadania powyżej, żeby zdobyć rabaty!
              </Text>
            </View>
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

  // ── Section ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.secondary[400],
    marginBottom: 14,
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Empty mini ──
  emptyMini: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginTop: 8,
    gap: 10,
  },
  emptyMiniText: {
    fontSize: 13,
    color: Colors.secondary[400],
    textAlign: 'center',
    lineHeight: 19,
  },

  // ── Coupon Card ──
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
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

  // ═══ Earnable Card ═══
  earnCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    padding: 14,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  earnCardLocked: {
    backgroundColor: Colors.secondary[100],
    opacity: 0.7,
  },
  earnIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  earnIconWrapLocked: {
    backgroundColor: Colors.secondary[200],
  },
  earnContent: {
    flex: 1,
  },
  earnTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  earnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary[900],
    flex: 1,
  },
  earnTitleLocked: {
    color: Colors.secondary[500],
  },
  earnDiscount: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary[600],
    marginLeft: 8,
  },
  earnDiscountLocked: {
    color: Colors.secondary[400],
  },
  earnDesc: {
    fontSize: 12,
    color: Colors.secondary[500],
    lineHeight: 17,
    marginBottom: 6,
  },
  earnDescLocked: {
    color: Colors.secondary[400],
  },

  // Claim button
  earnClaimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  earnClaimText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  earnClaimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  earnClaimedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  earnLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  earnLockedText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.secondary[400],
  },
});
