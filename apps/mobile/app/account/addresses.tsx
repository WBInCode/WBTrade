import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { addressesApi } from '../../services/addresses';
import type { Address, AddressFormData } from '../../services/types';

// ─── Empty form state ───
const EMPTY_FORM: AddressFormData = {
  firstName: '',
  lastName: '',
  street: '',
  city: '',
  postalCode: '',
  phone: '',
  country: 'PL',
  companyName: '',
  nip: '',
  label: '',
  type: 'SHIPPING',
  isDefault: false,
};

// ─── Address Card ───
const AddressCard = React.memo(({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        {address.label ? (
          <Text style={styles.cardLabel}>{address.label}</Text>
        ) : null}
        <View style={styles.badges}>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Domyślny</Text>
            </View>
          )}
          <View style={[styles.typeBadge, address.type === 'BILLING' && styles.billingBadge]}>
            <Text style={[styles.typeBadgeText, address.type === 'BILLING' && styles.billingBadgeText]}>
              {address.type === 'SHIPPING' ? 'Wysyłka' : 'Faktura'}
            </Text>
          </View>
        </View>
      </View>
    </View>

    <Text style={styles.cardName}>
      {address.firstName} {address.lastName}
    </Text>
    {address.companyName ? (
      <Text style={styles.cardCompany}>{address.companyName}</Text>
    ) : null}
    <Text style={styles.cardLine}>{address.street}</Text>
    <Text style={styles.cardLine}>
      {address.postalCode} {address.city}
    </Text>
    {address.phone ? (
      <Text style={styles.cardPhone}>
        <FontAwesome name="phone" size={12} color={Colors.secondary[400]} />{' '}
        {address.phone}
      </Text>
    ) : null}

    <View style={styles.cardActions}>
      {!address.isDefault && (
        <TouchableOpacity style={styles.actionBtn} onPress={onSetDefault}>
          <FontAwesome name="star-o" size={14} color={Colors.primary[500]} />
          <Text style={styles.actionBtnText}>Domyślny</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
        <FontAwesome name="pencil" size={14} color={Colors.primary[500]} />
        <Text style={styles.actionBtnText}>Edytuj</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
        <FontAwesome name="trash-o" size={14} color={Colors.destructive} />
        <Text style={[styles.actionBtnText, { color: Colors.destructive }]}>Usuń</Text>
      </TouchableOpacity>
    </View>
  </View>
));

// ─── Form Field ───
function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  keyboardType,
  autoCapitalize,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  error?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.fieldRequired}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.fieldInput, error ? styles.fieldInputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.secondary[300]}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Main Screen ───
