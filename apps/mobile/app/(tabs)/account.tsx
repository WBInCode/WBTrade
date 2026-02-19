import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Constants from 'expo-constants';

interface MenuItemProps {
  icon: string;
  title: string;
  onPress: () => void;
  badge?: number;
  destructive?: boolean;
}

function MenuItem({ icon, title, onPress, badge, destructive }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconWrap, destructive && styles.menuIconWrapDestructive]}>
          <FontAwesome
            name={icon as any}
            size={16}
            color={destructive ? Colors.destructive : Colors.primary[600]}
          />
        </View>
        <Text style={[styles.menuItemText, destructive && styles.menuItemTextDestructive]}>
          {title}
        </Text>
      </View>
      <View style={styles.menuItemRight}>
        {badge && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <FontAwesome name="chevron-right" size={14} color={Colors.secondary[300]} />
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mój profil</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={styles.guestIconWrap}>
            <FontAwesome name="user-circle" size={80} color={Colors.secondary[300]} />
          </View>
          <Text style={styles.guestText}>Zaloguj się lub utwórz konto</Text>
          <Text style={styles.guestHint}>
            Uzyskaj dostęp do swoich zamówień, ulubionych produktów i wiele więcej
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
        <Text style={styles.headerTitle}>Mój profil</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User card */}
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => router.push('/account/profile')}
          activeOpacity={0.7}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(user.firstName?.[0] || '').toUpperCase()}
              {(user.lastName?.[0] || '').toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.userSubtitle}>Dane konta i ustawienia</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={Colors.secondary[300]} />
        </TouchableOpacity>

        {/* Zakupy */}
        <SectionHeader title="Zakupy" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="shopping-bag"
            title="Moje zamówienia"
            onPress={() => router.push('/account/orders')}
          />
          <MenuItem
            icon="ticket"
            title="Moje rabaty"
            onPress={() => router.push('/account/discounts')}
          />
          <MenuItem
            icon="heart"
            title="Ulubione"
            onPress={() => router.push('/(tabs)/wishlist')}
          />
          <MenuItem
            icon="list-ul"
            title="Listy zakupowe"
            onPress={() => router.push('/account/shopping-lists')}
          />
          <MenuItem
            icon="map-marker"
            title="Dane do zamówień"
            onPress={() => router.push('/account/addresses')}
          />
          <MenuItem
            icon="refresh"
            title="Reklamacje i zwroty"
            onPress={() => router.push('/account/orders')}
          />
        </View>

        {/* Ustawienia */}
        <SectionHeader title="Ustawienia" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="user"
            title="Edytuj profil"
            onPress={() => router.push('/account/profile')}
          />
          <MenuItem
            icon="lock"
            title="Zmień hasło"
            onPress={() => router.push('/account/password')}
          />
        </View>

        {/* Pomoc */}
        <SectionHeader title="Pomoc" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="headphones"
            title="Skontaktuj się z nami"
            onPress={() => router.push('/account/contact')}
          />
          <MenuItem
            icon="question-circle"
            title="Centrum pomocy"
            onPress={() => router.push('/account/help')}
          />
          <MenuItem
            icon="info-circle"
            title="O nas"
            onPress={() => router.push('/account/about')}
          />
          <MenuItem
            icon="file-text-o"
            title="Regulamin"
            onPress={() => router.push('/account/terms')}
          />
          <MenuItem
            icon="shield"
            title="Polityka prywatności"
            onPress={() => router.push('/account/privacy')}
          />
        </View>

        {/* Wyloguj */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
              router.replace('/(tabs)');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutBtnText}>Wyloguj się</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Wersja {appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[100],
  },
  header: {
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary[900],
  },

  // ─── Guest ───
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.secondary[50],
  },
  guestIconWrap: {
    marginBottom: 8,
  },
  guestText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.secondary[900],
    marginTop: 16,
    marginBottom: 8,
  },
  guestHint: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  guestButtons: {
    width: '100%',
    gap: 12,
  },

  // ─── Scroll ───
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // ─── User card ───
  userCard: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 13,
    color: Colors.secondary[400],
  },

  // ─── Section header ───
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary[900],
  },

  // ─── Menu ───
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.secondary[100],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconWrapDestructive: {
    backgroundColor: '#fef2f2',
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.secondary[900],
  },
  menuItemTextDestructive: {
    color: Colors.destructive,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.primary[500],
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },

  // ─── Logout ───
  logoutContainer: {
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  logoutBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary[200],
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[700],
  },

  // ─── Version ───
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.secondary[400],
    marginTop: 16,
  },
});
