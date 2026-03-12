import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { api } from '../../services/api';
import { pluralizeReviews } from '../../utils/pluralize';

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { rating: number; count: number }[];
}

interface Review {
  id: string;
  rating: number;
  title?: string;
  content: string;
  isVerifiedPurchase: boolean;
  helpfulCount?: number;
  adminReply?: string | null;
  adminReplyAt?: string | null;
  adminReplyBy?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const colors = useThemeColors();
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <FontAwesome
        key={i}
        name={i <= Math.round(rating) ? 'star' : 'star-o'}
        size={size}
        color={colors.warning}
        style={{ marginRight: 2 }}
      />
    );
  }
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
}

export default function ProductReviewsScreen() {
  const { productId, productName } = useLocalSearchParams<{
    productId: string;
    productName?: string;
  }>();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [statsData, reviewsData] = await Promise.all([
        api.get<ReviewStats>(`/products/${productId}/reviews/stats`),
        api.get<{ reviews: Review[] }>(
          `/products/${productId}/reviews?limit=100&sort=${sortBy}`
        ),
      ]);
      setReviewStats(statsData);
      setReviews(reviewsData.reviews || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [productId, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const getDistributionPercent = (rating: number) => {
    if (!reviewStats || reviewStats.totalReviews === 0) return 0;
    const entry = reviewStats.distribution.find((d) => d.rating === rating);
    return entry ? (entry.count / reviewStats.totalReviews) * 100 : 0;
  };

  const getDistributionCount = (rating: number) => {
    const entry = reviewStats?.distribution.find((d) => d.rating === rating);
    return entry?.count || 0;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Opinie',
          headerBackTitle: 'Wróć',
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTitleStyle: { color: colors.headerText },
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Product name */}
        {productName && (
          <Text style={styles.productName} numberOfLines={2}>
            {productName}
          </Text>
        )}

        {/* Stats summary */}
        {reviewStats && (
          <View style={styles.statsCard}>
            <View style={styles.statsTop}>
              <View style={styles.statsLeft}>
                <Text style={styles.avgRating}>
                  {reviewStats.averageRating.toFixed(1)}
                </Text>
                <StarRating rating={reviewStats.averageRating} size={18} />
                <Text style={styles.totalCount}>
                  {pluralizeReviews(reviewStats.totalReviews)}
                </Text>
              </View>
              <View style={styles.statsRight}>
                {[5, 4, 3, 2, 1].map((star) => (
                  <View key={star} style={styles.distRow}>
                    <Text style={styles.distStar}>{star}</Text>
                    <FontAwesome name="star" size={10} color={colors.warning} />
                    <View style={styles.distBarBg}>
                      <View
                        style={[
                          styles.distBarFill,
                          { width: `${getDistributionPercent(star)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.distCount}>
                      {getDistributionCount(star)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Sort controls */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sortuj:</Text>
          {([
            { key: 'newest' as const, label: 'Najnowsze' },
            { key: 'oldest' as const, label: 'Najstarsze' },
            { key: 'highest' as const, label: 'Najwyższe' },
            { key: 'lowest' as const, label: 'Najniższe' },
          ]).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortChip,
                sortBy === opt.key && styles.sortChipActive,
              ]}
              onPress={() => setSortBy(opt.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === opt.key && styles.sortChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        )}

        {/* Reviews list */}
        {!loading && reviews.length === 0 && (
          <View style={styles.emptyState}>
            <FontAwesome name="star-o" size={48} color={colors.border} />
            <Text style={styles.emptyText}>Brak opinii dla tego produktu</Text>
          </View>
        )}

        {!loading &&
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              {/* Header */}
              <View style={styles.reviewHeader}>
                <StarRating rating={review.rating} size={14} />
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  {', '}
                  {new Date(review.createdAt).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              {/* Author */}
              {review.user && (
                <Text style={styles.reviewAuthor}>
                  {review.user.firstName} {review.user.lastName}
                </Text>
              )}

              {/* Verified */}
              {review.isVerifiedPurchase && (
                <View style={styles.verifiedBadge}>
                  <FontAwesome name="check-circle" size={12} color={colors.success} />
                  <Text style={styles.verifiedText}>Zweryfikowany zakup</Text>
                </View>
              )}

              {/* Title */}
              {review.title && (
                <Text style={styles.reviewTitle}>{review.title}</Text>
              )}

              {/* Content */}
              <Text style={styles.reviewContent}>{review.content}</Text>

              {/* Admin reply */}
              {review.adminReply && (
                <View style={styles.adminReply}>
                  <View style={styles.adminReplyHeader}>
                    <FontAwesome name="commenting" size={12} color="#60A5FA" />
                    <Text style={styles.adminReplyLabel}>Odpowiedź sklepu</Text>
                    {review.adminReplyAt && (
                      <Text style={styles.adminReplyDate}>
                        {new Date(review.adminReplyAt).toLocaleDateString('pl-PL')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.adminReplyText}>{review.adminReply}</Text>
                </View>
              )}

              {/* Helpful */}
              {(review.helpfulCount ?? 0) > 0 && (
                <View style={styles.helpfulRow}>
                  <FontAwesome name="thumbs-up" size={12} color={colors.textMuted} />
                  <Text style={styles.helpfulText}>
                    {review.helpfulCount} {review.helpfulCount === 1 ? 'osoba' : 'osób'} uznało za pomocne
                  </Text>
                </View>
              )}
            </View>
          ))}

        <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    productName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    // Stats card
    statsCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    statsTop: {
      flexDirection: 'row',
      gap: 20,
    },
    statsLeft: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80,
    },
    avgRating: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 40,
    },
    totalCount: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    statsRight: {
      flex: 1,
      gap: 4,
    },
    distRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    distStar: {
      fontSize: 12,
      color: colors.textSecondary,
      width: 10,
      textAlign: 'right',
    },
    distBarBg: {
      flex: 1,
      height: 8,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 4,
      overflow: 'hidden',
    },
    distBarFill: {
      height: '100%',
      backgroundColor: colors.warning,
      borderRadius: 4,
    },
    distCount: {
      fontSize: 11,
      color: colors.textMuted,
      width: 22,
      textAlign: 'right',
    },
    // Sort
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 16,
    },
    sortLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginRight: 4,
    },
    sortChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    sortChipActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    sortChipText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    sortChipTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    // Loading / empty
    loadingContainer: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    // Review card
    reviewCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    reviewDate: {
      fontSize: 11,
      color: colors.textMuted,
    },
    reviewAuthor: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
    },
    verifiedText: {
      fontSize: 11,
      color: colors.success,
      fontWeight: '500',
    },
    reviewTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    reviewContent: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    // Admin reply
    adminReply: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.backgroundTertiary,
      borderLeftWidth: 3,
      borderLeftColor: '#3B82F6',
      borderRadius: 8,
    },
    adminReplyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    adminReplyLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#60A5FA',
    },
    adminReplyDate: {
      fontSize: 10,
      color: colors.textMuted,
      marginLeft: 'auto',
    },
    adminReplyText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    // Helpful
    helpfulRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    helpfulText: {
      fontSize: 11,
      color: colors.textMuted,
    },
  });
