import React, { useEffect, useState, useCallback } from 'react';
import { pluralizeProducts } from '../utils/pluralize';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../services/api';
import { useThemeColors } from '../hooks/useThemeColors';
import { getCategoryIcon } from '../constants/CategoryIcons';
import type { Category } from '../services/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CategoriesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ categories: Category[] }>('/categories');
      setCategories(res.categories || []);
    } catch {
      try {
        const res = await api.get<{ categories: Category[] }>('/categories/main');
        setCategories(res.categories || []);
      } catch {
        setCategories([]);
        setError('Nie udało się załadować kategorii');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
            style={[styles.childItem, { borderTopColor: colors.borderLight }]}
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
              <View style={[styles.childDot, { backgroundColor: colors.border }]} />
              <Text style={[styles.childName, { color: colors.textSecondary }]} numberOfLines={1}>
                {child.name}
              </Text>
              {child.productCount != null && child.productCount > 0 && (
                <Text style={[styles.childCount, { color: colors.textMuted }]}>({child.productCount})</Text>
              )}
            </View>
            {hasGrandchildren ? (
              <FontAwesome
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={11}
                color={colors.textMuted}
              />
            ) : (
              <FontAwesome name="chevron-right" size={11} color={colors.border} />
            )}
          </TouchableOpacity>

          {/* Grandchildren */}
          {hasGrandchildren && isExpanded && (
            <View style={styles.grandchildrenWrap}>
              {child.children!.map((gc) => (
                <TouchableOpacity
                  key={gc.id}
                  style={[styles.grandchildItem, { borderTopColor: colors.backgroundSecondary }]}
                  onPress={() => router.push(`/category/${gc.slug}`)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.grandchildName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {gc.name}
                  </Text>
                  {gc.productCount != null && gc.productCount > 0 && (
                    <Text style={[styles.grandchildCount, { color: colors.textMuted }]}>({gc.productCount})</Text>
                  )}
                  <FontAwesome name="chevron-right" size={10} color={colors.border} />
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
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]} edges={['bottom']}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Ładowanie kategorii...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <FontAwesome name="exclamation-triangle" size={48} color={colors.destructive} />
            <Text style={[styles.emptyText, { color: colors.destructive, marginBottom: 12 }]}>{error}</Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.tint, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
              onPress={loadCategories}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Spróbuj ponownie</Text>
            </TouchableOpacity>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.centerContent}>
            <FontAwesome name="folder-open-o" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Brak kategorii</Text>
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
              onPress={() => router.push({ pathname: '/products/list', params: { carouselName: 'Wszystkie produkty' } } as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.allProductsIcon, { backgroundColor: colors.tintLight }]}>
                <FontAwesome name="th" size={18} color={colors.tint} />
              </View>
              <Text style={[styles.allProductsText, { color: colors.text }]}>Wszystkie produkty</Text>
              <FontAwesome name="chevron-right" size={12} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            {/* Category tree */}
            {categories.map((cat, index) => {
              const hasChildren = cat.children && cat.children.length > 0;
              const isExpanded = expandedCats.has(cat.id);

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
                      <View style={[styles.parentIconCircle, { backgroundColor: colors.categoryIconBg || colors.card }]}>
                        <Image
                          source={getCategoryIcon(cat.slug)}
                          style={styles.categoryIconImage}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.parentInfo}>
                        <Text style={[styles.parentName, { color: colors.text }]} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        {cat.productCount != null && cat.productCount > 0 && (
                          <Text style={[styles.parentCount, { color: colors.textMuted }]}>
                            {pluralizeProducts(cat.productCount)}
                          </Text>
                        )}
                      </View>
                    </View>
                    {hasChildren ? (
                      <FontAwesome
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={13}
                        color={colors.textMuted}
                      />
                    ) : (
                      <FontAwesome name="chevron-right" size={13} color={colors.border} />
                    )}
                  </TouchableOpacity>

                  {/* "Zobacz wszystko w ..." link */}
                  {hasChildren && isExpanded && (
                    <TouchableOpacity
                      style={styles.seeAllInCategory}
                      onPress={() => router.push(`/category/${cat.slug}`)}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.seeAllInCategoryText, { color: colors.tint }]}>
                        Zobacz wszystko w "{cat.name}"
                      </Text>
                      <FontAwesome name="arrow-right" size={11} color={colors.tint} />
                    </TouchableOpacity>
                  )}

                  {/* Children */}
                  {hasChildren && isExpanded && renderChildren(cat.children!, index)}

                  <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
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
  },
  emptyText: {
    fontSize: 16,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  allProductsText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },

  divider: {
    height: 1,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f97316',
  },
  categoryIconImage: {
    width: 36,
    height: 36,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 15,
    fontWeight: '600',
  },
  parentCount: {
    fontSize: 12,
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
  },
  childName: {
    fontSize: 14,
    flexShrink: 1,
  },
  childCount: {
    fontSize: 12,
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
  },
  grandchildName: {
    flex: 1,
    fontSize: 13,
  },
  grandchildCount: {
    fontSize: 11,
  },
});
