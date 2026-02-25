import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Constants from 'expo-constants';

const themeLabels = { auto: 'Automatyczny', light: 'Jasny', dark: 'Ciemny' } as const;

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: number;
  destructive?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

function MenuItem({ icon, title, subtitle, onPress, badge, destructive, colors }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconWrap, { backgroundColor: destructive ? colors.destructiveBg : colors.tintLight }]}>
          <FontAwesome
            name={icon as any}
            size={16}
            color={destructive ? colors.destructive : colors.tint}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuItemText, { color: destructive ? colors.destructive : colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{subtitle}</Text>
          )}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {badge && badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.tint }]}>
            <Text style={[styles.badgeText, { color: colors.badgeText }]}>{badge}</Text>
          </View>
        ) : null}
        <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const colors = useThemeColors();
  const { themePreference } = useTheme();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundTertiary }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mój profil</Text>
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Login prompt */}
          <View style={[styles.guestCard, { backgroundColor: colors.card }]}>
            <View style={styles.guestIconWrap}>
              <FontAwesome name="user-circle" size={64} color={colors.textMuted} />
            </View>
            <Text style={[styles.guestText, { color: colors.text }]}>Zaloguj się lub utwórz konto</Text>
            <Text style={[styles.guestHint, { color: colors.textSecondary }]}>
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

          {/* Ustawienia */}
          <SectionHeader title="Ustawienia" colors={colors} />
          <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
            <MenuItem colors={colors} icon="moon-o" title="Motyw" subtitle={themeLabels[themePreference]} onPress={() => router.push('/account/theme')} />
          </View>

          {/* Pomoc */}
          <SectionHeader title="Pomoc" colors={colors} />
          <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
            <MenuItem colors={colors} icon="headphones" title="Skontaktuj się z nami" onPress={() => router.push('/account/contact')} />
            <MenuItem colors={colors} icon="question-circle" title="Centrum pomocy" onPress={() => router.push('/account/help')} />
            <MenuItem colors={colors} icon="info-circle" title="O nas" onPress={() => router.push('/account/about')} />
            <MenuItem colors={colors} icon="file-text-o" title="Regulamin" onPress={() => router.push('/account/terms')} />
            <MenuItem colors={colors} icon="shield" title="Polityka prywatności" onPress={() => router.push('/account/privacy')} />
          </View>

          {/* Version */}
          <Text style={[styles.versionText, { color: colors.textMuted, marginTop: 24 }]}>Wersja {appVersion}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundTertiary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mój profil</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User card */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.card }]}
          onPress={() => router.push('/account/profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.userAvatar, { backgroundColor: colors.tint }]}>
            <Text style={[styles.userAvatarText, { color: colors.textInverse }]}>
              {(user.firstName?.[0] || '').toUpperCase()}
              {(user.lastName?.[0] || '').toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={[styles.userSubtitle, { color: colors.textMuted }]}>Dane konta i ustawienia</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Zakupy */}
        <SectionHeader title="Zakupy" colors={colors} />
        <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
          <MenuItem colors={colors} icon="shopping-bag" title="Moje zamówienia" onPress={() => router.push('/account/orders')} />
          <MenuItem colors={colors} icon="ticket" title="Moje rabaty" onPress={() => router.push('/account/discounts')} />
          <MenuItem colors={colors} icon="heart" title="Ulubione" onPress={() => router.push('/(tabs)/wishlist')} />
          <MenuItem colors={colors} icon="star" title="Moje opinie" onPress={() => router.push('/account/reviews')} />
          <MenuItem colors={colors} icon="list-ul" title="Listy zakupowe" onPress={() => router.push('/account/shopping-lists')} />
          <MenuItem colors={colors} icon="map-marker" title="Dane do zamówień" onPress={() => router.push('/account/addresses')} />
          <MenuItem colors={colors} icon="refresh" title="Reklamacje i zwroty" onPress={() => router.push('/account/orders')} />
        </View>

        {/* Ustawienia */}
        <SectionHeader title="Ustawienia" colors={colors} />
        <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
          <MenuItem colors={colors} icon="user" title="Edytuj profil" onPress={() => router.push('/account/profile')} />
          <MenuItem colors={colors} icon="lock" title="Zmień hasło" onPress={() => router.push('/account/password')} />
          <MenuItem colors={colors} icon="moon-o" title="Motyw" subtitle={themeLabels[themePreference]} onPress={() => router.push('/account/theme')} />
        </View>

        {/* Pomoc */}
        <SectionHeader title="Pomoc" colors={colors} />
        <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
          <MenuItem colors={colors} icon="headphones" title="Skontaktuj się z nami" onPress={() => router.push('/account/contact')} />
          <MenuItem colors={colors} icon="question-circle" title="Centrum pomocy" onPress={() => router.push('/account/help')} />
          <MenuItem colors={colors} icon="info-circle" title="O nas" onPress={() => router.push('/account/about')} />
          <MenuItem colors={colors} icon="file-text-o" title="Regulamin" onPress={() => router.push('/account/terms')} />
          <MenuItem colors={colors} icon="shield" title="Polityka prywatności" onPress={() => router.push('/account/privacy')} />
        </View>

        {/* Wyloguj */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={async () => {
              await logout();
              router.replace('/(tabs)');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.logoutBtnText, { color: colors.textSecondary }]}>Wyloguj się</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={[styles.versionText, { color: colors.textMuted }]}>Wersja {appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  guestCard: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
  },
  guestIconWrap: {
    marginBottom: 8,
  },
  guestText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  guestHint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  guestButtons: {
    width: '100%',
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 13,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuSection: {
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
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
  },
  logoutContainer: {
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  logoutBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
  },
});
