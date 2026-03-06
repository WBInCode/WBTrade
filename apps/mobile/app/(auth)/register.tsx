import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useThemeColors } from '../../hooks/useThemeColors';
import { api } from '../../services/api';

const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Imię jest wymagane')
    .min(2, 'Imię musi mieć min. 2 znaki'),
  lastName: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .min(2, 'Nazwisko musi mieć min. 2 znaki'),
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
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

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptNewsletter, setAcceptNewsletter] = useState(false);
  const colors = useThemeColors();

  const { control, handleSubmit } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    if (!acceptTerms) {
      setError('Musisz zaakceptować regulamin');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      if (result.success) {
        // Subscribe to newsletter if checkbox was checked
        if (acceptNewsletter) {
          try {
            await api.post('/newsletter/subscribe', { email: data.email, source: 'registration' });
          } catch {
            // Don't block registration if newsletter subscribe fails
          }
        }
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Rejestracja nie powiodła się');
      }
    } catch {
      setError('Błąd sieci. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Logowanie Google nie powiodło się');
      }
    } finally {
      setGoogleLoading(false);
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
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: colors.tint,
                marginBottom: 8,
              }}
            >
              WBTrade
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '600',
                color: colors.text,
                marginBottom: 4,
              }}
            >
              Utwórz konto
            </Text>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>
              Dołącz do nas i zacznij kupować
            </Text>
          </View>

          {/* Error banner */}
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

          {/* Form */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                control={control}
                name="firstName"
                label="Imię"
                placeholder="Jan"
                autoCapitalize="words"
                autoComplete="given-name"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                control={control}
                name="lastName"
                label="Nazwisko"
                placeholder="Kowalski"
                autoCapitalize="words"
                autoComplete="family-name"
              />
            </View>
          </View>

          <Input
            control={control}
            name="email"
            label="Email"
            placeholder="twoj@email.pl"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            control={control}
            name="password"
            label="Hasło"
            placeholder="Min. 8 znaków"
            secureTextEntry
            autoComplete="new-password"
          />

          <Input
            control={control}
            name="confirmPassword"
            label="Powtórz hasło"
            placeholder="Powtórz hasło"
            secureTextEntry
            autoComplete="new-password"
          />

          {/* Terms checkbox */}
          <TouchableOpacity
            onPress={() => setAcceptTerms(!acceptTerms)}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: acceptTerms ? colors.tint : colors.inputBorder,
                backgroundColor: acceptTerms ? colors.tint : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {acceptTerms && (
                <FontAwesome name="check" size={13} color={colors.textInverse} />
              )}
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
              Akceptuję{' '}
              <Text style={{ color: colors.tint, fontWeight: '500' }} onPress={() => router.push('/account/terms')}>regulamin</Text>
              {' '}oraz{' '}
              <Text style={{ color: colors.tint, fontWeight: '500' }} onPress={() => router.push('/account/privacy')}>
                politykę prywatności
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Newsletter checkbox */}
          <TouchableOpacity
            onPress={() => setAcceptNewsletter(!acceptNewsletter)}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: acceptNewsletter ? colors.tint : colors.inputBorder,
                backgroundColor: acceptNewsletter ? colors.tint : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {acceptNewsletter && (
                <FontAwesome name="check" size={13} color={colors.textInverse} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                Chcę otrzymywać newsletter z{' '}
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  ekskluzywnymi kuponami rabatowymi
                </Text>
                {' '}i informacjami o promocjach
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <FontAwesome name="gift" size={12} color={colors.tint} />
                <Text style={{ fontSize: 11, color: colors.tint, fontWeight: '600' }}>
                  Otrzymasz kupon rabatowy po potwierdzeniu!
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Submit */}
          <Button
            title={loading ? 'Rejestracja...' : 'Zarejestruj się'}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            size="lg"
          />

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ marginHorizontal: 12, color: colors.textMuted, fontSize: 13 }}>lub</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* Google signup */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={googleLoading || loading}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 14,
              backgroundColor: colors.card,
              opacity: googleLoading || loading ? 0.6 : 1,
            }}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <>
                <FontAwesome name="google" size={18} color="#4285F4" />
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                  Kontynuuj przez Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              Masz już konto?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={{ color: colors.tint, fontSize: 14, fontWeight: '600' }}>
                Zaloguj się
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
