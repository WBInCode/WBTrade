import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAuth } from '../../contexts/AuthContext';
import { loyaltyApi, LoyaltyStatus, LoyaltyLevelInfo } from '../../services/loyalty';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Level colors (gradient-like for RN) ───
const LEVEL_COLORS: Record<string, { primary: string; secondary: string; bg: string; text: string }> = {
  NOWY_KLIENT: { primary: '#9CA3AF', secondary: '#6B7280', bg: '#F3F4F6', text: '#4B5563' },
  BRAZOWY:     { primary: '#D97706', secondary: '#B45309', bg: '#FEF3C7', text: '#92400E' },
  SREBRNY:     { primary: '#94A3B8', secondary: '#64748B', bg: '#F1F5F9', text: '#475569' },
  ZLOTY:       { primary: '#EAB308', secondary: '#CA8A04', bg: '#FEF9C3', text: '#854D0E' },
  PLATYNOWY:   { primary: '#06B6D4', secondary: '#0891B2', bg: '#ECFEFF', text: '#155E75' },
  DIAMENTOWY:  { primary: '#3B82F6', secondary: '#2563EB', bg: '#EFF6FF', text: '#1E40AF' },
  VIP:         { primary: '#8B5CF6', secondary: '#7C3AED', bg: '#F5F3FF', text: '#5B21B6' },
};

const LEVEL_ICONS: Record<string, string> = {
  NOWY_KLIENT: '🌱',
  BRAZOWY:     '🥉',
  SREBRNY:     '🥈',
  ZLOTY:       '🥇',
  PLATYNOWY:   '💎',
  DIAMENTOWY:  '👑',
  VIP:         '⭐',
};

function getLevelColors(level: string) {
  return LEVEL_COLORS[level] || LEVEL_COLORS.NOWY_KLIENT;
}

