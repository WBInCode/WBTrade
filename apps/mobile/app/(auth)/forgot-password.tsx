import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authApi } from '../../services/auth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Colors } from '../../constants/Colors';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotForm) => {
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Nie udało się wysłać emaila');
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
          <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 32 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.primary[50],
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <FontAwesome name="envelope" size={28} color={Colors.primary[500]} />
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '600',
                color: Colors.secondary[900],
                marginBottom: 8,
              }}
            >
              Resetuj hasło
            </Text>
            <Text
              style={{ fontSize: 14, color: Colors.secondary[500], textAlign: 'center', lineHeight: 20 }}
            >
              Podaj swój adres email, a wyślemy Ci link do zresetowania hasła
            </Text>
          </View>

          {sent ? (
            /* Success message */
            <View
              style={{
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#BBF7D0',
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
                  backgroundColor: Colors.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FontAwesome name="check" size={24} color={Colors.white} />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: Colors.secondary[900],
                  textAlign: 'center',
                }}
              >
                Email wysłany!
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.secondary[500],
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                Sprawdź swoją skrzynkę email i kliknij w link, aby zresetować hasło.
              </Text>
              <Button
                title="Wróć do logowania"
                onPress={() => router.replace('/(auth)/login')}
                variant="outline"
                fullWidth
                size="md"
              />
            </View>
          ) : (
            /* Form */
            <>
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

              <Input
                control={control}
                name="email"
                label="Email"
                placeholder="twoj@email.pl"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Button
                title="Wyślij link resetujący"
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
