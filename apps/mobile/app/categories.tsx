import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import type { Category } from '../services/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Category icons ──
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

const ICON_BG_COLORS = [
  Colors.primary[100],
  '#e0f2fe',
  '#fce7f3',
  '#d1fae5',
  '#fef3c7',
  '#ede9fe',
  '#fde68a',
  '#ccfbf1',
  '#fee2e2',
  '#e0e7ff',
];

const ICON_COLORS = [
  Colors.primary[600],
  '#0284c7',
  '#db2777',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#b45309',
  '#0d9488',
  '#dc2626',
  '#4f46e5',
];

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ categories: Category[] }>('/categories');
        setCategories(res.categories || []);
      } catch {
        try {
          const res = await api.get<{ categories: Category[] }>('/categories/main');
          setCategories(res.categories || []);
        } catch {
          setCategories([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleExpand = (catId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const renderChildren = (children: Category[], parentIndex: number) => {
    return children.map((child) => {
      const hasGrandchildren = child.children && child.children.length > 0;
      const isExpanded = expandedCats.has(child.id);

      return (
        <View key={child.id}>
          <TouchableOpacity
            style={styles.childItem}
            onPress={() => {
              if (hasGrandchildren) {
                toggleExpand(child.id);
              } else {
                router.push(`/category/${child.slug}`);
              }
            }}
            activeOpacity={0.6}
          >
            <View style={styles.childLeft}>
              <View style={styles.childDot} />
              <Text style={styles.childName} numberOfLines={1}>
                {child.name}
              </Text>
              {child.productCount != null && child.productCount > 0 && (
                <Text style={styles.childCount}>({child.productCount})</Text>
              )}
            </View>
            {hasGrandchildren ? (
              <FontAwesome
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={11}
                color={Colors.secondary[400]}
              />
            ) : (
              <FontAwesome name="chevron-right" size={11} color={Colors.secondary[300]} />
            )}
          </TouchableOpacity>

          {/* Grandchildren */}
          {hasGrandchildren && isExpanded && (
            <View style={styles.grandchildrenWrap}>
              {child.children!.map((gc) => (
                <TouchableOpacity
                  key={gc.id}
                  style={styles.grandchildItem}
                  onPress={() => router.push(`/category/${gc.slug}`)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.grandchildName} numberOfLines={1}>
                    {gc.name}
                  </Text>
                  {gc.productCount != null && gc.productCount > 0 && (
                    <Text style={styles.grandchildCount}>({gc.productCount})</Text>
                  )}
                  <FontAwesome name="chevron-right" size={10} color={Colors.secondary[300]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Wszystkie kategorie',
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.secondary[800],
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Ładowanie kategorii...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.centerContent}>
            <FontAwesome name="folder-open-o" size={48} color={Colors.secondary[300]} />
            <Text style={styles.emptyText}>Brak kategorii</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* "Wszystkie produkty" link at top */}
            <TouchableOpacity
              style={styles.allProductsBtn}
              onPress={() => router.push('/(tabs)/search')}
              activeOpacity={0.7}
            >
              <View style={[styles.allProductsIcon]}>
                <FontAwesome name="th" size={18} color={Colors.primary[500]} />
              </View>
              <Text style={styles.allProductsText}>Wszystkie produkty</Text>
              <FontAwesome name="chevron-right" size={12} color={Colors.secondary[400]} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Category tree */}
            {categories.map((cat, index) => {
              const hasChildren = cat.children && cat.children.length > 0;
              const isExpanded = expandedCats.has(cat.id);
              const colorIdx = index % ICON_COLORS.length;

              return (
                <View key={cat.id} style={styles.parentSection}>
                  {/* Parent row */}
                  <TouchableOpacity
                    style={styles.parentItem}
                    onPress={() => {
                      if (hasChildren) {
                        toggleExpand(cat.id);
                      } else {
                        router.push(`/category/${cat.slug}`);
                      }
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={styles.parentLeft}>
                      <View
                        style={[
                          styles.parentIconCircle,
                          { backgroundColor: ICON_BG_COLORS[colorIdx] },
                        ]}
                      >
                        <FontAwesome
                          name={getCategoryIcon(cat.slug) as any}
                          size={18}
                          color={ICON_COLORS[colorIdx]}
                        />
                      </View>
                      <View style={styles.parentInfo}>
                        <Text style={styles.parentName} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        {cat.productCount != null && cat.productCount > 0 && (
                          <Text style={styles.parentCount}>
                            {cat.productCount} produkt{cat.productCount === 1 ? '' : cat.productCount < 5 ? 'y' : 'ów'}
                          </Text>
                        )}
                      </View>
                    </View>
                    {hasChildren ? (
                      <FontAwesome
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={13}
                        color={Colors.secondary[400]}
                      />
                    ) : (
                      <FontAwesome name="chevron-right" size={13} color={Colors.secondary[300]} />
                    )}
                  </TouchableOpacity>

                  {/* "Zobacz wszystko w ..." link */}
                  {hasChildren && isExpanded && (
                    <TouchableOpacity
                      style={styles.seeAllInCategory}
                      onPress={() => router.push(`/category/${cat.slug}`)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.seeAllInCategoryText}>
                        Zobacz wszystko w "{cat.name}"
                      </Text>
                      <FontAwesome name="arrow-right" size={11} color={Colors.primary[500]} />
                    </TouchableOpacity>
                  )}

                  {/* Children */}
                  {hasChildren && isExpanded && renderChildren(cat.children!, index)}

                  <View style={styles.divider} />
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.secondary[500],
  },
  emptyText: {
    fontSize: 16,
    color: Colors.secondary[500],
    marginTop: 8,
  },

  // ── All products ──
  allProductsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  allProductsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  allProductsText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },

  divider: {
    height: 1,
    backgroundColor: Colors.secondary[100],
    marginHorizontal: 16,
  },

  // ── Parent category ──
  parentSection: {},
  parentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  parentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  parentIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  parentCount: {
    fontSize: 12,
    color: Colors.secondary[400],
    marginTop: 2,
  },

  // ── "Zobacz wszystko w..." ──
  seeAllInCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 68,
    paddingBottom: 6,
  },
  seeAllInCategoryText: {
    fontSize: 13,
    color: Colors.primary[500],
    fontWeight: '500',
  },

  // ── Child category ──
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 68,
    paddingRight: 16,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.secondary[100],
  },
  childLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  childDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary[300],
  },
  childName: {
    fontSize: 14,
    color: Colors.secondary[700],
    flexShrink: 1,
  },
  childCount: {
    fontSize: 12,
    color: Colors.secondary[400],
  },

  // ── Grandchild category ──
  grandchildrenWrap: {
    paddingLeft: 84,
  },
  grandchildItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.secondary[50],
  },
  grandchildName: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondary[600],
  },
  grandchildCount: {
    fontSize: 11,
    color: Colors.secondary[400],
  },
});
