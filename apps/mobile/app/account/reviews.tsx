import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface UserReview {
  id: string;
  rating: number;
  title?: string;
  content: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug?: string;
    images?: { url: string; alt: string | null }[];
  };
}

interface ReviewsResponse {
  reviews: UserReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FontAwesome
          key={star}
          name="star"
          size={size}
          color={star <= rating ? '#f59e0b' : Colors.secondary[200]}
        />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadReviews = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const data = await api.get<ReviewsResponse>('/reviews/mine', {
        page: pageNum,
        limit: 10,
        sort: 'newest',
      });

      if (pageNum === 1) {
        setReviews(data.reviews || []);
      } else {
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
      }
      setTotalPages(data.totalPages || 1);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh reviews when screen is focused (e.g. coming back from product page)
  useFocusEffect(
    useCallback(() => {
      loadReviews(1, false);
    }, [])
  );

  const handleRefresh = () => loadReviews(1, true);

  const handleLoadMore = () => {
    if (page < totalPages) {
      loadReviews(page + 1);
    }
  };

  const handleDelete = (reviewId: string) => {
    Alert.alert(
      'Usuń opinię',
      'Czy na pewno chcesz usunąć tę opinię? Tej operacji nie można cofnąć.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            setDeleting(reviewId);
            try {
              await api.delete(`/reviews/${reviewId}`);
              setReviews((prev) => prev.filter((r) => r.id !== reviewId));
            } catch (err) {
              Alert.alert('Błąd', 'Nie udało się usunąć opinii');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderReview = ({ item }: { item: UserReview }) => {
    const imageUrl = item.product?.images?.[0]?.url;

    return (
      <View style={styles.reviewCard}>
        <TouchableOpacity
          style={styles.reviewProduct}
          onPress={() => router.push(`/product/${item.product.id}`)}
          activeOpacity={0.7}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} contentFit="contain" />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <FontAwesome name="image" size={16} color={Colors.secondary[300]} />
            </View>
          )}
          <Text style={styles.productName} numberOfLines={2}>
            {item.product.name}
          </Text>
          <FontAwesome name="chevron-right" size={12} color={Colors.secondary[300]} />
        </TouchableOpacity>

        <View style={styles.reviewContent}>
          <View style={styles.reviewHeader}>
            <StarRow rating={item.rating} />
            <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
          </View>

          {item.isVerifiedPurchase && (
            <View style={styles.verifiedBadge}>
              <FontAwesome name="check-circle" size={11} color={Colors.success} />
              <Text style={styles.verifiedText}>Zweryfikowany zakup</Text>
            </View>
          )}

          {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
          <Text style={styles.reviewText}>{item.content}</Text>

          <View style={styles.reviewActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push(`/product/${item.product.id}`)}
            >
              <FontAwesome name="pencil" size={12} color={Colors.primary[600]} />
              <Text style={styles.editBtnText}>Edytuj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}
              disabled={deleting === item.id}
            >
              {deleting === item.id ? (
                <ActivityIndicator size="small" color={Colors.destructive} />
              ) : (
                <>
                  <FontAwesome name="trash-o" size={12} color={Colors.destructive} />
                  <Text style={styles.deleteBtnText}>Usuń</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Moje opinie',
          headerShown: true,
          headerBackTitle: 'Konto',
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.secondary[900],
        }}
      />
      <SafeAreaView style={styles.container} edges={[]}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyState}>
            {/* x-kom style illustration */}
            <View style={styles.emptyIllustration}>
              <View style={styles.emptyCircle}>
                <View style={styles.emptyCircleInner}>
                  {/* Star icon in center */}
                  <View style={styles.emptyStarBox}>
                    <FontAwesome name="star" size={28} color={Colors.primary[500]} />
                  </View>
                </View>
              </View>
              {/* Decorative elements around circle */}
              <View style={[styles.emptyDeco, { top: 10, left: 20 }]}>
                <FontAwesome name="thumbs-up" size={24} color={Colors.secondary[300]} />
              </View>
              <View style={[styles.emptyDeco, { top: 15, right: 15 }]}>
                <FontAwesome name="laptop" size={22} color={Colors.secondary[300]} />
              </View>
              <View style={[styles.emptyDeco, { bottom: 20, right: 30 }]}>
                <FontAwesome name="cog" size={20} color={Colors.secondary[300]} />
              </View>
              <View style={[styles.emptyDecoX, { top: 5, right: 50 }]}>
                <Text style={styles.emptyDecoXText}>×</Text>
              </View>
              <View style={[styles.emptyDecoX, { bottom: 40, left: 15 }]}>
                <Text style={styles.emptyDecoXText}>×</Text>
              </View>
              <View style={[styles.emptyDecoX, { top: 50, left: 5 }]}>
                <Text style={styles.emptyDecoXText}>×</Text>
              </View>
            </View>
            <Text style={styles.emptyTitle}>Oceń swój pierwszy produkt</Text>
            <Text style={styles.emptyHint}>
              Kupuj produkty, wystawiaj opinię i pomóż innym wybrać!
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyBtnText}>Przejdź do zakupów</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={reviews}
            renderItem={renderReview}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary[500]}
                colors={[Colors.primary[500]]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={
              <Text style={styles.listHeader}>
                Twoje opinie ({reviews.length})
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[100],
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state — x-kom style
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.white,
  },
  emptyIllustration: {
    width: 200,
    height: 200,
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: Colors.secondary[200],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStarBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primary[500] + '15',
    borderWidth: 1.5,
    borderColor: Colors.primary[500] + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDeco: {
    position: 'absolute',
  },
  emptyDecoX: {
    position: 'absolute',
  },
  emptyDecoXText: {
    fontSize: 16,
    color: Colors.secondary[300],
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingBottom: 24,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
    padding: 16,
    paddingBottom: 8,
  },

  // Review card
  reviewCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  reviewProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.secondary[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[100],
    gap: 10,
  },
  productImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.secondary[800],
    lineHeight: 18,
  },

  // Review content
  reviewContent: {
    padding: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.secondary[400],
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  verifiedText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: Colors.secondary[700],
    lineHeight: 20,
  },

  // Actions
  reviewActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.secondary[100],
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontSize: 13,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 13,
    color: Colors.destructive,
    fontWeight: '500',
  },
});
