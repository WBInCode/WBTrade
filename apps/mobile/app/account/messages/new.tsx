import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { api } from '../../../services/api';
import { ordersApi } from '../../../services/orders';
import type { Order } from '../../../services/types';

const CATEGORIES = [
  { value: 'ORDER', label: 'Zamówienie', icon: 'shopping-bag' as const, desc: 'Pytania o zamówienie' },
  { value: 'DELIVERY', label: 'Dostawa', icon: 'truck' as const, desc: 'Problemy z dostawą' },
  { value: 'COMPLAINT', label: 'Reklamacja', icon: 'exclamation-circle' as const, desc: 'Reklamacje produktów' },
  { value: 'PAYMENT', label: 'Płatność', icon: 'credit-card' as const, desc: 'Problemy z płatnością' },
  { value: 'ACCOUNT', label: 'Konto', icon: 'user' as const, desc: 'Ustawienia konta' },
  { value: 'GENERAL', label: 'Ogólne', icon: 'commenting' as const, desc: 'Inne pytania' },
];

const ORDER_CATEGORIES = ['ORDER', 'DELIVERY', 'COMPLAINT', 'PAYMENT'];

export default function NewTicketScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [category, setCategory] = useState('GENERAL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [sending, setSending] = useState(false);
  const [showOrderPicker, setShowOrderPicker] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await ordersApi.getAll(1, 50);
        setOrders((res as any).orders ?? []);
      } catch {}
    })();
  }, []);

  const selectedOrder = orders.find((o) => o.id === orderId);

  const handleSubmit = useCallback(async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Uzupełnij dane', 'Podaj temat i treść wiadomości.');
      return;
    }
    Keyboard.dismiss();
    setSending(true);
    try {
      const body: Record<string, string> = { subject, category, message };
      if (orderId) body.orderId = orderId;
      const res = await api.post<{ id: string }>('/support/tickets', body);
      router.replace(`/account/messages/${res.id}` as any);
    } catch (err: any) {
      Alert.alert('Błąd', err.message || 'Nie udało się utworzyć zgłoszenia.');
    } finally {
      setSending(false);
    }
  }, [subject, category, message, orderId, router]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Nowe zgłoszenie' }} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Category */}
        <Text style={s.label}>Kategoria</Text>
        <View style={s.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                s.catBtn,
                {
                  borderColor: category === cat.value ? colors.tint : colors.border,
                  backgroundColor: category === cat.value ? colors.tintLight : colors.card,
                },
              ]}
              onPress={() => setCategory(cat.value)}
              activeOpacity={0.7}
            >
              <FontAwesome
                name={cat.icon}
                size={16}
                color={category === cat.value ? colors.tint : colors.textMuted}
              />
              <Text style={[s.catLabel, { color: category === cat.value ? colors.tint : colors.text }]}>
                {cat.label}
              </Text>
              <Text style={[s.catDesc, { color: colors.textMuted }]}>{cat.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subject */}
        <Text style={s.label}>Temat</Text>
        <TextInput
          style={s.input}
          placeholder="Krótki opis sprawy..."
          placeholderTextColor={colors.textMuted}
          value={subject}
          onChangeText={setSubject}
          maxLength={200}
        />

        {/* Order selector */}
        {ORDER_CATEGORIES.includes(category) && orders.length > 0 && (
          <>
            <Text style={s.label}>
              Powiązane zamówienie{' '}
              <Text style={{ color: colors.textMuted, fontWeight: '400' }}>(opcjonalnie)</Text>
            </Text>
            <TouchableOpacity
              style={s.input}
              onPress={() => setShowOrderPicker(!showOrderPicker)}
              activeOpacity={0.7}
            >
              <Text style={{ color: selectedOrder ? colors.text : colors.textMuted, fontSize: 15 }}>
                {selectedOrder ? `#${selectedOrder.orderNumber}` : 'Wybierz zamówienie...'}
              </Text>
            </TouchableOpacity>
            {showOrderPicker && (
              <View style={[s.orderList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[s.orderItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => { setOrderId(''); setShowOrderPicker(false); }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>Brak</Text>
                </TouchableOpacity>
                {orders.slice(0, 20).map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[s.orderItem, { borderBottomColor: colors.borderLight }]}
                    onPress={() => { setOrderId(o.id); setShowOrderPicker(false); }}
                  >
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                      #{o.orderNumber}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {new Date(o.createdAt).toLocaleDateString('pl-PL')} — {Number(o.total).toFixed(2)} zł
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Message */}
        <Text style={s.label}>Wiadomość</Text>
        <TextInput
          style={[s.input, { height: 140, textAlignVertical: 'top' }]}
          placeholder="Opisz szczegółowo swoją sprawę..."
          placeholderTextColor={colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={5000}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: colors.tint, opacity: sending || !subject.trim() || !message.trim() ? 0.5 : 1 }]}
          onPress={handleSubmit}
          disabled={sending || !subject.trim() || !message.trim()}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <FontAwesome name="send" size={14} color={colors.textInverse} />
              <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 15 }}>Wyślij zgłoszenie</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 18, marginBottom: 8 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catBtn: {
      width: '47%',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    catLabel: { fontSize: 14, fontWeight: '600' },
    catDesc: { fontSize: 11 },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    orderList: {
      borderWidth: 1,
      borderRadius: 10,
      marginTop: 4,
      maxHeight: 200,
    },
    orderItem: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 28,
    },
  });
