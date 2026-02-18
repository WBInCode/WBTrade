import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../services/auth';

// ─── Form field component ───
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  readOnly,
  keyboardType,
  autoCapitalize,
  error,
  icon,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  error?: string;
  icon?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        {icon ? (
          <View style={styles.inputIcon}>
            <FontAwesome name={icon as any} size={16} color={Colors.secondary[400]} />
          </View>
        ) : null}
        <TextInput
          style={[
            styles.fieldInput,
            icon ? styles.fieldInputWithIcon : null,
            readOnly ? styles.fieldInputReadOnly : null,
            error ? styles.fieldInputError : null,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.secondary[300]}
          editable={!readOnly}
          selectTextOnFocus={!readOnly}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'words'}
        />
      </View>
      {readOnly ? (
        <Text style={styles.fieldHint}>Adres email nie może być zmieniony</Text>
      ) : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Section header ───
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <FontAwesome name={icon as any} size={16} color={Colors.primary[500]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, refreshProfile } = useAuth();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [companyStreet, setCompanyStreet] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyPostalCode, setCompanyPostalCode] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Populate form from user
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setCompanyName(user.companyName || '');
      setNip(user.nip || '');
      setCompanyStreet(user.companyStreet || '');
      setCompanyCity(user.companyCity || '');
      setCompanyPostalCode(user.companyPostalCode || '');
      setDirty(false);
    }
  }, [user]);

  // Track changes
  const updateField = (setter: (v: string) => void, field: string) => (value: string) => {
    setter(value);
    setDirty(true);
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Validate
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'Imię jest wymagane';
    if (!lastName.trim()) errs.lastName = 'Nazwisko jest wymagane';
    if (nip && !/^\d{10}$/.test(nip.replace(/[^0-9]/g, ''))) {
      errs.nip = 'NIP powinien mieć 10 cyfr';
    }
    if (companyPostalCode && !/^\d{2}-?\d{3}$/.test(companyPostalCode.trim())) {
      errs.companyPostalCode = 'Format: XX-XXX';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await authApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        companyName: companyName.trim() || undefined,
        nip: nip.replace(/[^0-9]/g, '') || undefined,
        companyStreet: companyStreet.trim() || undefined,
        companyCity: companyCity.trim() || undefined,
        companyPostalCode: companyPostalCode.trim() || undefined,
      } as any);

      await refreshProfile();
      setDirty(false);

      // Show toast
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
    } catch (err: any) {
      if (err.errors) {
        // Map API validation errors
        const mapped: Record<string, string> = {};
        Object.entries(err.errors).forEach(([key, val]: [string, any]) => {
          mapped[key] = Array.isArray(val) ? val[0] : val;
        });
        setErrors(mapped);
      } else {
        Alert.alert('Błąd', err.message || 'Nie udało się zapisać profilu');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Edytuj profil', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Edytuj profil', headerShown: true }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar / initials */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user.firstName?.[0] || '').toUpperCase()}
                {(user.lastName?.[0] || '').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.avatarName}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.avatarEmail}>{user.email}</Text>
          </View>

          {/* Personal info */}
          <SectionHeader title="Dane osobowe" icon="user" />

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Field
                  label="Imię"
                  value={firstName}
                  onChangeText={updateField(setFirstName, 'firstName')}
                  icon="user"
                  error={errors.firstName}
                />
              </View>
              <View style={styles.halfField}>
                <Field
                  label="Nazwisko"
                  value={lastName}
                  onChangeText={updateField(setLastName, 'lastName')}
                  error={errors.lastName}
                />
              </View>
            </View>

            <Field
              label="Adres email"
              value={user.email}
              readOnly
              icon="envelope"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="Telefon"
              value={phone}
              onChangeText={updateField(setPhone, 'phone')}
              placeholder="+48 123 456 789"
              icon="phone"
              keyboardType="phone-pad"
              autoCapitalize="none"
              error={errors.phone}
            />
          </View>

          {/* Company info */}
          <SectionHeader title="Dane firmowe (opcjonalne)" icon="building" />

          <View style={styles.card}>
            <Field
              label="Nazwa firmy"
              value={companyName}
              onChangeText={updateField(setCompanyName, 'companyName')}
              placeholder="Opcjonalne"
              icon="building"
              error={errors.companyName}
            />

            <Field
              label="NIP"
              value={nip}
              onChangeText={updateField(setNip, 'nip')}
              placeholder="Opcjonalne"
              keyboardType="phone-pad"
              autoCapitalize="none"
              error={errors.nip}
            />

            <Field
              label="Ulica firmy"
              value={companyStreet}
              onChangeText={updateField(setCompanyStreet, 'companyStreet')}
              placeholder="Opcjonalne"
              error={errors.companyStreet}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field
                  label="Kod pocztowy"
                  value={companyPostalCode}
                  onChangeText={updateField(setCompanyPostalCode, 'companyPostalCode')}
                  placeholder="00-000"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  error={errors.companyPostalCode}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Field
                  label="Miasto"
                  value={companyCity}
                  onChangeText={updateField(setCompanyCity, 'companyCity')}
                  placeholder="Opcjonalne"
                  error={errors.companyCity}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save button — sticky at bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!dirty || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <FontAwesome name="check" size={16} color={Colors.white} />
              <Text style={styles.saveBtnText}>Zapisz zmiany</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Toast */}
      {toastVisible && (
        <View style={styles.toast}>
          <FontAwesome name="check-circle" size={18} color={Colors.success} />
          <Text style={styles.toastText}>Profil zaktualizowany</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // ─── Avatar ───
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary[900],
  },
  avatarEmail: {
    fontSize: 14,
    color: Colors.secondary[400],
    marginTop: 2,
  },

  // ─── Section header ───
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[700],
  },

  // ─── Card ───
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // ─── Fields ───
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.secondary[700],
    marginBottom: 6,
  },
  inputRow: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
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
  fieldInputWithIcon: {
    paddingLeft: 38,
  },
  fieldInputReadOnly: {
    backgroundColor: Colors.secondary[100],
    color: Colors.secondary[400],
  },
  fieldInputError: {
    borderColor: Colors.destructive,
  },
  fieldHint: {
    fontSize: 11,
    color: Colors.secondary[400],
    marginTop: 4,
    fontStyle: 'italic',
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

  // ─── Bottom bar ───
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary[500],
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveBtnDisabled: {
    backgroundColor: Colors.secondary[300],
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },

  // ─── Toast ───
  toast: {
    position: 'absolute',
    bottom: 90,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.secondary[900],
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
  },
});