export default function LoyaltyScreen() {
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [allLevels, setAllLevels] = useState<LoyaltyLevelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, levelsRes] = await Promise.all([
        loyaltyApi.getStatus(),
        loyaltyApi.getLevels(),
      ]);
      setStatus(statusRes);
      setAllLevels(levelsRes.levels);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (status) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: status.progress / 100,
          duration: 1000,
          delay: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [status, fadeAnim, slideAnim, progressAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    progressAnim.setValue(0);
    fetchData();
  }, [fetchData, progressAnim]);

  const lc = status ? getLevelColors(status.level) : getLevelColors('NOWY_KLIENT');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Program lojalnościowy',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundTertiary }]} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Ładowanie...</Text>
            </View>
          ) : status ? (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {/* ═══ Current Level Card ═══ */}
              <View style={[styles.levelCard, { borderColor: lc.primary }]}>
                {/* Gradient-like header */}
                <View style={[styles.levelHeader, { backgroundColor: lc.primary }]}>
                  <View style={styles.levelHeaderContent}>
                    <View>
                      <Text style={styles.levelLabel}>Twój aktualny poziom</Text>
                      <Text style={styles.levelName}>{status.levelName}</Text>
                    </View>
                    <View style={styles.levelIconCircle}>
                      <Text style={styles.levelIconEmoji}>{LEVEL_ICONS[status.level] || '🌱'}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.levelBody, { backgroundColor: colors.card }]}>
                  {/* Progress Bar */}
                  {status.nextLevel ? (
                    <View style={styles.progressSection}>
                      <View style={styles.progressLabelRow}>
                        <Text style={[styles.progressLabelText, { color: colors.textSecondary }]}>
                          Postęp do poziomu{' '}
                          <Text style={[styles.progressLabelBold, { color: colors.text }]}>
                            {status.nextLevel.name}
                          </Text>
                        </Text>
                        <Text style={[styles.progressPercent, { color: colors.text }]}>{status.progress}%</Text>
                      </View>
                      <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
                        <Animated.View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: lc.primary,
                              width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                              }),
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressInfo, { color: colors.textSecondary }]}>
                        Wydałeś{' '}
                        <Text style={{ fontWeight: '700', color: colors.text }}>
                          {status.totalSpent.toFixed(2)} PLN
                        </Text>
                        {' — brakuje '}
                        <Text style={{ fontWeight: '700', color: colors.tint }}>
                          {status.amountToNextLevel.toFixed(2)} PLN
                        </Text>
                        {' do następnego poziomu'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.progressSection}>
                      <View style={[styles.maxLevelBadge, { backgroundColor: lc.bg }]}>
                        <Text style={[styles.maxLevelText, { color: lc.text }]}>
                          🏆 Najwyższy poziom osiągnięty!
                        </Text>
                      </View>
                      <Text style={[styles.progressInfo, { color: colors.textSecondary }]}>
                        Łączne wydatki:{' '}
                        <Text style={{ fontWeight: '700', color: colors.text }}>
                          {status.totalSpent.toFixed(2)} PLN
                        </Text>
                      </Text>
                    </View>
                  )}

                  {/* Stats Grid */}
                  <View style={styles.statsGrid}>
                    <View style={[styles.statBox, { backgroundColor: colors.backgroundTertiary }]}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {status.totalSpent.toFixed(0)}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>PLN wydane</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.backgroundTertiary }]}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {status.qualifyingOrderCount}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>zamówień</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.backgroundTertiary }]}>
                      <Text style={[styles.statValue, { color: colors.tint }]}>
                        {status.permanentDiscount}%
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>stały rabat</Text>
                    </View>
                  </View>

                  {/* Active Perks */}
                  {status.perks.length > 0 && (
                    <View style={styles.perksSection}>
                      <Text style={[styles.perksTitle, { color: colors.text }]}>Twoje aktywne korzyści</Text>
                      {status.perks.map((perk, i) => (
                        <View key={i} style={styles.perkRow}>
                          <FontAwesome name="check-circle" size={16} color="#22C55E" />
                          <Text style={[styles.perkText, { color: colors.textSecondary }]}>{perk}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* ═══ All Levels ═══ */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={[styles.sectionHeader, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Wszystkie poziomy</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Zobacz korzyści na każdym poziomie
                  </Text>
                </View>

                {allLevels.map((level, index) => {
                  const isCurrentLevel = status.level === level.level;
                  const isPassed = status.totalSpent >= level.threshold;
                  const levelColor = getLevelColors(level.level);
                  const isLast = index === allLevels.length - 1;

                  return (
                    <View
                      key={level.level}
                      style={[
                        styles.levelRow,
                        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                        isCurrentLevel && { backgroundColor: colors.tintLight },
                      ]}
                    >
                      {/* Level icon */}
                      <View
                        style={[
                          styles.levelDot,
                          {
                            backgroundColor: isPassed ? levelColor.primary : colors.borderLight,
                          },
                        ]}
                      >
                        {isPassed ? (
                          <FontAwesome name="check" size={12} color="#fff" />
                        ) : (
                          <FontAwesome name="lock" size={10} color={colors.textMuted} />
                        )}
                      </View>

                      {/* Level info */}
                      <View style={styles.levelInfo}>
                        <View style={styles.levelNameRow}>
                          <Text
                            style={[
                              styles.levelRowName,
                              { color: isCurrentLevel ? colors.tint : colors.text },
                            ]}
                          >
                            {LEVEL_ICONS[level.level]} {level.name}
                          </Text>
                          {isCurrentLevel && (
                            <View style={[styles.currentBadge, { backgroundColor: colors.tint }]}>
                              <Text style={styles.currentBadgeText}>Aktualny</Text>
                            </View>
                          )}
                          {level.permanentDiscount > 0 && (
                            <View style={[styles.discountBadge, { backgroundColor: levelColor.bg }]}>
                              <Text style={[styles.discountBadgeText, { color: levelColor.text }]}>
                                -{level.permanentDiscount}%
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text style={[styles.levelThreshold, { color: colors.textMuted }]}>
                          od {level.threshold.toLocaleString('pl-PL')} PLN wydanych
                        </Text>

                        {level.perks.length > 0 && (
                          <View style={styles.levelPerks}>
                            {level.perks.map((perk, i) => (
                              <View key={i} style={styles.perkDotRow}>
                                <View
                                  style={[
                                    styles.perkDot,
                                    { backgroundColor: isPassed ? '#22C55E' : colors.borderLight },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.perkDotText,
                                    { color: colors.textSecondary },
                                    !isPassed && { opacity: 0.6 },
                                  ]}
                                >
                                  {perk}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* ═══ History ═══ */}
              {status.history.length > 0 && (
                <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.sectionHeader, { borderBottomColor: colors.borderLight }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Historia zmian poziomu</Text>
                  </View>

                  {status.history.map((entry, i) => {
                    const prevConfig = allLevels.find((l) => l.level === entry.previousLevel);
                    const newConfig = allLevels.find((l) => l.level === entry.newLevel);
                    const isUpgrade =
                      allLevels.findIndex((l) => l.level === entry.newLevel) >
                      allLevels.findIndex((l) => l.level === entry.previousLevel);
                    const isLast = i === status.history.length - 1;

                    return (
                      <View
                        key={i}
                        style={[
                          styles.historyRow,
                          !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                        ]}
                      >
                        <View
                          style={[
                            styles.historyIcon,
                            {
                              backgroundColor: isUpgrade ? '#DCFCE7' : '#FEE2E2',
                            },
                          ]}
                        >
                          <FontAwesome
                            name={isUpgrade ? 'arrow-up' : 'arrow-down'}
                            size={12}
                            color={isUpgrade ? '#16A34A' : '#DC2626'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyText, { color: colors.text }]}>
                            {prevConfig?.name || entry.previousLevel} → {newConfig?.name || entry.newLevel}
                          </Text>
                          <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                            {new Date(entry.createdAt).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                            {' — wydano łącznie '}
                            {entry.totalSpentAt.toFixed(0)} PLN
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Bottom spacing */}
              <View style={{ height: 32 }} />
            </Animated.View>
          ) : (
            /* Empty state */
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Text style={styles.emptyIcon}>🌟</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Program lojalnościowy</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Zacznij zakupy, aby zdobywać poziomy i nagrody!
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // ═══ Level Card ═══
  levelCard: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  levelHeader: {
    padding: 24,
  },
  levelHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  levelName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  levelIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelIconEmoji: {
    fontSize: 28,
  },

  levelBody: {
    padding: 20,
  },

  // Progress
  progressSection: {
    marginBottom: 20,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabelText: {
    fontSize: 13,
  },
  progressLabelBold: {
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressInfo: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },

  maxLevelBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  maxLevelText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Perks
  perksSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  perksTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  perkText: {
    fontSize: 13,
    flex: 1,
  },

  // ═══ Section Card ═══
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  sectionHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  // ═══ Level Rows ═══
  levelRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
  },
  levelDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  levelInfo: {
    flex: 1,
  },
  levelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  levelRowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  levelThreshold: {
    fontSize: 12,
    marginBottom: 6,
  },
  levelPerks: {
    gap: 4,
  },
  perkDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  perkDotText: {
    fontSize: 12,
    flex: 1,
  },

  // ═══ History ═══
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 12,
    marginTop: 2,
  },

  // ═══ Empty State ═══
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
