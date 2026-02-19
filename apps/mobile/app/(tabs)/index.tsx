import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { api } from '../../services/api';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import ProductCarousel from '../../components/product/ProductCarousel';
import ProductCard from '../../components/product/ProductCard';
import type { Product, Category } from '../../services/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  elektronika: 'laptop',
  agd: 'home',
  'dom-i-ogrod': 'tree',
  sport: 'futbol-o',
  moda: 'shopping-bag',
  dziecko: 'child',
  zdrowie: 'heartbeat',
  motoryzacja: 'car',
  narzedzia: 'wrench',
  zabawki: 'gamepad',
  ksiazki: 'book',
  muzyka: 'music',
  default: 'th-large',
};

function getCategoryIcon(slug?: string): string {
  if (!slug) return CATEGORY_ICONS.default;
  const key = Object.keys(CATEGORY_ICONS).find((k) => slug.toLowerCase().includes(k));
  return key ? CATEGORY_ICONS[key] : CATEGORY_ICONS.default;
}

const CATEGORY_COLORS = [
  Colors.primary[100], '#e0f2fe', '#fce7f3', '#d1fae5', '#fef3c7',
  '#ede9fe', '#fde68a', '#ccfbf1', '#fee2e2', '#e0e7ff',
];
const CATEGORY_ICON_COLORS = [
  Colors.primary[600], '#0284c7', '#db2777', '#059669', '#d97706',
  '#7c3aed', '#b45309', '#0d9488', '#dc2626', '#4f46e5',
];

const PROMO_BANNERS = [
  { id: 'elektronika', title: 'Elektronika', subtitle: 'Odkryj hity technologiczne', icon: 'laptop' as const, bgColor: '#1e3a5f', accentColor: '#60a5fa', icon2: 'microchip' as const },
  { id: 'dom-i-ogrod', title: 'Dom i ogród', subtitle: 'Wiosenne inspiracje dla domu', icon: 'tree' as const, bgColor: '#14532d', accentColor: '#4ade80', icon2: 'leaf' as const },
  { id: 'sport', title: 'Sport', subtitle: 'Wyposaż się na nowy sezon!', icon: 'futbol-o' as const, bgColor: '#78350f', accentColor: '#fbbf24', icon2: 'star' as const },
  { id: 'dziecko', title: 'Dla dzieci', subtitle: 'Najlepsze dla Twojego malucha', icon: 'child' as const, bgColor: '#4c1d95', accentColor: '#a78bfa', icon2: 'heart' as const },
];
const BANNER_WIDTH = SCREEN_WIDTH - 32;

interface HomeData {
  bestsellers: Product[];
  featured: Product[];
  newArrivals: Product[];
  categories: Category[];
  mostWishlisted: Product | null;
}

// Section item types for FlatList virtualization
type SectionItem =
  | { type: 'header' }
  | { type: 'categories'; categories: Category[] }
  | { type: 'promo' }
  | { type: 'carousel'; title: string; products: Product[]; key: string }
  | { type: 'hero'; product: Product }
  | { type: 'top3'; products: Product[] }
  | { type: 'trust' }
  | { type: 'discover-header' }
  | { type: 'discover-row'; products: Product[] }
  | { type: 'load-more' };

// ═══════════════════════════════════════════════════════
// Memoized section components — each renders in isolation
// ═══════════════════════════════════════════════════════

const HeaderSection = React.memo(function HeaderSection() {
  const router = useRouter();
  const { itemCount } = useCart();
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Image
          source={require('../../assets/images/wb-trade-logo.png')}
          style={styles.headerLogo}
          contentFit="contain"
        />
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')} style={styles.headerIconBtn}>
            <FontAwesome name="bell-o" size={20} color={Colors.secondary[600]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/cart')} style={styles.headerIconBtn}>
            <FontAwesome name="shopping-cart" size={20} color={Colors.secondary[600]} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/search')} activeOpacity={0.8}>
        <FontAwesome name="search" size={15} color={Colors.secondary[400]} />
        <Text style={styles.searchPlaceholder}>Czego szukasz?</Text>
      </TouchableOpacity>
    </View>
  );
});

