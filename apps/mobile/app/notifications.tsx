import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import type { ThemeColors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const NOTIFICATIONS_KEY = '@wbtrade_notifications';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO string
  read: boolean;
  data?: Record<string, string>;
}

export async function loadNotifications(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  const existing = await loadNotifications();
  const notification: AppNotification = {
    ...n,
    id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const updated = [notification, ...existing].slice(0, 50); // keep max 50 notifications
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  return notification;
}

export async function markAllAsRead() {
  const existing = await loadNotifications();
  const updated = existing.map((n) => ({ ...n, read: true }));
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
}

export async function clearAllNotifications() {
  await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Przed chwilą';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return 'Wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    // Load local notifications
    const localItems = await loadNotifications();

    // If logged in, also fetch from backend
    if (user) {
      try {
        const data = await api.get<{ notifications: any[]; total: number }>('/notifications?limit=50');
        const serverItems: AppNotification[] = (data.notifications || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          body: n.message || n.body || '',
          createdAt: n.createdAt,
          read: n.isRead ?? n.read ?? false,
          data: {
            ...(n.metadata || {}),
            ...(n.link ? { route: n.link } : {}),
          },
        }));

        // Merge: server notifications + local-only ones (those not from server)
        const serverIds = new Set(serverItems.map(i => i.id));
        const localOnly = localItems.filter(i => !serverIds.has(i.id));
        const merged = [...serverItems, ...localOnly]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 50);
        setNotifications(merged);
      } catch {
        // Fallback to local only
        setNotifications(localItems);
      }
    } else {
      setNotifications(localItems);
    }
  }, [user]);

  const load = useCallback(async () => {
    await fetchNotifications();
    setLoading(false);
  }, [fetchNotifications]);

  useEffect(() => {
    load();
    // Mark all as read
    markAllAsRead();
    if (user) {
      api.patch('/notifications/read-all').catch(() => {});
    }
  }, [load, user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleClearAll = useCallback(async () => {
    await clearAllNotifications();
    setNotifications([]);
  }, []);

  const handleNotificationPress = useCallback(
    (notification: AppNotification) => {
      const route = notification.data?.route;
      if (route) {
        router.push(route as any);
      }
    },
    [router]
  );

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
        <Ionicons
          name="notifications"
          size={20}
          color={item.read ? colors.textMuted : colors.tint}
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.itemTime}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Powiadomienia',
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTintColor: colors.tint,
          headerTitleStyle: { color: colors.headerText, fontWeight: '700' },
          headerRight: notifications.length > 0
            ? () => (
                <TouchableOpacity onPress={handleClearAll} style={{ paddingHorizontal: 8 }}>
                  <Text style={{ color: colors.tint, fontSize: 14 }}>Wyczyść</Text>
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {loading ? null : notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Brak powiadomień</Text>
            <Text style={styles.emptyText}>Tu pojawią się powiadomienia o Twoich zamówieniach i promocjach.</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    list: { paddingVertical: 8, paddingBottom: 32 },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemUnread: {
      backgroundColor: colors.tintLight,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapUnread: {
      backgroundColor: colors.tintLight,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    itemTitleUnread: {
      fontWeight: '700',
      color: colors.text,
    },
    itemBody: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      marginBottom: 4,
    },
    itemTime: {
      fontSize: 11,
      color: colors.textMuted,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.tint,
      marginTop: 6,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
