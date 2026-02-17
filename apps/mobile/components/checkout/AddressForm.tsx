import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import type { AddressData } from '../../hooks/useCheckout';
import Button from '../ui/Button';

// ──── Country list with dial codes ────

const countries = [
  { code: 'PL', name: 'Polska', dialCode: '+48', flag: '🇵🇱' },
  { code: 'DE', name: 'Niemcy', dialCode: '+49', flag: '🇩🇪' },
  { code: 'CZ', name: 'Czechy', dialCode: '+420', flag: '🇨🇿' },
  { code: 'SK', name: 'Słowacja', dialCode: '+421', flag: '🇸🇰' },
  { code: 'UA', name: 'Ukraina', dialCode: '+380', flag: '🇺🇦' },
  { code: 'LT', name: 'Litwa', dialCode: '+370', flag: '🇱🇹' },
  { code: 'GB', name: 'Wielka Brytania', dialCode: '+44', flag: '🇬🇧' },
  { code: 'FR', name: 'Francja', dialCode: '+33', flag: '🇫🇷' },
  { code: 'NL', name: 'Holandia', dialCode: '+31', flag: '🇳🇱' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgia', dialCode: '+32', flag: '🇧🇪' },
  { code: 'IT', name: 'Włochy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Hiszpania', dialCode: '+34', flag: '🇪🇸' },
  { code: 'SE', name: 'Szwecja', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norwegia', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Dania', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finlandia', dialCode: '+358', flag: '🇫🇮' },
  { code: 'CH', name: 'Szwajcaria', dialCode: '+41', flag: '🇨🇭' },
];

// ──── Types ────

interface SavedAddress {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  apartment?: string;
  postalCode: string;
  city: string;
  country: string;
  isDefault?: boolean;
}

interface AddressFormProps {
  initialData: AddressData;
  savedAddresses: SavedAddress[];
  loadingAddresses: boolean;
  onSubmit: (data: AddressData) => void;
  guestEmail?: string;
}

// ──── Postal code auto-format (XX-XXX) ────

const formatPostalCode = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 5);
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return digits;
};

// ──── Validation ────

const validateName = (name: string): string | null => {
  if (!name.trim()) return 'Pole wymagane';
  if (name.trim().length < 2) return 'Minimum 2 znaki';
  if (name.trim().length > 50) return 'Maksymalnie 50 znaków';
  return null;
};

const validatePhone = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'Podaj numer telefonu';
  if (digits.length < 9) return 'Numer musi mieć min. 9 cyfr';
  if (digits.length > 12) return 'Numer max 12 cyfr';
  return null;
};

