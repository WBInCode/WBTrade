import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { api } from '../../services/api';

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  safetyInfo?: string | null;
  euRepName?: string | null;
  euRepAddress?: string | null;
  euRepEmail?: string | null;
  _count?: { products: number };
}

export default function ManufacturerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api.get<Manufacturer>(`/manufacturers/slug/${slug}`)
      .then((data) => setManufacturer(data))
      .catch(() => setError('Nie udało się załadować danych producenta'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Producent', headerBackTitle: 'Wróć' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !manufacturer) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Producent', headerBackTitle: 'Wróć' }} />
        <View style={styles.centered}>
          <FontAwesome name="exclamation-circle" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>{error || 'Nie znaleziono producenta'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: manufacturer.name, headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome name="industry" size={28} color={colors.tint} />
          </View>
          <Text style={styles.headerTitle}>{manufacturer.name}</Text>
          {manufacturer._count && (
            <Text style={styles.headerSubtitle}>
              {manufacturer._count.products} {manufacturer._count.products === 1 ? 'produkt' : 'produktów'}
            </Text>
          )}
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dane kontaktowe</Text>
          <View style={styles.card}>
            {manufacturer.address && (
              <View style={styles.infoRow}>
                <FontAwesome name="map-marker" size={16} color={colors.tint} style={styles.infoIcon} />
                <Text style={styles.infoText}>{manufacturer.address}</Text>
              </View>
            )}
            {manufacturer.email && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(`mailto:${manufacturer.email}`)}
              >
                <FontAwesome name="envelope" size={14} color={colors.tint} style={styles.infoIcon} />
                <Text style={[styles.infoText, styles.link]}>{manufacturer.email}</Text>
              </TouchableOpacity>
            )}
            {manufacturer.phone && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(`tel:${manufacturer.phone}`)}
              >
                <FontAwesome name="phone" size={14} color={colors.tint} style={styles.infoIcon} />
                <Text style={[styles.infoText, styles.link]}>{manufacturer.phone}</Text>
              </TouchableOpacity>
            )}
            {manufacturer.website && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(manufacturer.website!)}
              >
                <FontAwesome name="globe" size={15} color={colors.tint} style={styles.infoIcon} />
                <Text style={[styles.infoText, styles.link]} numberOfLines={1}>
                  {manufacturer.website}
                </Text>
              </TouchableOpacity>
            )}
            {!manufacturer.address && !manufacturer.email && !manufacturer.phone && !manufacturer.website && (
              <Text style={styles.emptyText}>Brak danych kontaktowych</Text>
            )}
          </View>
        </View>

        {/* Safety Info (GPSR) */}
        {manufacturer.safetyInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informacje o bezpieczeństwie</Text>
            <View style={styles.safetyCard}>
              <View style={styles.safetyHeader}>
                <FontAwesome name="exclamation-triangle" size={16} color="#b45309" />
                <Text style={styles.safetyTitle}>GPSR — Bezpieczeństwo produktu</Text>
              </View>
              <Text style={styles.safetyText}>{manufacturer.safetyInfo}</Text>
            </View>
          </View>
        )}

        {/* EU Representative */}
        {(manufacturer.euRepName || manufacturer.euRepAddress || manufacturer.euRepEmail) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Przedstawiciel w UE</Text>
            <View style={styles.euCard}>
              <View style={styles.euHeader}>
                <Text style={styles.euFlag}>🇪🇺</Text>
                <Text style={styles.euTitle}>Upoważniony przedstawiciel</Text>
              </View>
              {manufacturer.euRepName && (
                <View style={styles.infoRow}>
                  <FontAwesome name="user" size={14} color="#1d4ed8" style={styles.infoIcon} />
                  <Text style={styles.euText}>{manufacturer.euRepName}</Text>
                </View>
              )}
              {manufacturer.euRepAddress && (
                <View style={styles.infoRow}>
                  <FontAwesome name="map-marker" size={16} color="#1d4ed8" style={styles.infoIcon} />
                  <Text style={styles.euText}>{manufacturer.euRepAddress}</Text>
                </View>
              )}
              {manufacturer.euRepEmail && (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`mailto:${manufacturer.euRepEmail}`)}
                >
                  <FontAwesome name="envelope" size={14} color="#1d4ed8" style={styles.infoIcon} />
                  <Text style={[styles.euText, styles.link]}>{manufacturer.euRepEmail}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* View Products button */}
        {manufacturer._count && manufacturer._count.products > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.productsButton}
              onPress={() => router.push(`/products/list?brand=${encodeURIComponent(manufacturer.name)}&title=${encodeURIComponent(`Produkty: ${manufacturer.name}`)}`)}
            >
              <FontAwesome name="th-large" size={16} color="#fff" />
              <Text style={styles.productsButtonText}>
                Zobacz produkty ({manufacturer._count.products})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ─── Header ───
  header: {
    backgroundColor: colors.card,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // ─── Section ───
  section: {
    paddingHorizontal: 12,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // ─── Card ───
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    width: 20,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  link: {
    color: colors.tint,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // ─── Safety Card ───
  safetyCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
    gap: 10,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  safetyText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },

  // ─── EU Card ───
  euCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#93c5fd',
    gap: 10,
  },
  euHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  euFlag: {
    fontSize: 20,
  },
  euTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
  },
  euText: {
    fontSize: 14,
    color: '#1e3a5f',
    flex: 1,
  },

  // ─── Products Button ───
  productsButton: {
    backgroundColor: colors.tint,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  productsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
