import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Colors } from '../../constants/Colors';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
  password: z
    .string()
    .min(1, 'Hasło jest wymagane'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Nieprawidłowy email lub hasło');
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
          {/* Header */}
          <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 40 }}>
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
              Witaj ponownie!
            </Text>
            <Text style={{ fontSize: 15, color: Colors.secondary[500] }}>
              Zaloguj się do swojego konta
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
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
          />

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={{ alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 }}
          >
            <Text style={{ color: Colors.primary[500], fontSize: 14 }}>
              Zapomniałeś hasła?
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <Button
            title={loading ? 'Logowanie...' : 'Zaloguj się'}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            size="lg"
          />

          {/* Register link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: Colors.secondary[500], fontSize: 14 }}>
              Nie masz konta?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={{ color: Colors.primary[500], fontSize: 14, fontWeight: '600' }}>
                Zarejestruj się
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security note */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 32,
              gap: 6,
            }}
          >
            <FontAwesome name="lock" size={12} color={Colors.secondary[400]} />
            <Text style={{ color: Colors.secondary[400], fontSize: 12 }}>
              Połączenie szyfrowane SSL. Twoje dane są bezpieczne.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
