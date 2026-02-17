import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

interface MenuItemProps {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.secondary[100],
        gap: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: danger ? '#FEF2F2' : Colors.primary[50],
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <FontAwesome
          name={icon}
          size={16}
          color={danger ? Colors.destructive : Colors.primary[500]}
        />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          color: danger ? Colors.destructive : Colors.secondary[900],
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
      <FontAwesome name="chevron-right" size={12} color={Colors.secondary[400]} />
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          backgroundColor: Colors.white,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.secondary[900] }}>
          Konto
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {isAuthenticated && user ? (
          <>
            {/* User info */}
            <View
              style={{
                backgroundColor: Colors.white,
                margin: 16,
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: Colors.primary[100],
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.primary[600] }}>
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.secondary[900] }}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={{ fontSize: 13, color: Colors.secondary[500], marginTop: 2 }}>
                  {user.email}
                </Text>
              </View>
            </View>

            {/* Menu */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: Colors.secondary[500],
                  textTransform: 'uppercase',
                  paddingHorizontal: 16,
                  marginBottom: 6,
                }}
              >
                Zamówienia
              </Text>
              <MenuItem
                icon="list-alt"
                label="Moje zamówienia"
                onPress={() => router.push('/account/orders')}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: Colors.secondary[500],
                  textTransform: 'uppercase',
                  paddingHorizontal: 16,
                  marginBottom: 6,
                }}
              >
                Ustawienia
              </Text>
              <MenuItem
                icon="user"
                label="Dane osobowe"
                onPress={() => router.push('/account/profile')}
              />
              <MenuItem
                icon="lock"
                label="Zmień hasło"
                onPress={() => router.push('/account/change-password')}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: Colors.secondary[500],
                  textTransform: 'uppercase',
                  paddingHorizontal: 16,
                  marginBottom: 6,
                }}
              >
                Pomoc
              </Text>
              <MenuItem
                icon="question-circle"
                label="FAQ"
                onPress={() => router.push('/faq')}
              />
              <MenuItem
                icon="envelope"
                label="Kontakt"
                onPress={() => router.push('/contact')}
              />
            </View>

            {/* Logout */}
            <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 32 }}>
              <Button
                title="Wyloguj się"
                variant="outline"
                onPress={logout}
                fullWidth
                icon={<FontAwesome name="sign-out" size={16} color={Colors.primary[500]} />}
              />
            </View>
          </>
        ) : (
          /* Guest view */
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: Colors.secondary[100],
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <FontAwesome name="user" size={36} color={Colors.secondary[400]} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: Colors.secondary[900], marginBottom: 8 }}>
              Zaloguj się
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: Colors.secondary[500],
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              Zaloguj się, aby śledzić zamówienia, zapisać ulubione i szybciej kupować
            </Text>
            <Button
              title="Zaloguj się"
              onPress={() => router.push('/(auth)/login')}
              fullWidth
              size="lg"
            />
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={{ marginTop: 16 }}
            >
              <Text style={{ color: Colors.primary[500], fontSize: 14, fontWeight: '600' }}>
                Utwórz konto
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
