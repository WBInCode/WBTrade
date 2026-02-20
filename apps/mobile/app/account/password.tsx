import React, { useState } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { authApi } from '../../services/auth';

// ─── Password field ───
function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputIcon}>
          <FontAwesome name="lock" size={16} color={Colors.secondary[400]} />
        </View>
        <TextInput
          style={[styles.fieldInput, error ? styles.fieldInputError : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.secondary[300]}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setVisible(!visible)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome
            name={visible ? 'eye' : 'eye-slash'}
            size={16}
            color={Colors.secondary[400]}
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function PasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  // Clear field error on change
  const updateField = (setter: (v: string) => void, field: string) => (value: string) => {
    setter(value);
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Password strength indicators
  const strength = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const strengthCount = Object.values(strength).filter(Boolean).length;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!currentPassword) {
      errs.currentPassword = 'Obecne hasło jest wymagane';
    }
    if (!newPassword) {
      errs.newPassword = 'Nowe hasło jest wymagane';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Hasło musi mieć minimum 8 znaków';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Powtórz nowe hasło';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Hasła nie są identyczne';
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errs.newPassword = 'Nowe hasło musi być inne niż obecne';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);

      // Show success toast
      setToastVisible(true);

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});

      // Hide toast and go back after delay
      setTimeout(() => {
        setToastVisible(false);
        router.back();
      }, 2000);
    } catch (err: any) {
      if (err.statusCode === 400 || err.statusCode === 401) {
        setErrors({ currentPassword: err.message || 'Nieprawidłowe obecne hasło' });
      } else {
        Alert.alert('Błąd', err.message || 'Nie udało się zmienić hasła');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Zmień hasło', headerShown: true }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <FontAwesome name="shield" size={28} color={Colors.primary[500]} />
            </View>
            <Text style={styles.headerTitle}>Zmiana hasła</Text>
            <Text style={styles.headerSubtitle}>
              Dla bezpieczeństwa wprowadź swoje obecne hasło, a następnie ustaw nowe
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <PasswordField
              label="Obecne hasło"
              value={currentPassword}
              onChangeText={updateField(setCurrentPassword, 'currentPassword')}
              placeholder="Wprowadź obecne hasło"
              error={errors.currentPassword}
            />

            <View style={styles.divider} />

            <PasswordField
              label="Nowe hasło"
              value={newPassword}
              onChangeText={updateField(setNewPassword, 'newPassword')}
              placeholder="Minimum 8 znaków"
              error={errors.newPassword}
            />

            {/* Password strength */}
            {newPassword.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        i <= strengthCount && {
                          backgroundColor:
                            strengthCount <= 1
                              ? Colors.destructive
                              : strengthCount <= 2
                              ? Colors.warning
                              : strengthCount <= 3
                              ? '#60a5fa'
                              : Colors.success,
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.strengthChecks}>
                  <StrengthItem ok={strength.length} text="Min. 8 znaków" />
                  <StrengthItem ok={strength.upper} text="Wielka litera" />
                  <StrengthItem ok={strength.lower} text="Mała litera" />
                  <StrengthItem ok={strength.number} text="Cyfra" />
                </View>
              </View>
            )}

            <PasswordField
              label="Powtórz nowe hasło"
              value={confirmPassword}
              onChangeText={updateField(setConfirmPassword, 'confirmPassword')}
              placeholder="Powtórz nowe hasło"
              error={errors.confirmPassword}
            />

            {/* Match indicator */}
            {confirmPassword.length > 0 && newPassword.length > 0 && (
              <View style={styles.matchRow}>
                <FontAwesome
                  name={newPassword === confirmPassword ? 'check-circle' : 'times-circle'}
                  size={14}
                  color={newPassword === confirmPassword ? Colors.success : Colors.destructive}
                />
                <Text
                  style={[
                    styles.matchText,
                    {
                      color:
                        newPassword === confirmPassword ? Colors.success : Colors.destructive,
                    },
                  ]}
                >
                  {newPassword === confirmPassword
                    ? 'Hasła się zgadzają'
                    : 'Hasła nie są identyczne'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!currentPassword || !newPassword || !confirmPassword || saving) &&
              styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!currentPassword || !newPassword || !confirmPassword || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <FontAwesome name="lock" size={16} color={Colors.white} />
              <Text style={styles.submitBtnText}>Zmień hasło</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Toast */}
      {toastVisible && (
        <View style={styles.toast}>
          <FontAwesome name="check-circle" size={18} color={Colors.success} />
          <Text style={styles.toastText}>Hasło zostało zmienione</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Strength check item ───
function StrengthItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.strengthItem}>
      <FontAwesome
        name={ok ? 'check' : 'circle-o'}
        size={10}
        color={ok ? Colors.success : Colors.secondary[300]}
      />
      <Text style={[styles.strengthItemText, ok && styles.strengthItemTextOk]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // ─── Header ───
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.secondary[400],
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
    lineHeight: 20,
  },

  // ─── Card ───
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },

  // ─── Field ───
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  fieldInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingLeft: 38,
    paddingRight: 44,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.secondary[900],
  },
  fieldInputError: {
    borderColor: Colors.destructive,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.destructive,
    marginTop: 4,
  },

  // ─── Strength ───
  strengthWrap: {
    marginBottom: 16,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.secondary[200],
  },
  strengthChecks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strengthItemText: {
    fontSize: 11,
    color: Colors.secondary[400],
  },
  strengthItemTextOk: {
    color: Colors.success,
  },

  // ─── Match ───
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
    marginBottom: 4,
  },
  matchText: {
    fontSize: 12,
  },

  // ─── Bottom bar ───
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary[500],
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.secondary[300],
  },
  submitBtnText: {
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
