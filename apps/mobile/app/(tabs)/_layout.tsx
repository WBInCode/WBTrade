import React, { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { ChatBubble } from '../../components/ChatBot';
import ChatBotModal from '../../components/ChatBot';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

function CartIcon({ color }: { color: string }) {
  const { itemCount } = useCart();
  const colors = useThemeColors();

  return (
    <View>
      <FontAwesome name="shopping-cart" size={24} color={color} style={{ marginBottom: -3 }} />
      {itemCount > 0 && (
        <View
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
          }}
        >
          <Text style={{ color: colors.badgeText, fontSize: 10, fontWeight: '700' }}>
            {itemCount > 99 ? '99+' : itemCount}
          </Text>
        </View>
      )}
    </View>
  );
}

function WishlistIcon({ color }: { color: string }) {
  const { count } = useWishlist();
  const colors = useThemeColors();

  return (
    <View>
      <FontAwesome name="heart" size={22} color={color} style={{ marginBottom: -3 }} />
      {count > 0 && (
        <View
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
          }}
        >
          <Text style={{ color: colors.badgeText, fontSize: 10, fontWeight: '700' }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatActive, setChatActive] = useState(false); // true when minimized with conversation
  const [unreadCount, setUnreadCount] = useState(0);

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
        name="wishlist"
        options={{
          title: 'Ulubione',
          tabBarIcon: ({ color }) => <WishlistIcon color={color} />,
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
          headerBackTitle: 'Wróć',
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTitleStyle: { color: colors.headerText },
        }}
      />
    </Tabs>

      {/* Floating chat bubble */}
      <View
        style={{
          position: 'absolute',
          bottom: 90,
          right: 16,
          zIndex: 100,
        }}
      >
        <ChatBubble
          onPress={() => { setChatOpen(true); setChatActive(true); setUnreadCount(0); }}
          hasActiveChat={chatActive && !chatOpen}
          unreadCount={!chatOpen ? unreadCount : 0}
          isChatOpen={chatOpen}
        />
      </View>

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
