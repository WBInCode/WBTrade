import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import { api } from '../../services/api';
import ProductCarousel from '../../components/product/ProductCarousel';
import type { Product, ProductVariant } from '../../services/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Strip HTML tags and decode basic entities
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// --- Review Types ---
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
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

// --- Image Gallery ---
function ImageGallery({ images }: { images: { url: string; alt: string | null }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (!images || images.length === 0) {
    return (
      <View style={styles.galleryPlaceholder}>
        <FontAwesome name="image" size={48} color={Colors.secondary[300]} />
        <Text style={styles.galleryPlaceholderText}>Brak zdjęć</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url }}
            style={styles.galleryImage}
            contentFit="contain"
            transition={200}
          />
        )}
      />
      {images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// --- Star Rating ---
function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <FontAwesome
        key={i}
        name={i <= Math.round(rating) ? 'star' : 'star-o'}
        size={size}
        color={Colors.warning}
        style={{ marginRight: 2 }}
      />
    );
  }
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
}

// --- Accordion ---
function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={styles.accordionTitle}>{title}</Text>
        <FontAwesome
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={Colors.secondary[500]}
        />
      </TouchableOpacity>
      {open && <View style={styles.accordionContent}>{children}</View>}
    </View>
  );
}

// --- Main Screen ---
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [addingToCart, setAddingToCart] = useState(false);

  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([]);

  // Fetch product
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    api
      .get<any>(`/products/${id}`)
      .then((data) => {
        // API may return { product: Product } or Product directly
        const prod: Product = data.product || data;
        setProduct(prod);
        // Auto-select first variant if exists
        if (prod.variants && prod.variants.length > 0) {
          const firstVariant = prod.variants[0];
          setSelectedVariant(firstVariant);
          setSelectedAttributes(firstVariant.attributes || {});
        }
      })
      .catch((err) => setError(err.message || 'Nie udało się pobrać produktu'))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch reviews + same warehouse
  useEffect(() => {
    if (!id) return;

    // Reviews stats
    api
      .get<ReviewStats>(`/products/${id}/reviews/stats`)
      .then(setReviewStats)
      .catch(() => {});

    // Reviews list
    api
      .get<{ reviews: Review[] }>(`/products/${id}/reviews?limit=5&sort=newest`)
      .then((data) => setReviews(data.reviews || []))
      .catch(() => {});

    // Same warehouse products
    api
      .get<{ products: Product[] }>(`/products/same-warehouse/${id}?limit=10`)
      .then((data) => setWarehouseProducts(data.products || []))
      .catch(() => {});
  }, [id]);

  // --- Price helpers ---
  const getPrice = useCallback(() => {
    if (selectedVariant && selectedVariant.price > 0) {
      return selectedVariant.price;
    }
    if (!product || product.price == null) return 0;
    const parsed = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    return isNaN(parsed) ? 0 : parsed;
  }, [product, selectedVariant]);

  const getComparePrice = useCallback(() => {
    if (!product?.compareAtPrice) return null;
    const compare =
      typeof product.compareAtPrice === 'string'
        ? parseFloat(product.compareAtPrice)
        : product.compareAtPrice;
    return compare > getPrice() ? compare : null;
  }, [product, getPrice]);

  const getLowestPrice30 = useCallback(() => {
    if (!product?.lowestPrice30Days) return null;
    const lowest =
      typeof product.lowestPrice30Days === 'string'
        ? parseFloat(product.lowestPrice30Days)
        : product.lowestPrice30Days;
    return lowest > 0 ? lowest : null;
  }, [product]);

  // --- Variant helpers ---
  const getAttributeKeys = useCallback(() => {
    if (!product?.variants || product.variants.length <= 1) return [];
    const keys = new Set<string>();
    product.variants.forEach((v) => {
      Object.keys(v.attributes || {}).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [product]);

  const getAttributeValues = useCallback(
    (key: string) => {
      if (!product?.variants) return [];
      const values = new Set<string>();
      product.variants.forEach((v) => {
        if (v.attributes?.[key]) values.add(v.attributes[key]);
      });
      return Array.from(values);
    },
    [product]
  );

  const handleAttributeSelect = useCallback(
    (key: string, value: string) => {
      const newAttrs = { ...selectedAttributes, [key]: value };
      setSelectedAttributes(newAttrs);

      // Find matching variant
      const match = product?.variants?.find((v) =>
        Object.entries(newAttrs).every(([k, val]) => v.attributes?.[k] === val)
      );
      if (match) setSelectedVariant(match);
    },
    [product, selectedAttributes]
  );

  // --- Stock status ---
  const getStockInfo = useCallback(() => {
    if (!selectedVariant) {
      // No variants - check if product has any variant with stock
      if (product?.variants && product.variants.length > 0) {
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        if (totalStock === 0) return { status: 'out', label: 'Niedostępny', color: Colors.secondary[400] };
        if (totalStock <= 5) return { status: 'low', label: 'Mało sztuk', color: Colors.warning };
        return { status: 'in', label: 'Dostępny', color: Colors.success };
      }
      return { status: 'in', label: 'Dostępny', color: Colors.success };
    }

    if (selectedVariant.stock === 0) return { status: 'out', label: 'Niedostępny', color: Colors.secondary[400] };
    if (selectedVariant.stock <= 5) return { status: 'low', label: 'Mało sztuk', color: Colors.warning };
    return { status: 'in', label: 'Dostępny', color: Colors.success };
  }, [product, selectedVariant]);

  // --- Add to cart ---
  const handleAddToCart = useCallback(async () => {
    if (!product) return;

    const variantId = selectedVariant?.id || product.variants?.[0]?.id;
    if (!variantId) {
      Alert.alert('Błąd', 'Brak dostępnego wariantu produktu');
      return;
    }

    const stock = getStockInfo();
    if (stock.status === 'out') {
      Alert.alert('Niedostępny', 'Ten produkt jest obecnie niedostępny');
      return;
    }

    setAddingToCart(true);
    try {
      const price = Number(selectedVariant?.price || product.price) || 0;
      await addToCart(variantId, 1, {
        productId: product.id,
        name: product.name,
        imageUrl: product.images?.[0]?.url,
        price,
        quantity: 1,
        warehouse: product.wholesaler || undefined,
      });
    } catch (err: any) {
      Alert.alert('Błąd', err.message || 'Nie udało się dodać do koszyka');
    } finally {
      setAddingToCart(false);
    }
  }, [product, selectedVariant, addToCart, getStockInfo]);

  // --- Loading / Error states ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Ładowanie produktu...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <FontAwesome name="exclamation-triangle" size={48} color={Colors.destructive} />
        <Text style={styles.errorText}>{error || 'Nie znaleziono produktu'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Wróć</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const price = Number(getPrice()) || 0;
  const comparePrice = getComparePrice();
  const lowestPrice30 = getLowestPrice30();
  const hasDiscount = comparePrice != null && comparePrice > price;
  const stockInfo = getStockInfo();
  const attributeKeys = getAttributeKeys();

  return (
    <>
      <Stack.Screen options={{ title: product.name.substring(0, 30) }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <ImageGallery images={product.images || []} />

        <View style={styles.content}>
          {/* Badge */}
          {product.badge && (
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgeChip,
                  {
                    backgroundColor:
                      product.badge === 'super-price'
                        ? Colors.destructive
                        : product.badge === 'outlet'
                          ? Colors.warning
                          : product.badge === 'bestseller'
                            ? Colors.primary[500]
                            : Colors.success,
                  },
                ]}
              >
                <Text style={styles.badgeText}>
                  {product.badge === 'super-price'
                    ? 'Super cena'
                    : product.badge === 'outlet'
                      ? 'Outlet'
                      : product.badge === 'bestseller'
                        ? 'Bestseller'
                        : 'Nowość'}
                </Text>
              </View>
            </View>
          )}

          {/* Product Name */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* SKU */}
          {product.sku && (
            <Text style={styles.sku}>SKU: {product.sku}</Text>
          )}

          {/* Rating summary */}
          {reviewStats && reviewStats.totalReviews > 0 && (
            <View style={styles.ratingSummaryRow}>
              <StarRating rating={reviewStats.averageRating} size={14} />
              <Text style={styles.ratingText}>
                {reviewStats.averageRating.toFixed(1)} ({reviewStats.totalReviews}{' '}
                {reviewStats.totalReviews === 1
                  ? 'opinia'
                  : reviewStats.totalReviews < 5
                    ? 'opinie'
                    : 'opinii'}
                )
              </Text>
            </View>
          )}

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text
                style={[
                  styles.currentPrice,
                  hasDiscount && { color: Colors.destructive },
                ]}
              >
                {Number(price).toFixed(2).replace('.', ',')} zł
              </Text>
              {hasDiscount && (
                <>
                  <Text style={styles.comparePrice}>
                    {Number(comparePrice).toFixed(2).replace('.', ',')} zł
                  </Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>
                      -{Math.round(((Number(comparePrice) - price) / Number(comparePrice)) * 100)}%
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* OMNIBUS - Lowest price 30 days */}
            {lowestPrice30 && (
              <Text style={styles.omnibusText}>
                Najniższa cena z 30 dni: {Number(lowestPrice30).toFixed(2).replace('.', ',')} zł
              </Text>
            )}
          </View>

          {/* Variant Selection */}
          {attributeKeys.length > 0 && (
            <View style={styles.variantsSection}>
              {attributeKeys.map((key) => (
                <View key={key} style={styles.variantGroup}>
                  <Text style={styles.variantLabel}>{key}:</Text>
                  <View style={styles.chipsRow}>
                    {getAttributeValues(key).map((value) => {
                      const isSelected = selectedAttributes[key] === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.chip,
                            isSelected && styles.chipSelected,
                          ]}
                          onPress={() => handleAttributeSelect(key, value)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextSelected,
                            ]}
                          >
                            {value}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Stock Status */}
          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: stockInfo.color }]} />
            <Text style={[styles.stockText, { color: stockInfo.color }]}>
              {stockInfo.label}
            </Text>
          </View>

          {/* Add to Cart */}
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              stockInfo.status === 'out' && styles.addToCartDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={addingToCart || stockInfo.status === 'out'}
            activeOpacity={0.8}
          >
            {addingToCart ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <FontAwesome name="shopping-cart" size={18} color={Colors.white} />
                <Text style={styles.addToCartText}>
                  {stockInfo.status === 'out' ? 'Niedostępny' : 'Dodaj do koszyka'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Store/Warehouse info */}
          {product.storeName && (
            <View style={styles.storeRow}>
              <FontAwesome name="building-o" size={14} color={Colors.secondary[500]} />
              <Text style={styles.storeText}>Magazyn: {product.storeName}</Text>
            </View>
          )}

          {/* Description Accordion */}
          {product.description && (
            <Accordion title="Opis produktu">
              <Text style={styles.descriptionText}>{stripHtml(product.description)}</Text>
            </Accordion>
          )}

          {/* Specifications Accordion */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <Accordion title="Specyfikacja">
              {Object.entries(product.specifications).map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </Accordion>
          )}

          {/* Delivery Info */}
          {product.deliveryInfo && (
            <Accordion title="Dostawa">
              <Text style={styles.descriptionText}>{stripHtml(product.deliveryInfo)}</Text>
            </Accordion>
          )}

          {/* Reviews Section */}
          {reviewStats && reviewStats.totalReviews > 0 && (
            <View style={styles.reviewsSection}>
              <Text style={styles.sectionTitle}>Opinie klientów</Text>

              {/* Rating Overview */}
              <View style={styles.reviewOverview}>
                <View style={styles.reviewOverviewLeft}>
                  <Text style={styles.reviewBigRating}>
                    {reviewStats.averageRating.toFixed(1)}
                  </Text>
                  <StarRating rating={reviewStats.averageRating} size={20} />
                  <Text style={styles.reviewCount}>
                    {reviewStats.totalReviews}{' '}
                    {reviewStats.totalReviews === 1
                      ? 'opinia'
                      : reviewStats.totalReviews < 5
                        ? 'opinie'
                        : 'opinii'}
                  </Text>
                </View>
                <View style={styles.reviewOverviewRight}>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const dist = reviewStats.distribution.find(
                      (d) => d.rating === rating
                    );
                    const count = dist?.count || 0;
                    const pct =
                      reviewStats.totalReviews > 0
                        ? (count / reviewStats.totalReviews) * 100
                        : 0;
                    return (
                      <View key={rating} style={styles.ratingBarRow}>
                        <Text style={styles.ratingBarLabel}>{rating}</Text>
                        <FontAwesome
                          name="star"
                          size={10}
                          color={Colors.warning}
                        />
                        <View style={styles.ratingBar}>
                          <View
                            style={[styles.ratingBarFill, { width: `${pct}%` }]}
                          />
                        </View>
                        <Text style={styles.ratingBarCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Review List */}
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <StarRating rating={review.rating} size={12} />
                    {review.isVerifiedPurchase && (
                      <View style={styles.verifiedBadge}>
                        <FontAwesome
                          name="check-circle"
                          size={12}
                          color={Colors.success}
                        />
                        <Text style={styles.verifiedText}>Zweryfikowany zakup</Text>
                      </View>
                    )}
                  </View>
                  {review.title && (
                    <Text style={styles.reviewTitle}>{review.title}</Text>
                  )}
                  <Text style={styles.reviewContent}>{review.content}</Text>
                  <View style={styles.reviewFooter}>
                    <Text style={styles.reviewAuthor}>
                      {review.user
                        ? `${review.user.firstName} ${review.user.lastName.charAt(0)}.`
                        : 'Anonim'}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('pl-PL')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Same Warehouse Products */}
          {warehouseProducts.length > 0 && (
            <View style={styles.warehouseSection}>
              <ProductCarousel
                title="Inne produkty z tego magazynu"
                products={warehouseProducts}
              />
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.secondary[500],
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.secondary[600],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },

  // Gallery
  galleryPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: Colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPlaceholderText: {
    marginTop: 8,
    color: Colors.secondary[400],
    fontSize: 14,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: Colors.secondary[50],
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary[500],
  },
  dotInactive: {
    backgroundColor: Colors.secondary[300],
  },

  // Content
  content: {
    padding: 16,
  },

  // Badge
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Product name
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[900],
    lineHeight: 28,
    marginBottom: 4,
  },
  sku: {
    fontSize: 12,
    color: Colors.secondary[400],
    marginBottom: 8,
  },

  // Rating summary
  ratingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 13,
    color: Colors.secondary[500],
  },

  // Price
  priceSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.secondary[900],
  },
  comparePrice: {
    fontSize: 16,
    color: Colors.secondary[400],
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: Colors.destructive,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  omnibusText: {
    fontSize: 11,
    color: Colors.secondary[400],
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Variants
  variantsSection: {
    marginBottom: 16,
  },
  variantGroup: {
    marginBottom: 12,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.secondary[300],
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  chipText: {
    fontSize: 14,
    color: Colors.secondary[700],
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary[700],
    fontWeight: '600',
  },

  // Stock
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  stockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Add to cart
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  addToCartDisabled: {
    backgroundColor: Colors.secondary[300],
  },
  addToCartText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Store
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.secondary[50],
    borderRadius: 8,
  },
  storeText: {
    fontSize: 13,
    color: Colors.secondary[600],
  },

  // Accordion
  accordionContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[200],
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  accordionContent: {
    paddingBottom: 14,
  },

  // Description
  descriptionText: {
    fontSize: 14,
    color: Colors.secondary[600],
    lineHeight: 22,
  },

  // Specifications
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[100],
  },
  specKey: {
    fontSize: 13,
    color: Colors.secondary[500],
    flex: 1,
  },
  specValue: {
    fontSize: 13,
    color: Colors.secondary[800],
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  // Reviews
  reviewsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 16,
  },
  reviewOverview: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  reviewOverviewLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  reviewBigRating: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.secondary[900],
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 4,
  },
  reviewOverviewRight: {
    flex: 1,
    gap: 4,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBarLabel: {
    fontSize: 12,
    color: Colors.secondary[600],
    width: 12,
    textAlign: 'right',
  },
  ratingBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.secondary[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: 11,
    color: Colors.secondary[400],
    width: 20,
    textAlign: 'right',
  },

  // Review card
  reviewCard: {
    backgroundColor: Colors.secondary[50],
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  reviewContent: {
    fontSize: 13,
    color: Colors.secondary[600],
    lineHeight: 20,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  reviewAuthor: {
    fontSize: 12,
    color: Colors.secondary[500],
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.secondary[400],
  },

  // Warehouse section
  warehouseSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[200],
  },
});