export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ─── Fetch addresses ───
  const fetchAddresses = useCallback(async () => {
    try {
      setError(null);
      const data = await addressesApi.getAll();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Nie udało się pobrać adresów');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAddresses();
  }, [fetchAddresses]);

  // ─── Open form ───
  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setModalVisible(true);
  };

  const openEditForm = (address: Address) => {
    setEditingId(address.id);
    setForm({
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      phone: address.phone || '',
      country: address.country || 'PL',
      companyName: address.companyName || '',
      nip: address.nip || '',
      label: address.label || '',
      type: address.type,
      isDefault: address.isDefault,
    });
    setFormErrors({});
    setModalVisible(true);
  };

  // ─── Validate ───
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.firstName?.trim()) errors.firstName = 'Imię jest wymagane';
    if (!form.lastName?.trim()) errors.lastName = 'Nazwisko jest wymagane';
    if (!form.street?.trim()) errors.street = 'Ulica jest wymagana';
    if (!form.city?.trim()) errors.city = 'Miasto jest wymagane';
    if (!form.postalCode?.trim()) {
      errors.postalCode = 'Kod pocztowy jest wymagany';
    } else if (!/^\d{2}-?\d{3}$/.test(form.postalCode.trim())) {
      errors.postalCode = 'Format: XX-XXX';
    }
    if (form.nip && !/^\d{10}$/.test(form.nip.replace(/[^0-9]/g, ''))) {
      errors.nip = 'NIP powinien mieć 10 cyfr';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: AddressFormData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country || 'PL',
        type: form.type || 'SHIPPING',
      };
      if (form.phone?.trim()) payload.phone = form.phone.trim();
      if (form.companyName?.trim()) payload.companyName = form.companyName.trim();
      if (form.nip?.trim()) payload.nip = form.nip.replace(/[^0-9]/g, '');
      if (form.label?.trim()) payload.label = form.label.trim();
      if (form.isDefault) payload.isDefault = true;

      if (editingId) {
        await addressesApi.update(editingId, payload);
      } else {
        await addressesApi.create(payload);
      }
      setModalVisible(false);
      fetchAddresses();
    } catch (err: any) {
      Alert.alert('Błąd', err.message || 'Nie udało się zapisać adresu');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───
  const handleDelete = (address: Address) => {
    Alert.alert(
      'Usuń adres',
      `Czy na pewno chcesz usunąć adres?\n\n${address.firstName} ${address.lastName}\n${address.street}\n${address.postalCode} ${address.city}`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await addressesApi.delete(address.id);
              fetchAddresses();
            } catch (err: any) {
              Alert.alert('Błąd', err.message || 'Nie udało się usunąć adresu');
            }
          },
        },
      ],
    );
  };

  // ─── Set default ───
  const handleSetDefault = async (address: Address) => {
    try {
      await addressesApi.setDefault(address.id);
      fetchAddresses();
    } catch (err: any) {
      Alert.alert('Błąd', err.message || 'Nie udało się ustawić jako domyślny');
    }
  };

  // ─── Update form field helper ───
  const updateField = (field: keyof AddressFormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ─── Render item ───
  const renderItem = useCallback(({ item }: { item: Address }) => (
    <AddressCard
      address={item}
      onEdit={() => openEditForm(item)}
      onDelete={() => handleDelete(item)}
      onSetDefault={() => handleSetDefault(item)}
    />
  ), []);

  // ─── Loading state ───
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Moje adresy', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ───
  if (error && addresses.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Moje adresy', headerShown: true }} />
        <View style={styles.center}>
          <FontAwesome name="exclamation-circle" size={48} color={Colors.secondary[300]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAddresses}>
            <Text style={styles.retryBtnText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Moje adresy', headerShown: true }} />

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          addresses.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <FontAwesome name="map-marker" size={48} color={Colors.secondary[300]} />
            <Text style={styles.emptyTitle}>Brak zapisanych adresów</Text>
            <Text style={styles.emptySubtitle}>
              Dodaj adres, aby przyspieszyć składanie zamówień
            </Text>
          </View>
        }
      />

      {/* FAB — Add address */}
      <TouchableOpacity style={styles.fab} onPress={openAddForm} activeOpacity={0.8}>
        <FontAwesome name="plus" size={22} color={Colors.white} />
      </TouchableOpacity>

      {/* ─── Add / Edit Modal ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Anuluj</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edytuj adres' : 'Nowy adres'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={Colors.primary[500]} />
              ) : (
                <Text style={styles.modalSave}>Zapisz</Text>
              )}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Type selector */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeBtn, form.type === 'SHIPPING' && styles.typeBtnActive]}
                  onPress={() => updateField('type', 'SHIPPING')}
                >
                  <FontAwesome
                    name="truck"
                    size={14}
                    color={form.type === 'SHIPPING' ? Colors.white : Colors.secondary[500]}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      form.type === 'SHIPPING' && styles.typeBtnTextActive,
                    ]}
                  >
                    Wysyłka
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, form.type === 'BILLING' && styles.typeBtnActive]}
                  onPress={() => updateField('type', 'BILLING')}
                >
                  <FontAwesome
                    name="file-text-o"
                    size={14}
                    color={form.type === 'BILLING' ? Colors.white : Colors.secondary[500]}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      form.type === 'BILLING' && styles.typeBtnTextActive,
                    ]}
                  >
                    Faktura
                  </Text>
                </TouchableOpacity>
              </View>

              <FormField
                label="Etykieta"
                value={form.label || ''}
                onChangeText={(t) => updateField('label', t)}
                placeholder="np. Dom, Praca"
                autoCapitalize="sentences"
              />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <FormField
                    label="Imię"
                    value={form.firstName}
                    onChangeText={(t) => updateField('firstName', t)}
                    required
                    error={formErrors.firstName}
                  />
                </View>
                <View style={styles.halfField}>
                  <FormField
                    label="Nazwisko"
                    value={form.lastName}
                    onChangeText={(t) => updateField('lastName', t)}
                    required
                    error={formErrors.lastName}
                  />
                </View>
              </View>

              {form.type === 'BILLING' && (
                <>
                  <FormField
                    label="Nazwa firmy"
                    value={form.companyName || ''}
                    onChangeText={(t) => updateField('companyName', t)}
                    placeholder="Opcjonalne"
                    autoCapitalize="words"
                  />
                  <FormField
                    label="NIP"
                    value={form.nip || ''}
                    onChangeText={(t) => updateField('nip', t)}
                    placeholder="Opcjonalne"
                    keyboardType="numeric"
                    error={formErrors.nip}
                  />
                </>
              )}

              <FormField
                label="Ulica i numer"
                value={form.street}
                onChangeText={(t) => updateField('street', t)}
                placeholder="ul. Przykładowa 1/2"
                required
                error={formErrors.street}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormField
                    label="Kod pocztowy"
                    value={form.postalCode}
                    onChangeText={(t) => updateField('postalCode', t)}
                    placeholder="00-000"
                    required
                    keyboardType="numeric"
                    error={formErrors.postalCode}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <FormField
                    label="Miasto"
                    value={form.city}
                    onChangeText={(t) => updateField('city', t)}
                    required
                    error={formErrors.city}
                  />
                </View>
              </View>

              <FormField
                label="Telefon"
                value={form.phone || ''}
                onChangeText={(t) => updateField('phone', t)}
                placeholder="+48 123 456 789"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              {/* Default toggle */}
              <TouchableOpacity
                style={styles.defaultToggle}
                onPress={() => updateField('isDefault', !form.isDefault)}
              >
                <FontAwesome
                  name={form.isDefault ? 'check-square' : 'square-o'}
                  size={20}
                  color={form.isDefault ? Colors.primary[500] : Colors.secondary[400]}
                />
                <Text style={styles.defaultToggleText}>Ustaw jako domyślny adres</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.secondary[400],
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
  },
  retryBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── Card ───
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'column',
    gap: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  defaultBadge: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  typeBadge: {
    backgroundColor: Colors.secondary[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  billingBadge: {
    backgroundColor: '#ede9fe',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.secondary[600],
  },
  billingBadgeText: {
    color: '#7c3aed',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginBottom: 2,
  },
  cardCompany: {
    fontSize: 14,
    color: Colors.secondary[600],
    marginBottom: 2,
  },
  cardLine: {
    fontSize: 14,
    color: Colors.secondary[600],
    lineHeight: 20,
  },
  cardPhone: {
    fontSize: 13,
    color: Colors.secondary[400],
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary[500],
  },

  // ─── FAB ───
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },

  // ─── Modal ───
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancel: {
    fontSize: 15,
    color: Colors.secondary[500],
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.secondary[900],
  },
  modalSave: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary[500],
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // ─── Type selector ───
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  typeBtnActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[500],
  },
  typeBtnTextActive: {
    color: Colors.white,
  },

  // ─── Form fields ───
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.secondary[700],
    marginBottom: 6,
  },
  fieldRequired: {
    color: Colors.destructive,
  },
  fieldInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.secondary[900],
  },
  fieldInputError: {
    borderColor: Colors.destructive,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.destructive,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfField: {
    flex: 1,
  },

  // ─── Default toggle ───
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 8,
  },
  defaultToggleText: {
    fontSize: 14,
    color: Colors.secondary[700],
  },
});