const CategoriesSection = React.memo(function CategoriesSection({ categories }: { categories: Category[] }) {
  const router = useRouter();
  return (
    <View style={styles.categoriesSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollContent}>
        {categories.map((cat, index) => (
          <TouchableOpacity key={cat.id} style={styles.categoryCircleWrap} onPress={() => router.push(`/category/${cat.slug}`)}>
            <View style={[styles.categoryCircle, { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }]}>
              <FontAwesome name={getCategoryIcon(cat.slug) as any} size={22} color={CATEGORY_ICON_COLORS[index % CATEGORY_ICON_COLORS.length]} />
            </View>
            <Text style={styles.categoryCircleLabel} numberOfLines={2}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.allCategoriesBtn} onPress={() => router.push('/categories')} activeOpacity={0.7}>
        <FontAwesome name="th-list" size={15} color={Colors.primary[500]} />
        <Text style={styles.allCategoriesBtnText}>Wszystkie kategorie</Text>
        <FontAwesome name="chevron-right" size={12} color={Colors.secondary[400]} />
      </TouchableOpacity>
    </View>
  );
});

const PromoSection = React.memo(function PromoSection() {
  const router = useRouter();
  return (
    <View style={styles.promoSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.promoScrollContent}
      >
        {PROMO_BANNERS.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            style={[styles.promoBanner, { backgroundColor: banner.bgColor }]}
            onPress={() => router.push(`/category/${banner.id}` as any)}
            activeOpacity={0.9}
          >
            <View style={styles.promoDecorWrap}>
              <FontAwesome name={banner.icon} size={80} color={banner.accentColor} style={{ opacity: 0.12, position: 'absolute', top: -10, right: -10 }} />
              <FontAwesome name={banner.icon2} size={50} color={banner.accentColor} style={{ opacity: 0.08, position: 'absolute', bottom: 10, right: 60 }} />
            </View>
            <View style={styles.promoBannerContent}>
              <View style={[styles.promoBannerIconWrap, { backgroundColor: banner.accentColor }]}>
                <FontAwesome name={banner.icon} size={24} color={Colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoBannerTitle}>{banner.title}</Text>
                <Text style={styles.promoBannerSub}>{banner.subtitle}</Text>
              </View>
              <View style={[styles.promoBannerCta, { backgroundColor: banner.accentColor }]}>
                <Text style={styles.promoBannerCtaText}>Zobacz</Text>
                <FontAwesome name="chevron-right" size={10} color={Colors.white} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

const CarouselSection = React.memo(function CarouselSection({ title, products }: { title: string; products: Product[] }) {
  const router = useRouter();
  return (
    <View style={styles.productSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>Więcej</Text>
          <FontAwesome name="chevron-right" size={11} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>
      <ProductCarousel products={products} />
    </View>
  );
});

const HeroSection = React.memo(function HeroSection({ product }: { product: Product }) {
  const router = useRouter();
  return (
    <View style={styles.heroSection}>
      <View style={styles.heroHeader}>
        <View style={styles.heroBadge}>
          <FontAwesome name="star" size={11} color="#f59e0b" />
          <Text style={styles.heroBadgeText}>PRODUKT DNIA</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.heroCard}
        onPress={() => router.push(`/product/${product.slug}` as any)}
        activeOpacity={0.9}
      >
        {product.images?.[0]?.url && (
          <Image source={{ uri: product.images[0].url }} style={styles.heroImage} contentFit="contain" />
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.heroName} numberOfLines={2}>{product.name}</Text>
          <View style={styles.heroPriceRow}>
            <Text style={styles.heroPrice}>{Number(product.price).toFixed(2).replace('.', ',')} zł</Text>
            {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
              <View style={styles.heroDiscountBadge}>
                <Text style={styles.heroDiscountText}>
                  -{Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)}%
                </Text>
              </View>
            )}
          </View>
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
            <Text style={styles.heroOldPrice}>{Number(product.compareAtPrice).toFixed(2).replace('.', ',')} zł</Text>
          )}
          <View style={styles.heroCtaBtn}>
            <Text style={styles.heroCtaText}>Zobacz produkt</Text>
            <FontAwesome name="arrow-right" size={12} color={Colors.white} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const Top3Section = React.memo(function Top3Section({ products }: { products: Product[] }) {
  const router = useRouter();
  return (
    <View style={styles.topSection}>
      <View style={styles.topHeader}>
        <FontAwesome name="trophy" size={18} color="#f59e0b" />
        <Text style={styles.topTitle}>Top 3 tego tygodnia</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topScrollContent}>
        {products.slice(0, 3).map((product, index) => (
          <TouchableOpacity
            key={product.id}
            style={styles.topCard}
            onPress={() => router.push(`/product/${product.slug}` as any)}
            activeOpacity={0.9}
          >
            <View style={[styles.topMedal, { backgroundColor: ['#f59e0b', '#9ca3af', '#cd7f32'][index] }]}>
              <Text style={styles.topMedalText}>{index + 1}</Text>
            </View>
            {product.images?.[0]?.url && (
              <Image source={{ uri: product.images[0].url }} style={styles.topProductImage} contentFit="contain" />
            )}
            <Text style={styles.topProductName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.topProductPrice}>{Number(product.price).toFixed(2).replace('.', ',')} zł</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

const TrustSection = React.memo(function TrustSection() {
  return (
    <View style={styles.trustStrip}>
      {([
        { icon: 'truck' as const, title: 'Szybka wysyłka' },
        { icon: 'shield' as const, title: 'Bezpieczne\npłatności' },
        { icon: 'undo' as const, title: 'Zwrot\n14 dni' },
        { icon: 'headphones' as const, title: 'Wsparcie\n24/7' },
      ]).map((item) => (
        <View key={item.title} style={styles.trustItem}>
          <View style={styles.trustIconWrap}>
            <FontAwesome name={item.icon} size={18} color={Colors.primary[500]} />
          </View>
          <Text style={styles.trustTitle}>{item.title}</Text>
        </View>
      ))}
    </View>
  );
});

const DiscoverHeader = React.memo(function DiscoverHeader() {
  return (
    <View style={styles.discoverHeader}>
      <View style={styles.discoverTitleRow}>
        <FontAwesome name="random" size={16} color={Colors.primary[500]} />
        <Text style={styles.discoverTitle}>Odkryj coś dla siebie</Text>
      </View>
      <Text style={styles.discoverSubtitle}>Produkty dobrane losowo</Text>
    </View>
  );
});

const DiscoverRow = React.memo(function DiscoverRow({ products }: { products: Product[] }) {
  return (
    <View style={styles.discoverGrid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </View>
  );
});

// ═══════════════════════════════════════════════════════
// Main HomeScreen — uses FlatList for virtualization
// ═══════════════════════════════════════════════════════
export default function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discover / random products
  const [discoverProducts, setDiscoverProducts] = useState<Product[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [hasMoreDiscover, setHasMoreDiscover] = useState(true);
  const discoverLoadingRef = useRef(false);
  const sessionSeed = useRef(Math.floor(Math.random() * 100000));
  const seenIds = useRef(new Set<string>());

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [bestRes, featRes, catRes, newRes, heroRes] = await Promise.allSettled([
        api.get<{ products: Product[] }>('/products/bestsellers', { limit: 6 }),
        api.get<{ products: Product[] }>('/products/featured', { limit: 6 }),
        api.get<{ categories: Category[] }>('/categories/main'),
        api.get<{ products: Product[] }>('/products/new-arrivals', { limit: 6 }),
        api.get<{ product: Product | null }>('/products/most-wishlisted'),
      ]);

      const results: HomeData = {
        bestsellers: bestRes.status === 'fulfilled' ? bestRes.value.products || [] : [],
        featured: featRes.status === 'fulfilled' ? featRes.value.products || [] : [],
        categories: catRes.status === 'fulfilled' ? catRes.value.categories || [] : [],
        newArrivals: newRes.status === 'fulfilled' ? newRes.value.products || [] : [],
        mostWishlisted: heroRes.status === 'fulfilled' ? heroRes.value.product || null : null,
      };

      if (!results.bestsellers.length && !results.featured.length) {
        try {
          const fallback = await api.get<{ products: Product[] }>('/products', { limit: 10, sort: 'newest' });
          results.featured = fallback.products || [];
        } catch {
          setError('Nie udało się załadować produktów. Sprawdź połączenie z internetem.');
        }
      }

      setData(results);
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError(err.message || 'Nie udało się załadować produktów');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    sessionSeed.current = Math.floor(Math.random() * 100000);
    seenIds.current = new Set();
    setDiscoverProducts([]);
    setDiscoverPage(1);
    setHasMoreDiscover(true);
    discoverLoadingRef.current = false;
    loadData();
  }, [loadData]);

  // Load more discover products — triggered by button press only
  const loadMoreDiscover = useCallback(async () => {
    if (discoverLoadingRef.current || !hasMoreDiscover) return;
    discoverLoadingRef.current = true;
    setDiscoverLoading(true);
    try {
      const page = discoverPage;
      const res = await api.get<{ products: Product[]; totalPages: number }>('/products', {
        page,
        limit: 10,
        sort: 'random',
        sessionSeed: sessionSeed.current,
      });
      const newProducts = (res.products || []).filter((p: Product) => !seenIds.current.has(p.id));
      newProducts.forEach((p: Product) => seenIds.current.add(p.id));
      if (newProducts.length > 0) {
        setDiscoverProducts((prev) => [...prev, ...newProducts]);
      }
      setDiscoverPage(page + 1);
      if (!res.products?.length || page >= (res.totalPages || 999)) {
        setHasMoreDiscover(false);
      }
    } catch {
      // silently fail
    } finally {
      discoverLoadingRef.current = false;
      setDiscoverLoading(false);
    }
  }, [discoverPage, hasMoreDiscover]);

  // Build flat section list for FlatList virtualization
  const sections = useMemo<SectionItem[]>(() => {
    if (!data) return [];
    const items: SectionItem[] = [];
    items.push({ type: 'header' });
    if (data.categories.length > 0) {
      items.push({ type: 'categories', categories: data.categories });
    }
    items.push({ type: 'promo' });
    if (data.featured.length > 0) {
      items.push({ type: 'carousel', title: 'Polecane', products: data.featured, key: 'feat' });
    }
    const heroProduct = data.mostWishlisted || data.featured[0] || data.bestsellers[0];
    if (heroProduct) {
      items.push({ type: 'hero', product: heroProduct });
    }
    if (data.bestsellers.length > 0) {
      items.push({ type: 'carousel', title: 'Bestsellery', products: data.bestsellers, key: 'best' });
    }
    if (data.bestsellers.length >= 3) {
      items.push({ type: 'top3', products: data.bestsellers });
    }
    if (data.newArrivals.length > 0) {
      items.push({ type: 'carousel', title: 'Nowości', products: data.newArrivals, key: 'new' });
    }
    items.push({ type: 'trust' });
    if (discoverProducts.length > 0) {
      items.push({ type: 'discover-header' });
      // Split discover products into rows of 2 for virtualization
      for (let i = 0; i < discoverProducts.length; i += 2) {
        items.push({ type: 'discover-row', products: discoverProducts.slice(i, i + 2) });
      }
    }
    if (hasMoreDiscover) {
      items.push({ type: 'load-more' });
    }
    return items;
  }, [data, discoverProducts, hasMoreDiscover]);

  const renderItem = useCallback(({ item }: { item: SectionItem }) => {
    switch (item.type) {
      case 'header':
        return <HeaderSection />;
      case 'categories':
        return <CategoriesSection categories={item.categories} />;
      case 'promo':
        return <PromoSection />;
      case 'carousel':
        return <CarouselSection title={item.title} products={item.products} />;
      case 'hero':
        return <HeroSection product={item.product} />;
      case 'top3':
        return <Top3Section products={item.products} />;
      case 'trust':
        return <TrustSection />;
      case 'discover-header':
        return <DiscoverHeader />;
      case 'discover-row':
        return <DiscoverRow products={item.products} />;
      case 'load-more':
        return (
          <View style={styles.loadMoreWrap}>
            {discoverLoading ? (
              <View style={styles.loadMoreInner}>
                <ActivityIndicator size="small" color={Colors.primary[500]} />
                <Text style={styles.loadMoreText}>Ładuję produkty...</Text>
              </View>
            ) : discoverProducts.length === 0 ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMoreDiscover} activeOpacity={0.7}>
                <FontAwesome name="plus-circle" size={18} color={Colors.white} />
                <Text style={styles.loadMoreBtnText}>Odkryj więcej produktów</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.loadMoreInner}>
                <Text style={styles.loadMoreText}>Przewiń w dół, aby załadować więcej</Text>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  }, [discoverLoading, discoverProducts.length, loadMoreDiscover]);

  const keyExtractor = useCallback((item: SectionItem, index: number) => {
    if (item.type === 'carousel') return `carousel-${item.key}`;
    return `section-${item.type}-${index}`;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <FontAwesome name="exclamation-triangle" size={40} color={Colors.secondary[300]} />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>Pociągnij w dół aby spróbować ponownie</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
            colors={[Colors.primary[500]]}
          />
        }
        onEndReached={loadMoreDiscover}
        onEndReachedThreshold={0.5}
        initialNumToRender={4}
        maxToRenderPerBatch={3}
        windowSize={7}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary[100] },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  // Header
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.secondary[200],
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  headerLogo: { width: 120, height: 36 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIconBtn: {
    position: 'relative', width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.secondary[100],
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.destructive,
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: Colors.white,
  },
  cartBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondary[100],
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 11, gap: 10,
  },
  searchPlaceholder: { fontSize: 15, color: Colors.secondary[400] },

  // Categories
  categoriesSection: {
    backgroundColor: Colors.white, paddingTop: 16, paddingBottom: 4, marginBottom: 8,
  },
  categoriesScrollContent: { paddingHorizontal: 12, gap: 4 },
  categoryCircleWrap: { alignItems: 'center', width: 72 },
  categoryCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  categoryCircleLabel: {
    fontSize: 11, color: Colors.secondary[700], textAlign: 'center',
    lineHeight: 14, fontWeight: '500',
  },
  allCategoriesBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 10, marginHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.secondary[200],
    backgroundColor: Colors.secondary[50],
  },
  allCategoriesBtnText: { fontSize: 14, fontWeight: '600', color: Colors.secondary[700] },

  // Product sections
  productSection: {
    backgroundColor: Colors.white, paddingTop: 16, paddingBottom: 8, marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary[900] },
  seeAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 2,
  },
  seeAllText: { fontSize: 14, fontWeight: '500', color: Colors.primary[500] },

  // Error
  errorText: { fontSize: 16, color: Colors.destructive, textAlign: 'center' },
  errorHint: { fontSize: 14, color: Colors.secondary[500], textAlign: 'center' },

  // Promo
  promoSection: {
    backgroundColor: Colors.white, paddingTop: 12, paddingBottom: 16, marginBottom: 8,
  },
  promoScrollContent: { paddingHorizontal: 16, gap: 12 },
  promoBanner: {
    width: BANNER_WIDTH, height: 130, borderRadius: 16,
    overflow: 'hidden', justifyContent: 'center',
  },
  promoDecorWrap: { ...StyleSheet.absoluteFillObject },
  promoBannerContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16, gap: 14, zIndex: 1,
  },
  promoBannerIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  promoBannerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, marginBottom: 2 },
  promoBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  promoBannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  promoBannerCtaText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  // Hero
  heroSection: {
    backgroundColor: Colors.white, paddingTop: 16, paddingBottom: 16,
    paddingHorizontal: 16, marginBottom: 8,
  },
  heroHeader: { marginBottom: 12 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fffbeb', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#fde68a',
  },
  heroBadgeText: { fontSize: 12, fontWeight: '800', color: '#b45309', letterSpacing: 1 },
  heroCard: {
    flexDirection: 'row', backgroundColor: Colors.secondary[50],
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.secondary[200],
  },
  heroImage: { width: SCREEN_WIDTH * 0.38, height: 180, backgroundColor: Colors.white },
  heroInfo: { flex: 1, padding: 14, justifyContent: 'center', gap: 4 },
  heroName: {
    fontSize: 15, fontWeight: '600', color: Colors.secondary[800],
    lineHeight: 20, marginBottom: 4,
  },
  heroPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPrice: { fontSize: 22, fontWeight: '800', color: Colors.primary[600] },
  heroDiscountBadge: {
    backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  heroDiscountText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  heroOldPrice: {
    fontSize: 13, color: Colors.secondary[400], textDecorationLine: 'line-through',
  },
  heroCtaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, alignSelf: 'flex-start', marginTop: 8,
  },
  heroCtaText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  // Top 3
  topSection: {
    backgroundColor: Colors.white, paddingTop: 16, paddingBottom: 16, marginBottom: 8,
  },
  topHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginBottom: 14,
  },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary[900] },
  topScrollContent: { paddingHorizontal: 16, gap: 12 },
  topCard: {
    width: 150, backgroundColor: Colors.secondary[50],
    borderRadius: 14, padding: 12, paddingTop: 16, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.secondary[200], position: 'relative',
  },
  topMedal: {
    position: 'absolute', top: 6, left: 6, width: 26, height: 26,
    borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  topMedalText: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  topProductImage: { width: 100, height: 100, marginBottom: 8 },
  topProductName: {
    fontSize: 12, fontWeight: '500', color: Colors.secondary[700],
    textAlign: 'center', height: 32, marginBottom: 4,
  },
  topProductPrice: { fontSize: 15, fontWeight: '700', color: Colors.primary[600] },

  // Trust
  trustStrip: {
    flexDirection: 'row', backgroundColor: Colors.white,
    paddingVertical: 16, paddingHorizontal: 8, marginBottom: 8,
    justifyContent: 'space-around',
  },
  trustItem: { alignItems: 'center', flex: 1, gap: 6 },
  trustIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  trustTitle: {
    fontSize: 10, fontWeight: '600', color: Colors.secondary[600],
    textAlign: 'center', lineHeight: 13,
  },

  // Discover
  discoverHeader: {
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4,
  },
  discoverTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  discoverTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary[900] },
  discoverSubtitle: { fontSize: 13, color: Colors.secondary[400] },
  discoverGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10,
    backgroundColor: Colors.white, paddingBottom: 12,
  },

  // Load more
  loadMoreWrap: {
    backgroundColor: Colors.white, paddingVertical: 20, paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  loadMoreBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  loadMoreInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
  },
  loadMoreText: { fontSize: 13, color: Colors.secondary[400] },
});
