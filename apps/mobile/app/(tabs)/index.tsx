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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { loadNotifications } from '../notifications';
import { api } from '../../services/api';
import { useThemeColors } from '../../hooks/useThemeColors';
import { getCategoryIcon } from '../../constants/CategoryIcons';
import { useScrollContext } from '../../contexts/ScrollContext';
import ProductCarousel from '../../components/product/ProductCarousel';
import ProductCard from '../../components/product/ProductCard';
import type { Product, Category } from '../../services/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface CategoryBanner {
  slug: string;
  title: string;
  subtitle: string;
  icon: MCIconName;
  icon2: MCIconName;
  bgColor: string;
  accentColor: string;
}

const CATEGORY_BANNER_PRESETS: Array<{ keywords: string[]; subtitle: string; icon: MCIconName; icon2: MCIconName; bgColor: string; accentColor: string }> = [
  { keywords: ['elektron', 'gsm', 'rtv', 'agd'], subtitle: 'Odkryj hity technologiczne', icon: 'laptop', icon2: 'chip', bgColor: '#1e3a5f', accentColor: '#60a5fa' },
  { keywords: ['dom', 'ogrod', 'meble', 'dekor'], subtitle: 'Wiosenne inspiracje dla domu', icon: 'home-roof', icon2: 'flower-tulip-outline', bgColor: '#14532d', accentColor: '#4ade80' },
  { keywords: ['sport', 'turyst', 'fitness'], subtitle: 'Wyposaż się na nowy sezon!', icon: 'basketball', icon2: 'trophy-outline', bgColor: '#78350f', accentColor: '#fbbf24' },
  { keywords: ['dziec', 'dziecko', 'zabaw'], subtitle: 'Najlepsze dla Twojego malucha', icon: 'baby-face-outline', icon2: 'teddy-bear', bgColor: '#4c1d95', accentColor: '#a78bfa' },
  { keywords: ['motor', 'samoch', 'auto'], subtitle: 'Wszystko do Twojego auta', icon: 'car-outline', icon2: 'wrench-outline', bgColor: '#1c1917', accentColor: '#f97316' },
  { keywords: ['narz', 'warsztat'], subtitle: 'Narzędzia dla profesjonalistów', icon: 'toolbox-outline', icon2: 'hammer-screwdriver', bgColor: '#1e1b4b', accentColor: '#818cf8' },
  { keywords: ['chemia', 'czyst'], subtitle: 'Środki do sprzątania i higieny', icon: 'bottle-tonic-outline', icon2: 'spray-bottle', bgColor: '#0f2b4a', accentColor: '#38bdf8' },
  { keywords: ['wag', 'pomiar'], subtitle: 'Precyzyjny sprzęt pomiarowy', icon: 'scale-balance', icon2: 'numeric', bgColor: '#1f2937', accentColor: '#6ee7b7' },
  { keywords: ['outlet'], subtitle: 'Najlepsze okazje cenowe', icon: 'tag-multiple-outline', icon2: 'sale', bgColor: '#4a0d0d', accentColor: '#f87171' },
  { keywords: ['gastro', 'food', 'jedz'], subtitle: 'Wyposażenie gastronomiczne', icon: 'chef-hat', icon2: 'silverware-fork-knife', bgColor: '#1a2e1a', accentColor: '#86efac' },
];

const FALLBACK_PRESET = { subtitle: 'Sprawdź ofertę', icon: 'store-outline' as MCIconName, icon2: 'arrow-right' as MCIconName, bgColor: '#1e293b', accentColor: '#94a3b8' };

function buildCategoryBanners(categories: Category[]): CategoryBanner[] {
  return categories.slice(0, 4).map((cat) => {
    const s = cat.slug.toLowerCase();
    const preset = CATEGORY_BANNER_PRESETS.find((p) => p.keywords.some((k) => s.includes(k))) || FALLBACK_PRESET;
    return {
      slug: cat.slug,
      title: cat.name,
      subtitle: preset.subtitle,
      icon: preset.icon,
      icon2: preset.icon2,
      bgColor: preset.bgColor,
      accentColor: preset.accentColor,
    };
  });
}
const BANNER_WIDTH = SCREEN_WIDTH - 32;

