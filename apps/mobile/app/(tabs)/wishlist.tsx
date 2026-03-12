import React, { useCallback, useMemo, useState } from 'react';
import { pluralizeProducts } from '../../utils/pluralize';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { productsApi } from '../../services/products';
import Button from '../../components/ui/Button';
import type { WishlistItem } from '../../services/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: () => void }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [adding, setAdding] = React.useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const p = item.product;
  const price = Number(typeof p.price === 'string' ? parseFloat(p.price as string) : p.price) || 0;
  const compareAt = p.compareAtPrice
    ? Number(typeof p.compareAtPrice === 'string' ? parseFloat(p.compareAtPrice as string) : p.compareAtPrice)
    : null;
  const hasDiscount = compareAt != null && compareAt > price;
  const imageUrl = p.images?.[0]?.url;

  const hasStock = p.variants ? p.variants.some((v) => v.stock > 0) : true;

  const handleAddToCart = async () => {
    // 1) Use item-level variantId first (saved when added to wishlist)
    // 2) Then fallback to the first variant from product data
    let variantId = item.variantId || p.variants?.[0]?.id;

    // 3) If still no variantId — fetch product details from API to get variants
    if (!variantId) {
      setAdding(true);
      try {
        const data = await productsApi.getById(p.id);
        // API returns product directly (not wrapped in { product })
        const product = (data as any)?.product || data;
        const firstVariant = product?.variants?.[0];
        if (firstVariant?.id) {
          variantId = firstVariant.id;
        }
      } catch (err) {
        console.warn('Failed to fetch product for cart:', err);
      }
    }

    if (!variantId) {
      // Truly no variant available — navigate to product page
      setAdding(false);
      router.push(`/product/${p.id}`);
      return;
    }

    setAdding(true);
    try {
      await addToCart(variantId, 1, {
        productId: p.id,
        name: p.name,
        imageUrl,
        price,
        quantity: 1,
      });
    } catch (err) {
      console.warn('Failed to add to cart:', err);
    }
    setAdding(false);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => router.push(`/product/${p.id}`)}
        activeOpacity={0.7}
      >
        {/* Image */}
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <FontAwesome name="image" size={24} color={colors.border} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.name}>
            {p.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, hasDiscount && { color: colors.text }]}>
              {price.toFixed(2).replace('.', ',')} zł
            </Text>
            {hasDiscount && (
              <Text style={styles.oldPrice}>
                {compareAt!.toFixed(2).replace('.', ',')} zł
              </Text>
            )}
          </View>

          <Text style={[styles.stockText, !hasStock && styles.stockOut]}>
            {hasStock ? 'Dostępny' : 'Niedostępny'}
          </Text>
        </View>

        {/* Remove */}
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FontAwesome name="times" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Add to cart row */}
      <TouchableOpacity
        style={[styles.addBtn, !hasStock && styles.addBtnDisabled]}
        onPress={handleAddToCart}
        disabled={adding || !hasStock}
        activeOpacity={0.8}
      >
        {adding ? (
          <ActivityIndicator color={colors.textInverse} size="small" />
        ) : (
          <>
            <FontAwesome name="shopping-cart" size={14} color={colors.textInverse} />
            <Text style={styles.addBtnText}>
              {hasStock ? 'Dodaj do koszyka' : 'Niedostępny'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function WishlistScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, count, remove, refresh } = useWishlist();
  const { addToCart } = useCart();
  const toast = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [addingAll, setAddingAll] = useState(false);
  const [addedAllCount, setAddedAllCount] = useState(0);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (user) refresh();
    }, [user, refresh])
  );

  // Total value
  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const p = item.product;
      const price = Number(typeof p.price === 'string' ? parseFloat(p.price as string) : p.price) || 0;
      return sum + price;
    }, 0);
  }, [items]);

  const handleAddAllToCart = async () => {
    setAddingAll(true);
    setAddedAllCount(0);
    let added = 0;

    for (const item of items) {
      const p = item.product;
      const hasStock = p.variants ? p.variants.some((v) => v.stock > 0) : true;
      if (!hasStock) continue;

      let variantId = item.variantId || p.variants?.[0]?.id;

      if (!variantId) {
        try {
          const data = await productsApi.getById(p.id);
          const product = (data as any)?.product || data;
          variantId = product?.variants?.[0]?.id;
        } catch {}
      }

      if (!variantId) continue;

      try {
        await addToCart(variantId, 1);
        added++;
        setAddedAllCount(added);
      } catch {}
    }

    if (added > 0) {
      toast.show(`Dodano ${added} ${added === 1 ? 'produkt' : added < 5 ? 'produkty' : 'produktów'} do koszyka`, 'success');
    }

    setTimeout(() => {
      setAddingAll(false);
      setAddedAllCount(0);
    }, 2500);
  };

  // Guest state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ulubione</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <FontAwesome name="heart-o" size={64} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Zaloguj się</Text>
          <Text style={styles.emptySubtitle}>
            Zaloguj się, aby zapisywać ulubione produkty i mieć do nich szybki dostęp
          </Text>
          <View style={styles.emptyButtons}>
            <Button title="Zaloguj się" onPress={() => router.push('/(auth)/login')} />
            <Button title="Utwórz konto" variant="outline" onPress={() => router.push('/(auth)/register')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Loading
  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ulubione</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  // Empty
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ulubione</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <FontAwesome name="heart-o" size={64} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Brak ulubionych</Text>
          <Text style={styles.emptySubtitle}>
            Dodaj produkty do ulubionych klikając ikonę serduszka na karcie produktu
          </Text>
          <Button title="Przeglądaj produkty" onPress={() => router.push('/(tabs)/search')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1 }]}>Ulubione</Text>
        <Text style={styles.headerCount}>{pluralizeProducts(count)}</Text>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <FontAwesome name="heart" size={14} color={colors.tint} />
          <Text style={styles.summaryLabel}>{pluralizeProducts(count)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Łączna wartość:</Text>
          <Text style={styles.summaryValue}>{totalValue.toFixed(2).replace('.', ',')} zł</Text>
        </View>
      </View>

      {/* Add all to cart */}
      <TouchableOpacity
        style={[styles.addAllBtn, addingAll && styles.addAllBtnDisabled]}
        onPress={handleAddAllToCart}
        disabled={addingAll}
        activeOpacity={0.8}
      >
        {addingAll ? (
          <View style={styles.addAllBtnInner}>
            <ActivityIndicator size="small" color={colors.textInverse} />
            <Text style={styles.addAllBtnText}>
              Dodawanie... ({addedAllCount}/{items.length})
            </Text>
          </View>
        ) : addedAllCount > 0 ? (
          <View style={styles.addAllBtnInner}>
            <FontAwesome name="check" size={14} color={colors.textInverse} />
            <Text style={styles.addAllBtnText}>Dodano do koszyka!</Text>
          </View>
        ) : (
          <View style={styles.addAllBtnInner}>
            <FontAwesome name="shopping-cart" size={14} color={colors.textInverse} />
            <Text style={styles.addAllBtnText}>Dodaj wszystkie do koszyka</Text>
          </View>
        )}
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WishlistCard
            item={item}
            onRemove={() => {
              Alert.alert(
                'Usuń z ulubionych',
                `Czy chcesz usunąć "${item.product.name}" z ulubionych?`,
                [
                  { text: 'Anuluj', style: 'cancel' },
                  {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: () => remove(item.productId),
                  },
                ]
              );
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshing={loading}
        onRefresh={refresh}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  header: {
    backgroundColor: colors.headerBackground,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  headerCount: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // ─── Loading ───
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Empty ───
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.backgroundSecondary,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  emptyButtons: {
    width: '100%',
    gap: 12,
  },

  // ─── Summary bar ───
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.tint,
  },

  // ─── Add all button ───
  addAllBtn: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: colors.tint,
    borderRadius: 10,
    paddingVertical: 12,
  },
  addAllBtnDisabled: {
    backgroundColor: colors.inputBorder,
  },
  addAllBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addAllBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── List ───
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },

  // ─── Card ───
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardBody: {
    flexDirection: 'row',
    padding: 12,
  },
  imageWrap: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: colors.backgroundTertiary,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  oldPrice: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.success,
  },
  stockOut: {
    color: colors.destructive,
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Add button ───
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
    paddingVertical: 10,
    gap: 6,
  },
  addBtnDisabled: {
    backgroundColor: colors.border,
  },
  addBtnText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
});
