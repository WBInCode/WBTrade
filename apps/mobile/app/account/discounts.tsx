import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Animated,
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
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
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
    case 'ALL_COLLECTED_BONUS': return '\uD83C\uDF81 Niespodzianka';
    default: return 'Rabat';
  }
}

// ═══════════════════════════════════════
// CouponCard — active/inactive user coupon
// ═══════════════════════════════════════
function CouponCard({ coupon }: { coupon: UserCoupon }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
                <FontAwesome name="check" size={10} color={colors.textInverse} />
                <Text style={styles.usedBadgeText}>Wykorzystany</Text>
              </View>
            )}
            {coupon.status === 'expired' && (
              <View style={styles.expiredBadge}>
                <FontAwesome name="clock-o" size={10} color={colors.textInverse} />
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
            <FontAwesome name="copy" size={16} color={colors.tint} />
          )}
        </TouchableOpacity>

        {/* Info row */}
        <View style={styles.infoRow}>
          {coupon.expiresAt && (
            <View style={styles.infoItem}>
              <FontAwesome name="calendar" size={12} color={colors.textMuted} />
              <Text style={styles.infoText}>
                {isActive && remaining !== null
                  ? `Ważny jeszcze ${remaining} ${remaining === 1 ? 'dzień' : 'dni'}`
                  : `Do ${formatDate(coupon.expiresAt)}`}
              </Text>
            </View>
          )}
          {coupon.minimumAmount && (
            <View style={styles.infoItem}>
              <FontAwesome name="shopping-cart" size={12} color={colors.textMuted} />
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isLocked = !item.unlocked;

  return (
    <View style={[styles.earnCard, isLocked && styles.earnCardLocked]}>
      {/* Icon circle */}
      <View style={[styles.earnIconWrap, isLocked && styles.earnIconWrapLocked]}>
        <FontAwesome
          name={item.icon as any}
          size={22}
          color={isLocked ? colors.textMuted : colors.tint}
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
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <FontAwesome name="check" size={12} color={colors.textInverse} style={{ marginRight: 6 }} />
                <Text style={styles.earnClaimText}>Odbierz</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {item.claimed && (
          <View style={styles.earnClaimedBadge}>
            <FontAwesome name="check-circle" size={12} color={colors.success} />
            <Text style={styles.earnClaimedText}>Odebrano</Text>
          </View>
        )}
        {isLocked && (
          <View style={styles.earnLockedBadge}>
            <FontAwesome name="lock" size={11} color={colors.textMuted} />
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isAuthenticated, user } = useAuth();
  const { show } = useToast();
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingApp, setClaimingApp] = useState(false);
  const [appClaimed, setAppClaimed] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [surpriseClaimed, setSurpriseClaimed] = useState(false);
  const [claimingSurprise, setClaimingSurprise] = useState(false);
  const surpriseGlow = useRef(new Animated.Value(0)).current;

  const fetchCoupons = useCallback(async () => {
    try {
      const data = await couponsApi.getMyCoupons();
      setCoupons(data.coupons);
      // Check if app download already claimed
      const hasApp = data.coupons.some(c => c.couponSource === 'APP_DOWNLOAD');
      if (hasApp) setAppClaimed(true);
      // Check if newsletter coupon already exists
      const hasNewsletter = data.coupons.some(c => c.couponSource === 'NEWSLETTER');
      if (hasNewsletter) setNewsletterSubscribed(true);
      // Check if surprise bonus already claimed
      const hasSurprise = data.coupons.some(c => c.couponSource === 'ALL_COLLECTED_BONUS');
      if (hasSurprise) setSurpriseClaimed(true);
    } catch (err) {
      console.warn('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Check newsletter subscription status
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      couponsApi.getNewsletterStatus(user.email)
        .then(result => {
          if (result.subscribed && result.verified) {
            setNewsletterSubscribed(true);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.email]);

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

  const handleClaimSurprise = async () => {
    setClaimingSurprise(true);
    try {
      await couponsApi.claimSurprise();
      setSurpriseClaimed(true);
      show('\uD83C\uDF89 Kupon-niespodzianka -25% przyznany!', 'success');
      fetchCoupons();
    } catch (err: any) {
      if (err?.statusCode === 409) {
        setSurpriseClaimed(true);
        show('Kupon-niespodzianka został już odebrany', 'info');
      } else if (err?.statusCode === 400) {
        show('Zbierz najpierw wszystkie rabaty', 'error');
      } else {
        show('Nie udało się odebrać kuponu', 'error');
      }
    } finally {
      setClaimingSurprise(false);
    }
  };

  const activeCoupons = coupons.filter(c => c.status === 'active');
  const inactiveCoupons = coupons.filter(c => c.status !== 'active');

  // Check how many earnable items are claimed
  const claimedCount = [appClaimed, newsletterSubscribed].filter(Boolean).length;
  const totalEarnableCount = 5; // app, newsletter, review, referral, birthday
  const allEarnableClaimed = claimedCount >= 3; // For now: app + newsletter + welcome = enough to unlock surprise
  const showSurpriseSection = allEarnableClaimed || surpriseClaimed;

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
      unlocked: newsletterSubscribed,
      claimed: newsletterSubscribed,
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
          headerTintColor: colors.tint,
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
            />
          }
        >
          {/* ═══ Active coupons ═══ */}
          {activeCoupons.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <FontAwesome name="ticket" size={16} color={colors.tint} />
                <Text style={styles.sectionTitle}>Aktywne ({activeCoupons.length})</Text>
              </View>
              {activeCoupons.map(c => (
                <CouponCard key={c.id} coupon={c} />
              ))}
            </>
          )}

          {/* ═══ Earnable coupons ═══ */}
          <View style={[styles.sectionHeader, activeCoupons.length > 0 && { marginTop: 28 }]}>
            <FontAwesome name="trophy" size={16} color={colors.warning} />
            <Text style={styles.sectionTitle}>Rabaty do zdobycia</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Wykonaj zadania i zdobywaj dodatkowe zniżki na zakupy!
          </Text>

          {earnableItems.map(item => (
            <EarnableCard key={item.id} item={item} />
          ))}

          {/* ═══ Surprise bonus section ═══ */}
          {showSurpriseSection && (
            <View style={styles.surpriseSection}>
              <View style={styles.surpriseGradient}>
                <View style={styles.surpriseIconRow}>
                  <Text style={styles.surpriseEmoji}>\uD83C\uDF81</Text>
                  <View style={styles.surpriseStars}>
                    <FontAwesome name="star" size={10} color="#FFD700" />
                    <FontAwesome name="star" size={14} color="#FFD700" />
                    <FontAwesome name="star" size={10} color="#FFD700" />
                  </View>
                </View>

                <Text style={styles.surpriseTitle}>Kupon-Niespodzianka!</Text>
                <Text style={styles.surpriseSubtitle}>
                  Zebrałeś wszystkie dostępne rabaty — gratulacje! Odbierz specjalny bonus.
                </Text>

                <View style={styles.surpriseValueRow}>
                  <Text style={styles.surpriseValue}>-25%</Text>
                  <Text style={styles.surpriseValueLabel}>na dowolne zakupy</Text>
                </View>

                {!surpriseClaimed ? (
                  <TouchableOpacity
                    style={styles.surpriseClaimBtn}
                    onPress={handleClaimSurprise}
                    activeOpacity={0.8}
                    disabled={claimingSurprise}
                  >
                    {claimingSurprise ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <FontAwesome name="gift" size={16} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.surpriseClaimText}>Odbierz niespodziankę</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.surpriseClaimedRow}>
                    <FontAwesome name="check-circle" size={18} color="#4CAF50" />
                    <Text style={styles.surpriseClaimedText}>Kupon odebrany! Sprawdź w aktywnych kuponach powyżej.</Text>
                  </View>
                )}

                <Text style={styles.surpriseNote}>
                  Ważny 60 dni • Jednorazowy • Nie łączy się z innymi
                </Text>
              </View>
            </View>
          )}

          {/* Progress toward surprise */}
          {!showSurpriseSection && (
            <View style={styles.surpriseProgress}>
              <View style={styles.surpriseProgressHeader}>
                <Text style={styles.surpriseProgressEmoji}>\uD83C\uDF81</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.surpriseProgressTitle}>Kupon-Niespodzianka</Text>
                  <Text style={styles.surpriseProgressDesc}>
                    Zbierz wszystkie rabaty i odblokuj specjalny bonus -25%!
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarWrap}>
                <View style={[styles.progressBarFill, { width: `${(claimedCount / 3) * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>{claimedCount}/3 rabatów zebranych</Text>
            </View>
          )}

          {/* ═══ Inactive coupons ═══ */}
          {inactiveCoupons.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                <FontAwesome name="history" size={16} color={colors.textMuted} />
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
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
              <FontAwesome name="ticket" size={28} color={colors.inputBorder} />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 14,
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Empty mini ──
  emptyMini: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginTop: 8,
    gap: 10,
  },
  emptyMiniText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },

  // ── Coupon Card ──
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    backgroundColor: colors.tint,
  },
  cardAccentInactive: {
    backgroundColor: colors.inputBorder,
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
    backgroundColor: colors.tintLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceBadgeInactive: {
    backgroundColor: colors.backgroundTertiary,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.tint,
  },
  sourceTextInactive: {
    color: colors.textMuted,
  },
  usedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  usedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textInverse,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textInverse,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.tint,
  },
  valueTextInactive: {
    color: colors.textMuted,
  },

  // ── Code ──
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  codeRowInactive: {
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1.5,
  },
  codeTextInactive: {
    color: colors.textMuted,
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
    color: colors.textMuted,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ═══ Earnable Card ═══
  earnCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    padding: 14,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  earnCardLocked: {
    backgroundColor: colors.backgroundTertiary,
    opacity: 0.7,
  },
  earnIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  earnIconWrapLocked: {
    backgroundColor: colors.border,
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
    color: colors.text,
    flex: 1,
  },
  earnTitleLocked: {
    color: colors.textMuted,
  },
  earnDiscount: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.tint,
    marginLeft: 8,
  },
  earnDiscountLocked: {
    color: colors.textMuted,
  },
  earnDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: 6,
  },
  earnDescLocked: {
    color: colors.textMuted,
  },

  // Claim button
  earnClaimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  earnClaimText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
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
    color: colors.success,
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
    color: colors.textMuted,
  },

  // ═══ Surprise Section ═══
  surpriseSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  surpriseGradient: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  surpriseIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  surpriseEmoji: {
    fontSize: 36,
  },
  surpriseStars: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  surpriseTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 6,
  },
  surpriseSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  surpriseValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 18,
  },
  surpriseValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFD700',
  },
  surpriseValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  surpriseClaimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  surpriseClaimText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  surpriseClaimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  surpriseClaimedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  surpriseNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ═══ Surprise Progress ═══
  surpriseProgress: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed' as const,
  },
  surpriseProgressHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  surpriseProgressEmoji: {
    fontSize: 28,
  },
  surpriseProgressTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 2,
  },
  surpriseProgressDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  progressBarWrap: {
    height: 8,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden' as const,
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%' as any,
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
});
