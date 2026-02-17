import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Colors } from '../../constants/Colors';

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
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
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
            <FontAwesome name="arrow-left" size={16} color={Colors.secondary[600]} />
            <Text style={{ color: Colors.secondary[600], fontSize: 14 }}>Wróć</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: Colors.primary[500],
                marginBottom: 8,
              }}
            >
              WBTrade
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '600',
                color: Colors.secondary[900],
                marginBottom: 4,
              }}
            >
              Utwórz konto
            </Text>
            <Text style={{ fontSize: 15, color: Colors.secondary[500] }}>
              Dołącz do nas i zacznij kupować
            </Text>
          </View>

          {/* Error banner */}
          {error && (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FontAwesome name="exclamation-circle" size={16} color={Colors.destructive} />
              <Text style={{ color: Colors.destructive, fontSize: 14, flex: 1 }}>
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
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: acceptTerms ? Colors.primary[500] : Colors.secondary[300],
                backgroundColor: acceptTerms ? Colors.primary[500] : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {acceptTerms && (
                <FontAwesome name="check" size={13} color={Colors.white} />
              )}
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: Colors.secondary[600], lineHeight: 18 }}>
              Akceptuję{' '}
              <Text style={{ color: Colors.primary[500], fontWeight: '500' }}>regulamin</Text>
              {' '}oraz{' '}
              <Text style={{ color: Colors.primary[500], fontWeight: '500' }}>
                politykę prywatności
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <Button
            title={loading ? 'Rejestracja...' : 'Zarejestruj się'}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            size="lg"
          />

          {/* Login link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: Colors.secondary[500], fontSize: 14 }}>
              Masz już konto?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={{ color: Colors.primary[500], fontSize: 14, fontWeight: '600' }}>
                Zaloguj się
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
