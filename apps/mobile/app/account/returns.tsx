import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

type Step = 'type' | 'order' | 'items' | 'form' | 'success';
type RequestType = 'RETURN' | 'COMPLAINT';

interface OrderItem {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

interface SelectedItem {
  orderItemId: string;
  quantity: number;
  maxQuantity: number;
  productName: string;
  image?: string;
}

export default function ReturnsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('type');
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [reason, setReason] = useState('');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ returnNumber: string } | null>(null);

  // Step 1: Choose type
  const handleTypeSelect = (type: RequestType) => {
    setRequestType(type);
    setStep('order');
  };

  // Step 2: Check eligibility
  const handleCheckOrder = async () => {
    if (!orderNumber.trim()) {
      Alert.alert('Błąd', 'Podaj numer zamówienia');
      return;
    }
    if (!requestType) return;

    setLoading(true);
    try {
      const endpoint = requestType === 'RETURN'
        ? `/contact/return-eligibility/${orderNumber.trim()}`
        : `/contact/complaint-eligibility/${orderNumber.trim()}`;
      await api.get(endpoint);

      // Fetch order items
      try {
        const data = await api.get<OrderItem[]>(`/contact/order-items/${orderNumber.trim()}`);
        const items = Array.isArray(data) ? data : [];
        if (items.length > 0) {
          setOrderItems(items);
          setSelectedItems(items.map(item => ({
            orderItemId: item.id,
            quantity: item.quantity,
            maxQuantity: item.quantity,
            productName: item.productName,
            image: item.image,
          })));
          setStep('items');
        } else {
          setStep('form');
        }
      } catch {
        setStep('form');
      }
    } catch (err: any) {
      const msg = err.message || 'Zamówienie nie kwalifikuje się do zwrotu/reklamacji';
      Alert.alert('Nie można kontynuować', msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Toggle item
  const toggleItem = (orderItemId: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.orderItemId === orderItemId);
      if (exists) {
        return prev.filter(i => i.orderItemId !== orderItemId);
      } else {
        const item = orderItems.find(i => i.id === orderItemId);
        if (!item) return prev;
        return [...prev, {
          orderItemId: item.id,
          quantity: item.quantity,
          maxQuantity: item.quantity,
          productName: item.productName,
          image: item.image,
        }];
      }
    });
  };

  const updateItemQuantity = (orderItemId: string, delta: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.orderItemId === orderItemId) {
        const newQty = Math.max(1, Math.min(item.maxQuantity, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Step 4: Submit
  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      Alert.alert('Błąd', 'Opis musi zawierać minimum 10 znaków');
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Błąd', 'Podaj imię, nazwisko i adres e-mail');
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        type: requestType,
        orderNumber: orderNumber.trim(),
        reason: reason.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      };
      if (selectedItems.length > 0) {
        body.items = selectedItems.map(i => ({
          orderItemId: i.orderItemId,
          quantity: i.quantity,
        }));
      }
      const data = await api.post<{ returnNumber: string }>('/contact/return-request', body);
      setResult(data);
      setStep('success');
    } catch (err: any) {
      Alert.alert('Błąd', err.message || 'Nie udało się złożyć zgłoszenia');
    } finally {
      setLoading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setStep('type');
    setRequestType(null);
    setOrderNumber('');
    setOrderItems([]);
    setSelectedItems([]);
    setReason('');
    setResult(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Zwroty i reklamacje', headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Progress indicator */}
        <View style={styles.progressRow}>
          {['type', 'order', 'items', 'form', 'success'].map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                (step === s) && styles.progressDotActive,
                (['type', 'order', 'items', 'form', 'success'].indexOf(step) > i) && styles.progressDotDone,
              ]}
            />
          ))}
        </View>

        {/* STEP 1: Type */}
        {step === 'type' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Co chcesz zgłosić?</Text>
            <Text style={styles.stepSubtitle}>Wybierz rodzaj zgłoszenia</Text>

            <TouchableOpacity
              style={styles.typeCard}
              onPress={() => handleTypeSelect('RETURN')}
              activeOpacity={0.7}
            >
              <View style={[styles.typeIcon, { backgroundColor: '#dcfce7' }]}>
                <FontAwesome name="undo" size={24} color="#16a34a" />
              </View>
              <View style={styles.typeContent}>
                <Text style={styles.typeTitle}>Zwrot towaru</Text>
                <Text style={styles.typeDesc}>Masz 14 dni na zwrot produktu bez podania przyczyny</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeCard}
              onPress={() => handleTypeSelect('COMPLAINT')}
              activeOpacity={0.7}
            >
              <View style={[styles.typeIcon, { backgroundColor: '#fef3c7' }]}>
                <FontAwesome name="exclamation-circle" size={24} color="#d97706" />
              </View>
              <View style={styles.typeContent}>
                <Text style={styles.typeTitle}>Reklamacja</Text>
                <Text style={styles.typeDesc}>Produkt jest uszkodzony lub niezgodny z opisem</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Order number */}
        {step === 'order' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Numer zamówienia</Text>
            <Text style={styles.stepSubtitle}>
              Podaj numer zamówienia, którego dotyczy {requestType === 'RETURN' ? 'zwrot' : 'reklamacja'}
            </Text>

            <TextInput
              style={styles.input}
              value={orderNumber}
              onChangeText={setOrderNumber}
              placeholder="np. WB-12345"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleCheckOrder}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleCheckOrder}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Sprawdź zamówienie</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => setStep('type')}>
              <FontAwesome name="arrow-left" size={12} color={colors.tint} />
              <Text style={styles.backLinkText}>Wróć</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Select items */}
        {step === 'items' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Wybierz produkty</Text>
            <Text style={styles.stepSubtitle}>Zaznacz produkty do {requestType === 'RETURN' ? 'zwrotu' : 'reklamacji'}</Text>

            {orderItems.map((item) => {
              const selected = selectedItems.find(s => s.orderItemId === item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, selected && styles.itemCardSelected]}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemCheckbox}>
                    <FontAwesome
                      name={selected ? 'check-square' : 'square-o'}
                      size={22}
                      color={selected ? colors.tint : colors.textMuted}
                    />
                  </View>
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.itemImage} contentFit="cover" />
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                    {item.variantName && <Text style={styles.itemVariant}>{item.variantName}</Text>}
                    <Text style={styles.itemPrice}>{item.unitPrice.toFixed(2).replace('.', ',')} zł × {item.quantity}</Text>
                  </View>
                  {selected && (
                    <View style={styles.quantityStepper}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateItemQuantity(item.id, -1)}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{selected.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateItemQuantity(item.id, 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <Text style={styles.selectedCount}>
              Wybrano: {selectedItems.length} {selectedItems.length === 1 ? 'produkt' : 'produktów'}
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, selectedItems.length === 0 && styles.buttonDisabled]}
              onPress={() => setStep('form')}
              disabled={selectedItems.length === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Dalej</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => setStep('order')}>
              <FontAwesome name="arrow-left" size={12} color={colors.tint} />
              <Text style={styles.backLinkText}>Wróć</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: Form */}
        {step === 'form' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Szczegóły zgłoszenia</Text>
            <Text style={styles.stepSubtitle}>Opisz problem i podaj dane kontaktowe</Text>

            <Text style={styles.fieldLabel}>Opis / powód *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={reason}
              onChangeText={setReason}
              placeholder={requestType === 'RETURN' ? 'Powód zwrotu...' : 'Opisz problem z produktem...'}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>Imię *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Imię"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Nazwisko *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Nazwisko"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>E-mail *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="twoj@email.pl"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+48 ..."
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Wyślij zgłoszenie</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => orderItems.length > 0 ? setStep('items') : setStep('order')}>
              <FontAwesome name="arrow-left" size={12} color={colors.tint} />
              <Text style={styles.backLinkText}>Wróć</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 5: Success */}
        {step === 'success' && result && (
          <View style={styles.stepContainer}>
            <View style={styles.successIcon}>
              <FontAwesome name="check-circle" size={64} color="#16a34a" />
            </View>
            <Text style={styles.successTitle}>Zgłoszenie przyjęte!</Text>
            <Text style={styles.successSubtitle}>Twój numer zgłoszenia:</Text>

            <View style={styles.returnNumberCard}>
              <Text style={styles.returnNumber}>{result.returnNumber}</Text>
            </View>

            <View style={styles.warningCard}>
              <FontAwesome name="exclamation-triangle" size={16} color="#b45309" />
              <Text style={styles.warningText}>
                Wpisz numer zgłoszenia NA ZEWNĄTRZ paczki zwrotnej. Bez numeru paczka nie zostanie przetworzona.
              </Text>
            </View>

            <View style={styles.addressCard}>
              <Text style={styles.addressTitle}>Adres do wysyłki zwrotu:</Text>
              <Text style={styles.addressText}>WB Partners Sp. z o.o.</Text>
              <Text style={styles.addressText}>ul. Słowackiego 24/11</Text>
              <Text style={styles.addressText}>35-060 Rzeszów</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.tint,
    width: 24,
    borderRadius: 5,
  },
  progressDotDone: {
    backgroundColor: '#16a34a',
  },

  // Step
  stepContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },

  // Type cards
  typeCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  typeIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  typeDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // Input
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: {
    minHeight: 100,
    paddingTop: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Button
  primaryButton: {
    backgroundColor: colors.tint,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.tint,
    fontWeight: '600',
  },

  // Items
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemCardSelected: {
    borderColor: colors.tint,
    backgroundColor: colors.tintLight,
  },
  itemCheckbox: {
    width: 28,
    alignItems: 'center',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  itemVariant: {
    fontSize: 12,
    color: colors.textMuted,
  },
  itemPrice: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  selectedCount: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Success
  successIcon: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  returnNumberCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  returnNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 1,
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 19,
    flex: 1,
  },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
