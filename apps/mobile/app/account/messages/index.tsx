import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useThemeColors } from '../../../hooks/useThemeColors';
import type { ThemeColors } from '../../../constants/Colors';
import { api } from '../../../services/api';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
  lastMessage?: { content: string; senderRole: string } | null;
  order?: { id: string; orderNumber: string } | null;
}

const statusLabels: Record<string, { label: string; colorKey: 'success' | 'warning' | 'muted' }> = {
  OPEN: { label: 'Otwarte', colorKey: 'success' },
  IN_PROGRESS: { label: 'W trakcie', colorKey: 'warning' },
  CLOSED: { label: 'Zamknięte', colorKey: 'muted' },
};

const categoryLabels: Record<string, string> = {
  ORDER: 'Zamówienie',
  DELIVERY: 'Dostawa',
  COMPLAINT: 'Reklamacja',
  PAYMENT: 'Płatność',
  ACCOUNT: 'Konto',
  GENERAL: 'Ogólne',
};

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }
  if (d.toDateString() === yesterday.toDateString()) return 'Wczoraj';
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TicketCard = React.memo(function TicketCard({
  ticket,
  onPress,
  colors,
}: {
  ticket: SupportTicket;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const st = statusLabels[ticket.status] || { label: ticket.status, colorKey: 'muted' as const };
  const chipBg =
    st.colorKey === 'success' ? colors.successBg : st.colorKey === 'warning' ? colors.warningBg : colors.backgroundTertiary;
  const chipText =
    st.colorKey === 'success' ? colors.successText : st.colorKey === 'warning' ? colors.warningText : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[
        tStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: ticket.unreadCount > 0 ? colors.tint : colors.border,
          borderWidth: ticket.unreadCount > 0 ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={tStyles.cardTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {ticket.unreadCount > 0 && (
            <View style={[tStyles.dot, { backgroundColor: colors.tint }]} />
          )}
          <Text style={[tStyles.ticketNumber, { color: colors.textMuted }]}>{ticket.ticketNumber}</Text>
          <View style={[tStyles.chip, { backgroundColor: chipBg }]}>
            <Text style={[tStyles.chipText, { color: chipText }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={[tStyles.dateText, { color: colors.textMuted }]}>{formatDate(ticket.lastMessageAt)}</Text>
      </View>

      <Text style={[tStyles.subject, { color: colors.text }]} numberOfLines={1}>
        {ticket.subject}
      </Text>

      {ticket.lastMessage && (
        <Text style={[tStyles.preview, { color: colors.textMuted }]} numberOfLines={1}>
          {ticket.lastMessage.senderRole === 'ADMIN' ? 'Obsługa: ' : ''}
          {ticket.lastMessage.content}
        </Text>
      )}

      <View style={tStyles.cardMeta}>
        <Text style={[tStyles.metaText, { color: colors.textMuted }]}>
          {categoryLabels[ticket.category] || ticket.category}
        </Text>
        {ticket.order && (
          <Text style={[tStyles.metaText, { color: colors.textMuted }]}>
            Zam. {ticket.order.orderNumber}
          </Text>
        )}
      </View>

      {ticket.unreadCount > 0 && (
        <View style={[tStyles.unreadBadge, { backgroundColor: colors.tint }]}>
          <Text style={[tStyles.unreadText, { color: colors.textInverse }]}>{ticket.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const tStyles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, marginBottom: 10, position: 'relative' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ticketNumber: { fontSize: 11, fontFamily: 'monospace' },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  chipText: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 11 },
  subject: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  preview: { fontSize: 13, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 11 },
  unreadBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, fontWeight: '700' },
});

// ── Filters ──

type StatusFilter = '' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Wszystkie' },
  { value: 'OPEN', label: 'Otwarte' },
  { value: 'IN_PROGRESS', label: 'W trakcie' },
  { value: 'CLOSED', label: 'Zamknięte' },
];

// ── Main Screen ──

export default function MessagesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTickets = useCallback(
    async (pageNum: number, append = false) => {
      try {
        const params: Record<string, any> = { page: pageNum, limit: 15 };
        if (statusFilter) params.status = statusFilter;
        const res = await api.get<{ tickets: SupportTicket[]; pagination: any }>('/support/tickets', params);
        const fetched = res.tickets ?? [];
        setTickets((prev) => (append ? [...prev, ...fetched] : fetched));
        setTotalPages(res.pagination?.totalPages ?? 1);
      } catch {}
    },
    [statusFilter],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setPage(1);
      await fetchTickets(1);
      setLoading(false);
    })();
  }, [fetchTickets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchTickets(1);
    setRefreshing(false);
  }, [fetchTickets]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const next = page + 1;
    await fetchTickets(next, true);
    setPage(next);
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, fetchTickets]);

  const renderItem = useCallback(
    ({ item }: { item: SupportTicket }) => (
      <TicketCard
        ticket={item}
        onPress={() => router.push(`/account/messages/${item.id}` as any)}
        colors={colors}
      />
    ),
    [router, colors],
  );

  const keyExtractor = useCallback((item: SupportTicket) => item.id, []);

  const renderHeader = useCallback(
    () => (
      <View style={s.filtersRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              s.filterChip,
              {
                backgroundColor: statusFilter === f.value ? colors.tint : colors.background,
                borderColor: statusFilter === f.value ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setStatusFilter(f.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.filterChipText,
                { color: statusFilter === f.value ? colors.textInverse : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    [statusFilter, s, colors],
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Wiadomości' }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Wiadomości',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/account/messages/new' as any)}
              style={{ marginRight: 4 }}
            >
              <FontAwesome name="plus" size={18} color={colors.tint} />
            </TouchableOpacity>
          ),
        }}
      />

      {tickets.length === 0 && !loading ? (
        <View style={s.center}>
          <FontAwesome name="envelope-o" size={56} color={colors.inputBorder} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>Brak wiadomości</Text>
          <Text style={[s.emptyHint, { color: colors.textMuted }]}>
            Nie masz jeszcze żadnych zgłoszeń
          </Text>
          <TouchableOpacity
            style={[s.newBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/account/messages/new' as any)}
          >
            <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 15 }}>Napisz do nas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={s.list}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.tint]} tintColor={colors.tint} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    list: { padding: 16, paddingBottom: 32 },
    filtersRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    filterChipText: { fontSize: 13, fontWeight: '600' },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptyHint: { fontSize: 14, textAlign: 'center', marginTop: 8 },
    newBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  });
