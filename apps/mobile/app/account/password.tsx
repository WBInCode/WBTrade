import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  inputRef,
  onSubmit,
  returnKeyType = 'next',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  inputRef?: React.RefObject<TextInput | null>;
  onSubmit?: () => void;
  returnKeyType?: 'next' | 'done';
}) {
  const [visible, setVisible] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          ref={inputRef as any}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setVisible(!visible)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome name={visible ? 'eye-slash' : 'eye'} size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function StrengthItem({ met, label }: { met: boolean; label: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.reqItem}>
      <FontAwesome
        name={met ? 'check-circle' : 'circle-o'}
        size={14}
        color={met ? colors.success : colors.textMuted}
      />
      <Text style={[styles.reqLabel, met && styles.reqLabelMet]}>{label}</Text>
    </View>
  );
}

export default function PasswordScreen() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Password strength
  const getStrength = (pw: string): PasswordStrength => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const levels: PasswordStrength[] = [
      { score: 0, label: 'Za słabe', color: colors.destructive },
      { score: 1, label: 'Słabe', color: colors.destructive },
      { score: 2, label: 'Średnie', color: colors.warning },
      { score: 3, label: 'Dobre', color: colors.tint },
      { score: 4, label: 'Silne', color: colors.success },
    ];
    return levels[score];
  };

  const strength = getStrength(newPassword);

  const requirements = [
    { met: newPassword.length >= 8, label: 'Min. 8 znaków' },
    { met: /[A-Z]/.test(newPassword), label: 'Wielka litera' },
    { met: /[0-9]/.test(newPassword), label: 'Cyfra' },
    { met: /[^A-Za-z0-9]/.test(newPassword), label: 'Znak specjalny' },
  ];

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!currentPassword) newErrors.current = 'Podaj aktualne hasło';
    if (!newPassword) newErrors.new = 'Podaj nowe hasło';
    else if (strength.score < 2) newErrors.new = 'Hasło jest za słabe';
    if (!confirmPassword) newErrors.confirm = 'Potwierdź nowe hasło';
    else if (newPassword !== confirmPassword) newErrors.confirm = 'Hasła nie są identyczne';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showToast('Twoje hasło zostało pomyślnie zmienione.', 'success');
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Nie udało się zmienić hasła';
      if (msg.toLowerCase().includes('current') || msg.toLowerCase().includes('aktualne')) {
        setErrors({ current: 'Aktualne hasło jest nieprawidłowe' });
      } else {
        setErrors({ new: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const isValid = currentPassword.length > 0 && strength.score >= 2 && passwordsMatch;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Zmiana hasła',
          headerShown: true,
          headerBackTitle: 'Konto',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current password */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Aktualne hasło</Text>
              <Text style={styles.sectionHint}>
                Przed zmianą hasła weryfikujemy Twoją tożsamość.
              </Text>
              <PasswordField
                label="Aktualne hasło"
                value={currentPassword}
                onChangeText={(v) => {
                  setCurrentPassword(v);
                  setErrors((e) => ({ ...e, current: undefined }));
                }}
                placeholder="Wpisz aktualne hasło"
                error={errors.current}
                onSubmit={() => newRef.current?.focus()}
              />
            </View>

            {/* New password */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nowe hasło</Text>
              <PasswordField
                label="Nowe hasło"
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setErrors((e) => ({ ...e, new: undefined }));
                }}
                placeholder="Wpisz nowe hasło"
                error={errors.new}
                inputRef={newRef}
                onSubmit={() => confirmRef.current?.focus()}
              />

              {/* Strength meter */}
              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthSegment,
                          {
                            backgroundColor:
                              i < strength.score ? strength.color : colors.borderLight,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}

              {/* Requirements */}
              <View style={styles.requirements}>
                {requirements.map((req) => (
                  <StrengthItem key={req.label} met={req.met} label={req.label} />
                ))}
              </View>

              {/* Confirm */}
              <PasswordField
                label="Potwierdź nowe hasło"
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setErrors((e) => ({ ...e, confirm: undefined }));
                }}
                placeholder="Wpisz ponownie nowe hasło"
                error={errors.confirm}
                inputRef={confirmRef}
                returnKeyType="done"
                onSubmit={handleSubmit}
              />

              {/* Match indicator */}
              {confirmPassword.length > 0 && (
                <View style={styles.matchRow}>
                  <FontAwesome
                    name={passwordsMatch ? 'check-circle' : 'times-circle'}
                    size={14}
                    color={passwordsMatch ? colors.success : colors.destructive}
                  />
                  <Text
                    style={[
                      styles.matchText,
                      { color: passwordsMatch ? colors.success : colors.destructive },
                    ]}
                  >
                    {passwordsMatch ? 'Hasła są identyczne' : 'Hasła nie są identyczne'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <FontAwesome name="lock" size={16} color={colors.textInverse} />
                  <Text style={styles.submitBtnText}>Zmień hasło</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Section
  section: {
    backgroundColor: colors.card,
    marginBottom: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },

  // Field
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.destructive,
    marginTop: 4,
  },

  // Strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    height: 4,
  },
  strengthSegment: {
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },

  // Requirements
  requirements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reqLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reqLabelMet: {
    color: colors.success,
  },

  // Match
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Bottom
  bottomBar: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  submitBtn: {
    backgroundColor: colors.tint,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
