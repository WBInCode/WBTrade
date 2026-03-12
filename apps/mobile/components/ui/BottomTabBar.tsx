import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';

const TABS = [
  { name: 'Główna',  icon: 'home'          as const, route: '/(tabs)/'        },
  { name: 'Szukaj',  icon: 'search'        as const, route: '/(tabs)/search'  },
  { name: 'Koszyk',  icon: 'shopping-cart' as const, route: '/(tabs)/cart'    },
  { name: 'Ulubione',icon: 'heart'         as const, route: '/(tabs)/wishlist' },
  { name: 'Konto',   icon: 'user'          as const, route: '/(tabs)/account' },
] as const;

function BadgeIcon({ count, color, icon, size }: { count: number; color: string; icon: React.ComponentProps<typeof FontAwesome>['name']; size: number }) {
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current && count > 0) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
        Animated.spring(scale, { toValue: 1,   useNativeDriver: true, speed: 30 }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, scale]);

  return (
    <View>
      <FontAwesome name={icon} size={size} color={color} style={{ marginBottom: -3 }} />
      {count > 0 && (
        <Animated.View style={[styles.badge, { backgroundColor: colors.badge, transform: [{ scale }] }]}>
          <Text style={[styles.badgeText, { color: colors.badgeText }]}>
            {count > 99 ? '99+' : count}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.tabBarBackground,
        borderTopColor: colors.tabBarBorder,
        paddingBottom: insets.bottom,
      },
    ]}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.route || (tab.route === '/(tabs)/' && pathname === '/');
        const iconColor = isActive ? colors.tint : colors.textMuted;
        const labelColor = isActive ? colors.tint : colors.textMuted;

        const count =
          tab.icon === 'shopping-cart' ? itemCount :
          tab.icon === 'heart'         ? wishlistCount : 0;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <BadgeIcon icon={tab.icon} size={tab.icon === 'heart' ? 22 : 24} color={iconColor} count={count} />
            <Text style={[styles.label, { color: labelColor, fontWeight: isActive ? '600' : '400' }]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    gap: 4,
  },
  label: {
    fontSize: 10,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