export default function AddressForm({
  initialData,
  savedAddresses,
  loadingAddresses,
  onSubmit,
  guestEmail,
}: AddressFormProps) {
  const { isAuthenticated, user } = useAuth();

  const [form, setForm] = useState<AddressData>({
    ...initialData,
    email: guestEmail || initialData.email || user?.email || '',
    firstName: initialData.firstName || user?.firstName || '',
    lastName: initialData.lastName || user?.lastName || '',
    phone: initialData.phone || user?.phone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Country selector for phone
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const phone = initialData.phone || user?.phone || '';
    return phone.replace(/^\+\d+\s*/, '');
  });

  // Auto-fill from default saved address
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
      if (defaultAddr) {
        selectAddress(defaultAddr);
      }
    }
  }, [savedAddresses]);

  const selectAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setForm(prev => ({
      ...prev,
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone || prev.phone,
      street: addr.street,
      apartment: addr.apartment || '',
      postalCode: addr.postalCode,
      city: addr.city,
      country: addr.country || 'PL',
    }));
    // Also update phone number display
    if (addr.phone) {
      setPhoneNumber(addr.phone.replace(/^\+\d+\s*/, ''));
    }
    setErrors({});
  };

  const updateField = (key: keyof AddressData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handlePostalCodeChange = (text: string) => {
    const formatted = formatPostalCode(text);
    updateField('postalCode', formatted);
  };

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text);
    const fullPhone = `${selectedCountry.dialCode} ${text}`;
    updateField('phone', fullPhone);
  };

  const handleBillingPostalCodeChange = (text: string) => {
    const formatted = formatPostalCode(text);
    updateField('billingPostalCode', formatted);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const firstNameErr = validateName(form.firstName);
    if (firstNameErr) newErrors.firstName = firstNameErr;

    const lastNameErr = validateName(form.lastName);
    if (lastNameErr) newErrors.lastName = lastNameErr;

    if (!form.email.trim()) newErrors.email = 'Podaj email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Nieprawidłowy email';

    const phoneErr = validatePhone(phoneNumber);
    if (phoneErr) newErrors.phone = phoneErr;

    if (!form.street.trim()) newErrors.street = 'Podaj ulicę i numer';
    if (!form.postalCode.trim()) newErrors.postalCode = 'Podaj kod pocztowy';
    else if (!/^\d{2}-\d{3}$/.test(form.postalCode)) newErrors.postalCode = 'Format: XX-XXX';
    if (!form.city.trim()) newErrors.city = 'Podaj miasto';

    if (form.wantInvoice) {
      if (!form.billingCompanyName.trim()) newErrors.billingCompanyName = 'Podaj nazwę firmy';
      if (!form.billingNip.trim()) newErrors.billingNip = 'Podaj NIP';
      else if (form.billingNip.replace(/\D/g, '').length !== 10) newErrors.billingNip = 'NIP musi mieć 10 cyfr';
      if (!form.billingStreet.trim()) newErrors.billingStreet = 'Podaj adres firmy';
      if (!form.billingCity.trim()) newErrors.billingCity = 'Podaj miasto firmy';
      if (!form.billingPostalCode.trim()) newErrors.billingPostalCode = 'Podaj kod pocztowy firmy';
      else if (!/^\d{2}-\d{3}$/.test(form.billingPostalCode)) newErrors.billingPostalCode = 'Format: XX-XXX';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    // Set full phone with country code before validation
    const fullPhone = `${selectedCountry.dialCode} ${phoneNumber}`;
    form.phone = fullPhone;
    if (validate()) {
      onSubmit(form);
    }
  };

  const renderField = (
    label: string,
    key: keyof AddressData,
    opts?: {
      placeholder?: string;
      keyboardType?: any;
      autoCapitalize?: any;
      required?: boolean;
      onChangeText?: (text: string) => void;
      maxLength?: number;
    }
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}
        {opts?.required !== false && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, errors[key] ? styles.inputError : null]}
        value={String(form[key] || '')}
        onChangeText={opts?.onChangeText || (text => updateField(key, text))}
        placeholder={opts?.placeholder || label}
        placeholderTextColor="#9CA3AF"
        keyboardType={opts?.keyboardType || 'default'}
        autoCapitalize={opts?.autoCapitalize || 'sentences'}
        maxLength={opts?.maxLength}
      />
      {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Adres dostawy</Text>
        <Text style={styles.headerDesc}>Podaj dane do wysyłki zamówienia</Text>
      </View>

      {/* Saved addresses */}
      {loadingAddresses ? (
        <ActivityIndicator size="small" color="#F97316" style={{ marginVertical: 12 }} />
      ) : savedAddresses.length > 0 ? (
        <View style={styles.savedSection}>
          <Text style={styles.sectionTitle}>Zapisane adresy</Text>
          {savedAddresses.map(addr => (
            <TouchableOpacity
              key={addr.id}
              style={[
                styles.savedCard,
                selectedAddressId === addr.id && styles.savedCardSelected,
              ]}
              onPress={() => selectAddress(addr)}
            >
              <View style={styles.savedRadio}>
                <View
                  style={[
                    styles.radioOuter,
                    selectedAddressId === addr.id && styles.radioOuterSelected,
                  ]}
                >
                  {selectedAddressId === addr.id && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.savedInfo}>
                <Text style={styles.savedName}>
                  {addr.firstName} {addr.lastName}
                  {addr.isDefault ? ' (domyślny)' : ''}
                </Text>
                <Text style={styles.savedAddr}>
                  {addr.street}{addr.apartment ? ` ${addr.apartment}` : ''}, {addr.postalCode} {addr.city}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.savedCard, !selectedAddressId && styles.savedCardSelected]}
            onPress={() => {
              setSelectedAddressId(null);
              setForm(prev => ({
                ...prev,
                street: '',
                apartment: '',
                postalCode: '',
                city: '',
              }));
            }}
          >
            <View style={styles.savedRadio}>
              <View style={[styles.radioOuter, !selectedAddressId && styles.radioOuterSelected]}>
                {!selectedAddressId && <View style={styles.radioInner} />}
              </View>
            </View>
            <Text style={styles.savedName}>+ Nowy adres</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Personal data */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Dane osobowe</Text>
        <View style={styles.row}>
          <View style={styles.halfField}>{renderField('Imię', 'firstName', { maxLength: 50 })}</View>
          <View style={styles.halfField}>{renderField('Nazwisko', 'lastName', { maxLength: 50 })}</View>
        </View>
        {renderField('Email', 'email', { keyboardType: 'email-address', autoCapitalize: 'none' })}

        {/* Phone with country selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Telefon <Text style={styles.required}>*</Text></Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={styles.countryButton}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryDial}>{selectedCountry.dialCode}</Text>
              <Ionicons name="chevron-down" size={14} color={Colors.secondary[500]} />
            </TouchableOpacity>
            <TextInput
              style={[styles.phoneInput, errors.phone ? styles.inputError : null]}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder="123 456 789"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>
      </View>

      {/* Address */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Adres dostawy</Text>
        {renderField('Ulica i numer', 'street')}
        {renderField('Numer lokalu', 'apartment', { placeholder: 'Opcjonalnie', required: false })}
        <View style={styles.row}>
          <View style={[styles.halfField, { flex: 0.4 }]}>
            {renderField('Kod pocztowy', 'postalCode', {
              keyboardType: 'numeric',
              placeholder: 'XX-XXX',
              onChangeText: handlePostalCodeChange,
              maxLength: 6,
            })}
          </View>
          <View style={[styles.halfField, { flex: 0.6 }]}>
            {renderField('Miasto', 'city')}
          </View>
        </View>
      </View>

      {/* Invoice */}
      <View style={styles.invoiceSection}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Chcę fakturę VAT</Text>
          <Switch
            value={form.wantInvoice}
            onValueChange={v => updateField('wantInvoice', v)}
            trackColor={{ false: '#D1D5DB', true: '#FDBA74' }}
            thumbColor={form.wantInvoice ? '#F97316' : '#f4f4f5'}
          />
        </View>

        {form.wantInvoice && (
          <View style={styles.invoiceFields}>
            {renderField('Nazwa firmy', 'billingCompanyName')}
            {renderField('NIP', 'billingNip', { keyboardType: 'numeric', maxLength: 13 })}
            {renderField('Ulica i numer firmy', 'billingStreet')}
            <View style={styles.row}>
              <View style={[styles.halfField, { flex: 0.4 }]}>
                {renderField('Kod pocztowy', 'billingPostalCode', {
                  keyboardType: 'numeric',
                  placeholder: 'XX-XXX',
                  onChangeText: handleBillingPostalCodeChange,
                  maxLength: 6,
                })}
              </View>
              <View style={[styles.halfField, { flex: 0.6 }]}>
                {renderField('Miasto', 'billingCity')}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Save address toggle */}
      {isAuthenticated && !selectedAddressId && (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Zapisz adres na przyszłość</Text>
          <Switch
            value={form.saveAddress}
            onValueChange={v => updateField('saveAddress', v)}
            trackColor={{ false: '#D1D5DB', true: '#FDBA74' }}
            thumbColor={form.saveAddress ? '#F97316' : '#f4f4f5'}
          />
        </View>
      )}

      <View style={styles.submitSection}>
        <Button title="Dalej — wybierz dostawę →" onPress={handleSubmit} size="lg" fullWidth />
      </View>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz kraj</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.secondary[700]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countries}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryRow,
                    item.code === selectedCountry.code && styles.countryRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                    handlePhoneChange(phoneNumber);
                  }}
                >
                  <Text style={styles.countryRowFlag}>{item.flag}</Text>
                  <Text style={styles.countryRowName}>{item.name}</Text>
                  <Text style={styles.countryRowDial}>{item.dialCode}</Text>
                  {item.code === selectedCountry.code && (
                    <Ionicons name="checkmark" size={18} color="#F97316" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ──── Styles ────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  // Header
  headerSection: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.secondary[900] },
  headerDesc: { fontSize: 13, color: Colors.secondary[500], marginTop: 4 },

  // Saved addresses
  savedSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 10,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 8,
  },
  savedCardSelected: {
    borderColor: '#FB923C',
    backgroundColor: '#FFF7ED',
  },
  savedRadio: { marginRight: 12 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: '#F97316', backgroundColor: '#F97316' },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  savedInfo: { flex: 1 },
  savedName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  savedAddr: {
    fontSize: 13,
    color: Colors.secondary[500],
    marginTop: 2,
  },

  // Form
  formSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 0.5 },
  fieldGroup: { marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.secondary[700],
    marginBottom: 4,
  },
  required: { color: '#EF4444' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.secondary[900],
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 3,
  },

  // Phone with country selector
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  countryFlag: { fontSize: 18 },
  countryDial: { fontSize: 13, color: Colors.secondary[700], fontWeight: '500' },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.secondary[900],
    backgroundColor: '#fff',
  },

  // Invoice
  invoiceSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  invoiceFields: { marginTop: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[800],
  },

  // Submit
  submitSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },

  // Country picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: Colors.secondary[900] },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  countryRowSelected: { backgroundColor: '#FFF7ED' },
  countryRowFlag: { fontSize: 22 },
  countryRowName: { flex: 1, fontSize: 15, color: Colors.secondary[800] },
  countryRowDial: { fontSize: 14, color: Colors.secondary[500], fontWeight: '500' },
});
