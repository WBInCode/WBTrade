import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

interface MenuItemProps {
  icon: string;
  title: string;
  onPress: () => void;
}

function MenuItem({ icon, title, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <FontAwesome name={icon as any} size={20} color={Colors.primary[600]} />
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color={Colors.secondary[400]} />
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Konto</Text>
        </View>
        <View style={styles.guestContainer}>
          <FontAwesome name="user-circle" size={80} color={Colors.secondary[400]} />
          <Text style={styles.guestText}>Zaloguj się lub utwórz konto</Text>
          <Text style={styles.guestHint}>
            Uzyskaj dostęp do swoich zamówień, historii zakupów i wiele więcej
          </Text>
          <View style={styles.guestButtons}>
            <Button
              title="Zaloguj się"
              onPress={() => router.push('/(auth)/login')}
            />
            <Button
              title="Utwórz konto"
              variant="outline"
              onPress={() => router.push('/(auth)/register')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Konto</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <FontAwesome name="user" size={32} color={Colors.white} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <MenuItem
            icon="shopping-bag"
            title="Moje zamówienia"
            onPress={() => {
              // TODO: Navigate to orders
              alert('Historia zamówień będzie dostępna wkrótce');
            }}
          />
          <MenuItem
            icon="map-marker"
            title="Moje adresy"
            onPress={() => {
              // TODO: Navigate to addresses
              alert('Zarządzanie adresami będzie dostępne wkrótce');
            }}
          />
          <MenuItem
            icon="user"
            title="Edytuj profil"
            onPress={() => {
              // TODO: Navigate to profile edit
              alert('Edycja profilu będzie dostępna wkrótce');
            }}
          />
          <MenuItem
            icon="lock"
            title="Zmień hasło"
            onPress={() => {
              // TODO: Navigate to password change
              alert('Zmiana hasła będzie dostępna wkrótce');
            }}
          />
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <Button
            title="Wyloguj się"
            variant="outline"
            onPress={async () => {
              await logout();
              router.replace('/(tabs)');
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  header: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  guestText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginTop: 24,
    marginBottom: 8,
  },
  guestHint: {
    fontSize: 14,
    color: Colors.secondary[600],
    textAlign: 'center',
    marginBottom: 32,
  },
  guestButtons: {
    width: '100%',
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  userInfo: {
    backgroundColor: Colors.white,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.secondary[600],
  },
  menu: {
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[100],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.secondary[900],
    marginLeft: 16,
  },
  logoutContainer: {
    padding: 16,
  },
});
