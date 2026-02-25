import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authApi } from '../../services/auth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useThemeColors } from '../../hooks/useThemeColors';

const schema = z.object({
  password: z
    .string()
    .min(1, 'Hasło jest wymagane')
    .min(8, 'Hasło musi mieć min. 8 znaków'),
  confirmPassword: z
    .string()
    .min(1, 'Powtórz hasło'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasła nie są identyczne',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const colors = useThemeColors();

  const { control, handleSubmit } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      setError('Brak tokenu resetowania. Użyj linku z emaila.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Nie udało się zmienić hasła. Link mógł wygasnąć.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}
          >
            <FontAwesome name="arrow-left" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Wróć</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 32 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.tintLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <FontAwesome name="key" size={28} color={colors.tint} />
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '600',
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Nowe hasło
            </Text>
            <Text
              style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}
            >
              Wpisz nowe hasło do swojego konta
            </Text>
          </View>

          {success ? (
            <View
              style={{
                backgroundColor: colors.successBg,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 20,
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FontAwesome name="check" size={24} color={colors.textInverse} />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  textAlign: 'center',
                }}
              >
                Hasło zmienione!
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textMuted,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                Możesz teraz zalogować się nowym hasłem.
              </Text>
              <Button
                title="Zaloguj się"
                onPress={() => router.replace('/(auth)/login')}
                fullWidth
                size="lg"
              />
            </View>
          ) : (
            <>
              {error && (
                <View
                  style={{
                    backgroundColor: colors.destructiveBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FontAwesome name="exclamation-circle" size={16} color={colors.destructive} />
                  <Text style={{ color: colors.destructive, fontSize: 14, flex: 1 }}>
                    {error}
                  </Text>
                </View>
              )}

              <Input
                control={control}
                name="password"
                label="Nowe hasło"
                placeholder="Min. 8 znaków"
                secureTextEntry
                autoComplete="new-password"
              />

              <Input
                control={control}
                name="confirmPassword"
                label="Powtórz nowe hasło"
                placeholder="Powtórz hasło"
                secureTextEntry
                autoComplete="new-password"
              />

              <Button
                title="Zmień hasło"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                fullWidth
                size="lg"
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
