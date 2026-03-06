import React, { useState, useRef, useEffect, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useSegments } from 'expo-router';
import { View, Text, Animated } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { ChatBubble } from '../../components/ChatBot';
import ChatBotModal from '../../components/ChatBot';
import { ScrollProvider, useScrollContext } from '../../contexts/ScrollContext';

// Tabs where chatbot bubble should be visible
const CHATBOT_ALLOWED_TABS = ['index', 'account'];

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

function CartIcon({ color }: { color: string }) {
  const { itemCount } = useCart();
  const colors = useThemeColors();
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount !== prevCount.current && itemCount > 0) {
      Animated.sequence([
        Animated.spring(badgeScale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
        Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
      ]).start();
    }
    prevCount.current = itemCount;
  }, [itemCount, badgeScale]);

  return (
    <View>
      <FontAwesome name="shopping-cart" size={24} color={color} style={{ marginBottom: -3 }} />
      {itemCount > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: -6,
            right: -10,
            backgroundColor: colors.badge,
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            transform: [{ scale: badgeScale }],
          }}
        >
          <Text style={{ color: colors.badgeText, fontSize: 10, fontWeight: '700' }}>
            {itemCount > 99 ? '99+' : itemCount}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

function WishlistIcon({ color }: { color: string }) {
  const { count } = useWishlist();
  const colors = useThemeColors();
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current && count > 0) {
      Animated.sequence([
        Animated.spring(badgeScale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
        Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, badgeScale]);

  return (
    <View>
      <FontAwesome name="heart" size={22} color={color} style={{ marginBottom: -3 }} />
      {count > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: -6,
            right: -10,
            backgroundColor: colors.badge,
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            transform: [{ scale: badgeScale }],
          }}
        >
          <Text style={{ color: colors.badgeText, fontSize: 10, fontWeight: '700' }}>
            {count > 99 ? '99+' : count}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <ScrollProvider>
      <TabLayoutInner />
    </ScrollProvider>
  );
}

function TabLayoutInner() {
  const colors = useThemeColors();
  const segments = useSegments();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatActive, setChatActive] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollCtx = useScrollContext();

  // Animated value: 0 = fully visible, 1 = hidden/rotated to corner
  const hideAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const isBubbleHidden = useRef(false);

  const hideBubble = useCallback(() => {
    isBubbleHidden.current = true;
    Animated.parallel([
      Animated.timing(hideAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(rotateAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();
  }, [hideAnim, rotateAnim]);

  const showBubble = useCallback(() => {
    isBubbleHidden.current = false;
    Animated.parallel([
      Animated.timing(hideAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      Animated.timing(rotateAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  }, [hideAnim, rotateAnim]);

  useEffect(() => {
    if (!scrollCtx) return;
    // Delay attaching the scroll listener so layout scroll events on mount
    // don't immediately hide the bubble before the user has a chance to tap it
    const attachTimer = setTimeout(() => {
      const unsub = scrollCtx.onDirectionChange((direction) => {
        if (direction === 'down') {
          hideBubble();
        }
        // No auto-show on scroll up — only a tap brings it back
      });
      return unsub;
    }, 1500);
    return () => clearTimeout(attachTimer);
  }, [scrollCtx, hideBubble]);

  // Translate X: 0 → 52px (slides bubble mostly off-screen to the right)
  const bubbleTranslateX = hideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });

  // Rotate: 0 → 90deg so the bubble head peeks from the right edge
  const bubbleRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  // Keep slightly visible so user knows it's there
  const bubbleOpacity = hideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });

  const currentTab = segments.length > 1 ? segments[1] : 'index';
  const showChatBubble = CHATBOT_ALLOWED_TABS.includes(currentTab as string);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Główna',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Szukaj',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Koszyk',
          tabBarIcon: ({ color }) => <CartIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Ulubione',
          tabBarIcon: ({ color }) => <WishlistIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Konto',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="category/[slug]"
        options={{
          href: null,
          title: 'Kategoria',
          headerShown: true,
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTitleStyle: { color: colors.headerText },
        }}
      />
    </Tabs>

      {/* Floating chat bubble — only on allowed tabs */}
      {showChatBubble && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 90,
            right: 16,
            zIndex: 100,
            transform: [{ translateX: bubbleTranslateX }, { rotate: bubbleRotate }],
            opacity: bubbleOpacity,
          }}
        >
          <ChatBubble
            onPress={() => {
              if (isBubbleHidden.current) {
                showBubble();
              } else {
                setChatOpen(true); setChatActive(true); setUnreadCount(0);
              }
            }}
            hasActiveChat={chatActive && !chatOpen}
            unreadCount={!chatOpen ? unreadCount : 0}
            isChatOpen={chatOpen}
          />
        </Animated.View>
      )}

      {/* Chat bot modal */}
      <ChatBotModal
        visible={chatOpen}
        onMinimize={() => setChatOpen(false)}
        onEndChat={() => { setChatOpen(false); setChatActive(false); setUnreadCount(0); }}
        onBotMessage={() => setUnreadCount(prev => prev + 1)}
      />
    </View>
  );
}