interface CarouselMeta {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  productLimit: number;
  sortOrder: number;
}

interface HomeData {
  carousels: { meta: CarouselMeta; products: Product[] }[];
  categories: Category[];
  mostWishlisted: Product | null;
}

// Section item types for FlatList virtualization
type SectionItem =
  | { type: 'header' }
  | { type: 'categories'; categories: Category[] }
  | { type: 'promo'; categories: Category[] }
  | { type: 'carousel'; title: string; slug: string; products: Product[]; key: string }
  | { type: 'hero'; product: Product }
  | { type: 'top3'; products: Product[] }
  | { type: 'trust' }
  | { type: 'discover-header' }
  | { type: 'discover-row'; products: Product[] }
  | { type: 'load-more' };

// ═══════════════════════════════════════════════════════
// Memoized section components — each renders in isolation
// ═══════════════════════════════════════════════════════

function HeaderSection() {
  const router = useRouter();
  const colors = useThemeColors();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadNotifications().then((items) => {
        setUnreadCount(items.filter((n) => !n.read).length);
      });
    }, [])
  );

  return (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <View style={styles.headerTop}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={styles.headerMascot}
          contentFit="contain"
        />
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => router.push('/notifications' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
          {unreadCount > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: colors.badge }]}>
              <Text style={[styles.bellBadgeText, { color: colors.badgeText }]}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={[styles.headerDivider, { backgroundColor: colors.border }]} />
      <TouchableOpacity style={[styles.searchBar, { backgroundColor: colors.searchBackground, borderWidth: 1, borderColor: colors.searchBorder }]} onPress={() => router.push('/(tabs)/search')} activeOpacity={0.8}>
        <FontAwesome name="search" size={15} color={colors.searchPlaceholder} />
        <Text style={[styles.searchPlaceholder, { color: colors.searchPlaceholder }]}>Czego szukasz?</Text>
      </TouchableOpacity>
    </View>
  );
}

