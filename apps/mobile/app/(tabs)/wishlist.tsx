import React, { useCallback } from 'react';
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
import { Colors } from '../../constants/Colors';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import Button from '../../components/ui/Button';
import type { WishlistItem } from '../../services/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: () => void }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [adding, setAdding] = React.useState(false);

  const p = item.product;
  const price = Number(typeof p.price === 'string' ? parseFloat(p.price as string) : p.price) || 0;
  const compareAt = p.compareAtPrice
    ? Number(typeof p.compareAtPrice === 'string' ? parseFloat(p.compareAtPrice as string) : p.compareAtPrice)
    : null;
  const hasDiscount = compareAt != null && compareAt > price;
  const imageUrl = p.images?.[0]?.url;

  const hasStock = p.variants ? p.variants.some((v) => v.stock > 0) : true;

  const handleAddToCart = async () => {
    const variantId = p.variants?.[0]?.id;
    if (!variantId) {
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
    } catch {}
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
              <FontAwesome name="image" size={24} color={Colors.secondary[300]} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.name}>
            {p.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, hasDiscount && { color: Colors.destructive }]}>
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
          <FontAwesome name="times" size={16} color={Colors.secondary[400]} />
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
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <>
            <FontAwesome name="shopping-cart" size={14} color={Colors.white} />
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

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (user) refresh();
    }, [user, refresh])
  );

  // Guest state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ulubione</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <FontAwesome name="heart-o" size={64} color={Colors.secondary[300]} />
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
          <ActivityIndicator size="large" color={Colors.primary[500]} />
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
            <FontAwesome name="heart-o" size={64} color={Colors.secondary[300]} />
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
        <Text style={styles.headerTitle}>Ulubione</Text>
        <Text style={styles.headerCount}>{count} {count === 1 ? 'produkt' : count < 5 ? 'produkty' : 'produktów'}</Text>
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[100],
  },
  header: {
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  headerCount: {
    fontSize: 13,
    color: Colors.secondary[500],
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
    backgroundColor: Colors.secondary[50],
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  emptyButtons: {
    width: '100%',
    gap: 12,
  },

  // ─── List ───
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },

  // ─── Card ───
  card: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.secondary[100],
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
    color: Colors.secondary[900],
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
    color: Colors.secondary[900],
  },
  oldPrice: {
    fontSize: 12,
    color: Colors.secondary[400],
    textDecorationLine: 'line-through',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.success,
  },
  stockOut: {
    color: Colors.destructive,
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
    backgroundColor: Colors.primary[500],
    paddingVertical: 10,
    gap: 6,
  },
  addBtnDisabled: {
    backgroundColor: Colors.secondary[300],
  },
  addBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
