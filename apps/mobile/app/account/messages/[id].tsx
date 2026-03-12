import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { api } from '../../../services/api';

interface SupportMessage {
  id: string;
  senderRole: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  content: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  messages: SupportMessage[];
  order?: { id: string; orderNumber: string } | null;
}

const statusLabels: Record<string, string> = {
  OPEN: 'Otwarte',
  IN_PROGRESS: 'W trakcie',
  CLOSED: 'Zamknięte',
};

const categoryLabels: Record<string, string> = {
  ORDER: 'Zamówienie',
  DELIVERY: 'Dostawa',
  COMPLAINT: 'Reklamacja',
  PAYMENT: 'Płatność',
  ACCOUNT: 'Konto',
  GENERAL: 'Ogólne',
};

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDaySeparator(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Dziś';
  if (d.toDateString() === yesterday.toDateString()) return 'Wczoraj';
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<TicketDetail>(`/support/tickets/${id}`);
      setTicket(res);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Auto-polling every 8 seconds for live chat
  useEffect(() => {
    const interval = setInterval(loadTicket, 8000);
    return () => clearInterval(interval);
  }, [loadTicket]);

  // Scroll to bottom when new messages arrive
  const prevCountRef = useRef(0);
  useEffect(() => {
    const count = ticket?.messages?.length || 0;
    if (count > prevCountRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: count > prevCountRef.current + 1 ? false : true }), 100);
    }
    prevCountRef.current = count;
  }, [ticket?.messages?.length]);

  const handleSend = useCallback(async () => {
    if (!replyText.trim() || sending || !id) return;
    setSending(true);
    try {
      await api.post(`/support/tickets/${id}/messages`, { content: replyText.trim() });
      setReplyText('');
      await loadTicket();
    } catch {}
    setSending(false);
  }, [replyText, sending, id, loadTicket]);

  // Build display data: messages grouped with day separators
  const displayData = useMemo(() => {
    if (!ticket?.messages) return [];
    const items: Array<{ type: 'day'; date: string } | { type: 'msg'; msg: SupportMessage }> = [];
    let lastDay = '';
    for (const msg of ticket.messages) {
      const day = new Date(msg.createdAt).toDateString();
      if (day !== lastDay) {
        items.push({ type: 'day', date: msg.createdAt });
        lastDay = day;
      }
      items.push({ type: 'msg', msg });
    }
    return items;
  }, [ticket?.messages]);

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Wiadomość' }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Wiadomość' }} />
        <View style={s.center}>
          <Text style={{ color: colors.text, fontSize: 16 }}>Nie znaleziono zgłoszenia</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Stack.Screen options={{ title: ticket.subject }} />

      {/* Ticket info header */}
      <View style={[s.infoBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={[s.infoTicketNum, { color: colors.textMuted }]}>{ticket.ticketNumber}</Text>
          <View style={[s.miniChip, { backgroundColor: colors.tintLight }]}>
            <Text style={[s.miniChipText, { color: colors.tint }]}>
              {statusLabels[ticket.status] || ticket.status}
            </Text>
          </View>
          <Text style={[s.infoCat, { color: colors.textMuted }]}>
            {categoryLabels[ticket.category] || ticket.category}
          </Text>
          {ticket.order && (
            <Text style={[s.infoCat, { color: colors.tint }]}>Zam. {ticket.order.orderNumber}</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={displayData}
          keyExtractor={(item, idx) => (item.type === 'day' ? `day-${idx}` : `msg-${(item as any).msg.id}`)}
          renderItem={({ item }) => {
            if (item.type === 'day') {
              return (
                <View style={s.daySeparator}>
                  <View style={[s.dayLine, { backgroundColor: colors.border }]} />
                  <Text style={[s.dayText, { color: colors.textMuted }]}>{formatDaySeparator(item.date)}</Text>
                  <View style={[s.dayLine, { backgroundColor: colors.border }]} />
                </View>
              );
            }

            const msg = item.msg;
            if (msg.senderRole === 'SYSTEM') {
              return (
                <View style={s.systemRow}>
                  <View style={[s.systemBubble, { backgroundColor: colors.backgroundTertiary }]}>
                    <Text style={[s.systemText, { color: colors.textMuted }]}>{msg.content}</Text>
                    <Text style={[s.systemTime, { color: colors.textMuted }]}>{formatTime(msg.createdAt)}</Text>
                  </View>
                </View>
              );
            }

            const isCustomer = msg.senderRole === 'CUSTOMER';
            return (
              <View style={[s.msgRow, isCustomer ? s.msgRowRight : s.msgRowLeft]}>
                <View>
                  <View style={[s.senderRow, isCustomer && { justifyContent: 'flex-end' }]}>
                    <Text style={[s.senderLabel, { color: isCustomer ? colors.tint : colors.success }]}>
                      {isCustomer ? 'Ty' : 'Obsługa'}
                    </Text>
                    <Text style={[s.timeLabel, { color: colors.textMuted }]}>{formatTime(msg.createdAt)}</Text>
                  </View>
                  <View
                    style={[
                      s.bubble,
                      isCustomer
                        ? { backgroundColor: colors.tint, borderBottomRightRadius: 4 }
                        : { backgroundColor: colors.backgroundTertiary, borderBottomLeftRadius: 4 },
                    ]}
                  >
                    <Text style={[s.bubbleText, { color: isCustomer ? colors.textInverse : colors.text }]}>
                      {msg.content}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          contentContainerStyle={s.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Reply input */}
        {ticket.status !== 'CLOSED' ? (
          <View style={[s.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TextInput
              style={[s.replyInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Napisz wiadomość..."
              placeholderTextColor={colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={5000}
            />
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: colors.tint, opacity: !replyText.trim() || sending ? 0.5 : 1 }]}
              onPress={handleSend}
              disabled={!replyText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <FontAwesome name="send" size={16} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.closedBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
              To zgłoszenie zostało zamknięte.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    infoBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
    infoTicketNum: { fontSize: 11, fontFamily: 'monospace' },
    miniChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    miniChipText: { fontSize: 11, fontWeight: '600' },
    infoCat: { fontSize: 11 },

    messagesList: { padding: 16, paddingBottom: 8 },

    daySeparator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
    dayLine: { flex: 1, height: StyleSheet.hairlineWidth },
    dayText: { fontSize: 11, textTransform: 'uppercase' },

    systemRow: { alignItems: 'center', marginVertical: 6 },
    systemBubble: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', gap: 8 },
    systemText: { fontSize: 12, fontStyle: 'italic' },
    systemTime: { fontSize: 10 },

    msgRow: { marginVertical: 4, maxWidth: '80%' },
    msgRowRight: { alignSelf: 'flex-end' },
    msgRowLeft: { alignSelf: 'flex-start' },
    senderRow: { flexDirection: 'row', gap: 6, marginBottom: 3 },
    senderLabel: { fontSize: 11, fontWeight: '600' },
    timeLabel: { fontSize: 10 },
    bubble: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleText: { fontSize: 14, lineHeight: 20 },

    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1 },
    replyInput: {
      flex: 1,
      maxHeight: 100,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },

    closedBar: { padding: 16, borderTopWidth: 1 },
  });