const CategoriesSection = React.memo(function CategoriesSection({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <View style={[styles.categoriesSection, { backgroundColor: colors.card }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollContent}>
        {categories.map((cat, index) => (
          <TouchableOpacity key={cat.id} style={styles.categoryCircleWrap} onPress={() => router.push(`/category/${cat.slug}`)}>
            <View style={[styles.categoryCircle, { backgroundColor: colors.card, borderColor: colors.tint }]}>
              <Image source={getCategoryIcon(cat.slug)} style={styles.categoryIconImage} contentFit="contain" />
            </View>
            <Text style={[styles.categoryCircleLabel, { color: colors.textSecondary }]} numberOfLines={2}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={[styles.allCategoriesBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => router.push('/categories')} activeOpacity={0.7}>
        <FontAwesome name="th-list" size={15} color={colors.tint} />
        <Text style={[styles.allCategoriesBtnText, { color: colors.textSecondary }]}>Wszystkie kategorie</Text>
        <FontAwesome name="chevron-right" size={12} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
});

const PromoSection = React.memo(function PromoSection({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const colors = useThemeColors();
  const banners = useMemo(() => buildCategoryBanners(categories), [categories]);

  if (banners.length === 0) return null;

  return (
    <View style={[styles.promoSection, { backgroundColor: colors.card }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.promoScrollContent}
      >
        {banners.map((banner) => (
          <TouchableOpacity
            key={banner.slug}
            style={[styles.promoBanner, { backgroundColor: banner.bgColor }]}
            onPress={() => router.push(`/category/${banner.slug}` as any)}
            activeOpacity={0.9}
          >
            <View style={styles.promoDecorWrap}>
              <MaterialCommunityIcons name={banner.icon} size={80} color={banner.accentColor} style={{ opacity: 0.12, position: 'absolute', top: -10, right: -10 }} />
              <MaterialCommunityIcons name={banner.icon2} size={50} color={banner.accentColor} style={{ opacity: 0.08, position: 'absolute', bottom: 10, right: 60 }} />
            </View>
            <View style={styles.promoBannerContent}>
              <View style={[styles.promoBannerIconWrap, { backgroundColor: banner.accentColor }]}>
                <MaterialCommunityIcons name={banner.icon} size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.promoBannerTitle, { color: colors.textInverse }]}>{banner.title}</Text>
                <Text style={styles.promoBannerSub}>{banner.subtitle}</Text>
              </View>
              <View style={[styles.promoBannerCta, { backgroundColor: banner.accentColor }]}>
                <Text style={[styles.promoBannerCtaText, { color: colors.textInverse }]}>Zobacz</Text>
                <FontAwesome name="chevron-right" size={10} color={colors.textInverse} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

const CarouselSection = React.memo(function CarouselSection({ title, slug, products }: { title: string; slug: string; products: Product[] }) {
  const router = useRouter();
  const colors = useThemeColors();
  const goToList = () => router.push({ pathname: '/(tabs)/search', params: { carousel: slug, carouselName: title } } as any);
  return (
    <View style={[styles.productSection, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity onPress={goToList} style={styles.seeAllBtn}>
          <Text style={[styles.seeAllText, { color: colors.tint }]}>Więcej</Text>
          <FontAwesome name="chevron-right" size={11} color={colors.tint} />
        </TouchableOpacity>
      </View>
      <ProductCarousel products={products} onSeeAll={goToList} />
    </View>
  );
});

const HeroSection = React.memo(function HeroSection({ product }: { product: Product }) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <View style={[styles.heroSection, { backgroundColor: colors.card }]}>
      <View style={styles.heroHeader}>
        <View style={[styles.heroBadge, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
          <FontAwesome name="star" size={11} color={colors.warning} />
          <Text style={[styles.heroBadgeText, { color: colors.warningText }]}>PRODUKT DNIA</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.heroCard, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => router.push(`/product/${product.id}` as any)}
        activeOpacity={0.9}
      >
        {product.images?.[0]?.url && (
          <Image source={{ uri: product.images[0].url }} style={[styles.heroImage, { backgroundColor: colors.card }]} contentFit="contain" />
        )}
        <View style={styles.heroInfo}>
          <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
          <View style={styles.heroPriceRow}>
            <Text style={[styles.heroPrice, { color: colors.tint }]}>{Number(product.price).toFixed(2).replace('.', ',')} zł</Text>
            {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
              <View style={[styles.heroDiscountBadge, { backgroundColor: colors.success }]}>
                <Text style={[styles.heroDiscountText, { color: colors.textInverse }]}>
                  -{Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)}%
                </Text>
              </View>
            )}
          </View>
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
            <Text style={[styles.heroOldPrice, { color: colors.textMuted }]}>{Number(product.compareAtPrice).toFixed(2).replace('.', ',')} zł</Text>
          )}
          <View style={[styles.heroCtaBtn, { backgroundColor: colors.tint }]}>
            <Text style={[styles.heroCtaText, { color: colors.textInverse }]}>Zobacz produkt</Text>
            <FontAwesome name="arrow-right" size={12} color={colors.textInverse} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const Top3Section = React.memo(function Top3Section({ products }: { products: Product[] }) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <View style={[styles.topSection, { backgroundColor: colors.card }]}>
      <View style={styles.topHeader}>
        <FontAwesome name="trophy" size={18} color="#f59e0b" />
        <Text style={[styles.topTitle, { color: colors.text }]}>Top 3 tego tygodnia</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topScrollContent}>
        {products.slice(0, 3).map((product, index) => (
          <TouchableOpacity
            key={product.id}
            style={[styles.topCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => router.push(`/product/${product.id}` as any)}
            activeOpacity={0.9}
          >
            <View style={[styles.topMedal, { backgroundColor: ['#f59e0b', '#9ca3af', '#cd7f32'][index] }]}>
              <Text style={[styles.topMedalText, { color: colors.textInverse }]}>{index + 1}</Text>
            </View>
            {product.images?.[0]?.url && (
              <Image source={{ uri: product.images[0].url }} style={styles.topProductImage} contentFit="contain" />
            )}
            <Text style={[styles.topProductName, { color: colors.textSecondary }]} numberOfLines={2}>{product.name}</Text>
            <Text style={[styles.topProductPrice, { color: colors.tint }]}>{Number(product.price).toFixed(2).replace('.', ',')} zł</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

const TrustSection = React.memo(function TrustSection() {
  const colors = useThemeColors();
  return (
    <View style={[styles.trustStrip, { backgroundColor: colors.card }]}>
      {([
        { icon: 'truck' as const, title: 'Szybka wysyłka' },
        { icon: 'shield' as const, title: 'Bezpieczne\npłatności' },
        { icon: 'undo' as const, title: 'Zwrot\n14 dni' },
        { icon: 'headphones' as const, title: 'Wsparcie\n24/7' },
      ]).map((item) => (
        <View key={item.title} style={styles.trustItem}>
          <View style={[styles.trustIconWrap, { backgroundColor: colors.tintLight }]}>
            <FontAwesome name={item.icon} size={18} color={colors.tint} />
          </View>
          <Text style={[styles.trustTitle, { color: colors.textSecondary }]}>{item.title}</Text>
        </View>
      ))}
    </View>
  );
});

const DiscoverHeader = React.memo(function DiscoverHeader() {
  const colors = useThemeColors();
  return (
    <View style={[styles.discoverHeader, { backgroundColor: colors.card }]}>
      <View style={styles.discoverTitleRow}>
        <FontAwesome name="random" size={16} color={colors.tint} />
        <Text style={[styles.discoverTitle, { color: colors.text }]}>Odkryj coś dla siebie</Text>
      </View>
      <Text style={[styles.discoverSubtitle, { color: colors.textMuted }]}>Produkty dobrane losowo</Text>
    </View>
  );
});

const DiscoverRow = React.memo(function DiscoverRow({ products }: { products: Product[] }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.discoverGrid, { backgroundColor: colors.card }]}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </View>
  );
});

// ═══════════════════════════════════════════════════════
// Skeleton shimmer loading state
// ═══════════════════════════════════════════════════════
function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return <Animated.View style={[{ width: width as any, height, borderRadius: 8, backgroundColor: '#888', opacity }, style]} />;
}

const HomeSkeleton = React.memo(function HomeSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Logo placeholder */}
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <SkeletonBlock width={100} height={40} />
      </View>
      {/* Search bar */}
      <SkeletonBlock width="100%" height={44} style={{ borderRadius: 22, marginBottom: 16 }} />
      {/* Categories */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        {[1,2,3,4,5].map(i => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <SkeletonBlock width={64} height={64} style={{ borderRadius: 32 }} />
            <SkeletonBlock width={50} height={10} />
          </View>
        ))}
      </View>
      {/* Section title */}
      <SkeletonBlock width={150} height={18} style={{ marginBottom: 12 }} />
      {/* Product cards row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[1,2].map(i => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' }}>
            <SkeletonBlock width="100%" height={160} style={{ borderRadius: 0 }} />
            <View style={{ padding: 10, gap: 6 }}>
              <SkeletonBlock width="90%" height={14} />
              <SkeletonBlock width="60%" height={12} />
              <SkeletonBlock width="40%" height={16} />
              <SkeletonBlock width="100%" height={36} style={{ borderRadius: 8, marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>
      {/* Another section */}
      <SkeletonBlock width={120} height={18} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1,2].map(i => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' }}>
            <SkeletonBlock width="100%" height={160} style={{ borderRadius: 0 }} />
            <View style={{ padding: 10, gap: 6 }}>
              <SkeletonBlock width="80%" height={14} />
              <SkeletonBlock width="50%" height={12} />
              <SkeletonBlock width="45%" height={16} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════
// Main HomeScreen — uses FlatList for virtualization
// ═══════════════════════════════════════════════════════
export default function HomeScreen() {
  const colors = useThemeColors();
  const scrollCtx = useScrollContext();
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
      const [carouselListRes, catRes, heroRes] = await Promise.allSettled([
        api.get<{ carousels: CarouselMeta[] }>('/carousels'),
        api.get<{ categories: Category[] }>('/categories/main'),
        api.get<{ product: Product | null }>('/products/most-wishlisted'),
      ]);

      const carouselMetas: CarouselMeta[] =
        carouselListRes.status === 'fulfilled' ? carouselListRes.value.carousels || [] : [];

      // Fetch products for each carousel in parallel
      const carouselProductResults = await Promise.allSettled(
        carouselMetas.map((c) =>
          api.get<{ products: Product[] }>(`/carousels/${c.slug}/products`)
        )
      );

      const carousels = carouselMetas
        .map((meta, i) => ({
          meta,
          products:
            carouselProductResults[i].status === 'fulfilled'
              ? (carouselProductResults[i] as PromiseFulfilledResult<{ products: Product[] }>).value.products || []
              : [],
        }))
        .filter((c) => c.products.length > 0);

      // Fallback jeśli karuzele puste
      if (carousels.length === 0) {
        try {
          const fallback = await api.get<{ products: Product[] }>('/products', { limit: 10, sort: 'newest' });
          carousels.push({
            meta: { id: 'fallback', slug: 'featured', name: 'Polecane', icon: 'star', color: 'from-violet-600 to-purple-700', productLimit: 10, sortOrder: 0 },
            products: fallback.products || [],
          });
        } catch {
          setError('Nie udało się załadować produktów. Sprawdź połączenie z internetem.');
        }
      }

      setData({
        carousels,
        categories: catRes.status === 'fulfilled' ? catRes.value.categories || [] : [],
        mostWishlisted: heroRes.status === 'fulfilled' ? heroRes.value.product || null : null,
      });
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
    items.push({ type: 'promo', categories: data.categories });

    // Wstaw karuzele dynamicznie z panelu admina
    const firstCarousel = data.carousels[0];
    if (firstCarousel) {
      items.push({ type: 'carousel', title: firstCarousel.meta.name, slug: firstCarousel.meta.slug, products: firstCarousel.products, key: firstCarousel.meta.slug });
    }

    // Hero produkt
    const allProducts = data.carousels.flatMap((c) => c.products);
    const heroProduct = data.mostWishlisted || allProducts[0] || null;
    if (heroProduct) {
      items.push({ type: 'hero', product: heroProduct });
    }

    // Pozostałe karuzele
    for (let i = 1; i < data.carousels.length; i++) {
      const c = data.carousels[i];
      items.push({ type: 'carousel', title: c.meta.name, slug: c.meta.slug, products: c.products, key: c.meta.slug });
      // Po drugiej karuzeli dodaj Top3 (z bestsellery jeśli istnieje)
      if (i === 1) {
        const bestsellersCarousel = data.carousels.find((x) => x.meta.slug === 'bestsellers');
        const top3products = bestsellersCarousel?.products || c.products;
        if (top3products.length >= 3) {
          items.push({ type: 'top3', products: top3products });
        }
      }
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
        return <PromoSection categories={item.categories} />;
      case 'carousel':
        return <CarouselSection title={item.title} slug={item.slug} products={item.products} />;
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
          <View style={[styles.loadMoreWrap, { backgroundColor: colors.card }]}>
            {discoverLoading ? (
              <View style={styles.loadMoreInner}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.loadMoreText, { color: colors.textMuted }]}>Ładuję produkty...</Text>
              </View>
            ) : discoverProducts.length === 0 ? (
              <TouchableOpacity style={[styles.loadMoreBtn, { backgroundColor: colors.tint }]} onPress={loadMoreDiscover} activeOpacity={0.7}>
                <FontAwesome name="plus-circle" size={18} color={colors.textInverse} />
                <Text style={[styles.loadMoreBtnText, { color: colors.textInverse }]}>Odkryj więcej produktów</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.loadMoreInner}>
                <Text style={[styles.loadMoreText, { color: colors.textMuted }]}>Przewiń w dół, aby załadować więcej</Text>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  }, [colors, discoverLoading, discoverProducts.length, loadMoreDiscover]);

  const keyExtractor = useCallback((item: SectionItem, index: number) => {
    if (item.type === 'carousel') return `carousel-${item.key}`;
    return `section-${item.type}-${index}`;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <HomeSkeleton colors={colors} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.centerContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} colors={[colors.tint]} />
          }
        >
          <FontAwesome name="exclamation-triangle" size={40} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <Text style={[styles.errorHint, { color: colors.textSecondary }]}>Pociągnij w dół aby spróbować ponownie</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        onScroll={scrollCtx?.handleScroll}
        scrollEventThrottle={16}
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
// Styles (structural only — colors applied inline)
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  // Header
  header: {
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
  },
  headerTop: {
    alignItems: 'center', marginBottom: 10, position: 'relative',
  },
  headerLogo: { width: 143, height: 42 },
  headerMascot: { width: 80, height: 80 },
  bellButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  headerDivider: {
    height: 1, marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 11, gap: 10,
  },
  searchPlaceholder: { fontSize: 15 },

  // Categories
  categoriesSection: {
    paddingTop: 16, paddingBottom: 4, marginBottom: 8,
  },
  categoriesScrollContent: { paddingHorizontal: 12, gap: 6 },
  categoryCircleWrap: { alignItems: 'center', width: 90 },
  categoryCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 2,
  },
  categoryIconImage: {
    width: 54, height: 54,
  },
  categoryCircleLabel: {
    fontSize: 11, textAlign: 'center',
    lineHeight: 14, fontWeight: '600',
  },
  allCategoriesBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 10, marginHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  allCategoriesBtnText: { fontSize: 14, fontWeight: '600' },

  // Product sections
  productSection: {
    paddingTop: 16, paddingBottom: 8, marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 2,
  },
  seeAllText: { fontSize: 14, fontWeight: '500' },

  // Error
  errorText: { fontSize: 16, textAlign: 'center' },
  errorHint: { fontSize: 14, textAlign: 'center' },

  // Promo
  promoSection: {
    paddingTop: 12, paddingBottom: 16, marginBottom: 8,
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
  promoBannerTitle: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  promoBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  promoBannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  promoBannerCtaText: { fontSize: 13, fontWeight: '700' },

  // Hero
  heroSection: {
    paddingTop: 16, paddingBottom: 16,
    paddingHorizontal: 16, marginBottom: 8,
  },
  heroHeader: { marginBottom: 12 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroCard: {
    flexDirection: 'row',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1,
  },
  heroImage: { width: SCREEN_WIDTH * 0.38, height: 180 },
  heroInfo: { flex: 1, padding: 14, justifyContent: 'center', gap: 4 },
  heroName: {
    fontSize: 15, fontWeight: '600',
    lineHeight: 20, marginBottom: 4,
  },
  heroPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPrice: { fontSize: 22, fontWeight: '800' },
  heroDiscountBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  heroDiscountText: { fontSize: 12, fontWeight: '700' },
  heroOldPrice: {
    fontSize: 13, textDecorationLine: 'line-through',
  },
  heroCtaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, alignSelf: 'flex-start', marginTop: 8,
  },
  heroCtaText: { fontSize: 13, fontWeight: '700' },

  // Top 3
  topSection: {
    paddingTop: 16, paddingBottom: 16, marginBottom: 8,
  },
  topHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginBottom: 14,
  },
  topTitle: { fontSize: 18, fontWeight: '700' },
  topScrollContent: { paddingHorizontal: 16, gap: 12 },
  topCard: {
    width: 150,
    borderRadius: 14, padding: 12, paddingTop: 16, alignItems: 'center',
    borderWidth: 1, position: 'relative',
  },
  topMedal: {
    position: 'absolute', top: 6, left: 6, width: 26, height: 26,
    borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  topMedalText: { fontSize: 13, fontWeight: '800' },
  topProductImage: { width: 100, height: 100, marginBottom: 8 },
  topProductName: {
    fontSize: 12, fontWeight: '500',
    textAlign: 'center', height: 32, marginBottom: 4,
  },
  topProductPrice: { fontSize: 15, fontWeight: '700' },

  // Trust
  trustStrip: {
    flexDirection: 'row',
    paddingVertical: 16, paddingHorizontal: 8, marginBottom: 8,
    justifyContent: 'space-around',
  },
  trustItem: { alignItems: 'center', flex: 1, gap: 6 },
  trustIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  trustTitle: {
    fontSize: 10, fontWeight: '600',
    textAlign: 'center', lineHeight: 13,
  },

  // Discover
  discoverHeader: {
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4,
  },
  discoverTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  discoverTitle: { fontSize: 18, fontWeight: '700' },
  discoverSubtitle: { fontSize: 13 },
  discoverGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10,
    paddingBottom: 12,
  },

  // Load more
  loadMoreWrap: {
    paddingVertical: 20, paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  loadMoreBtnText: { fontSize: 15, fontWeight: '700' },
  loadMoreInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
  },
  loadMoreText: { fontSize: 13 },
});
