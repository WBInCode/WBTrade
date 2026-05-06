import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';

const SHIPPING_METHODS = [
  {
    name: 'InPost Paczkomaty',
    icon: 'inbox' as const,
    time: '1-2 dni robocze',
    price: 'od 15,99 zł',
    features: ['Odbiór 24/7', 'Ponad 20 000 automatów', 'Aplikacja InPost'],
    color: '#fbbf24',
  },
  {
    name: 'Kurier InPost',
    icon: 'truck' as const,
    time: '1-2 dni robocze',
    price: 'od 19,99 zł',
    features: ['Śledzenie przesyłki', 'Dostawa pod drzwi', 'SMS przed dostawą'],
    color: '#f97316',
  },
  {
    name: 'Kurier DPD',
    icon: 'truck' as const,
    time: '1-2 dni robocze',
    price: 'od 19,99 zł',
    features: ['Śledzenie przesyłki', 'Dostawa pod drzwi', 'Punkty odbioru DPD Pickup'],
    color: '#ef4444',
  },
  {
    name: 'Wysyłka gabaryt',
    icon: 'cube' as const,
    time: '2-5 dni roboczych',
    price: 'od 49,99 zł',
    features: ['Dla dużych produktów', 'Specjalna obsługa', 'Dostawa pod adres'],
    color: '#8b5cf6',
  },
];

export default function ShippingScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Dostawa', headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome name="truck" size={28} color={colors.tint} />
          </View>
          <Text style={styles.headerTitle}>Opcje dostawy</Text>
          <Text style={styles.headerSubtitle}>
            Wybierz najwygodniejszą formę dostawy. Darmowa wysyłka od 300 zł!
          </Text>
        </View>

        {/* Free shipping banner */}
        <View style={styles.freeShippingBanner}>
          <FontAwesome name="gift" size={16} color="#16a34a" />
          <Text style={styles.freeShippingText}>
            Darmowa wysyłka dla zamówień powyżej 300 zł
          </Text>
        </View>

        {/* Methods */}
        {SHIPPING_METHODS.map((method, index) => (
          <View key={index} style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <View style={[styles.methodIconWrap, { backgroundColor: method.color + '20' }]}>
                <FontAwesome name={method.icon} size={20} color={method.color} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodTime}>
                  <FontAwesome name="clock-o" size={11} color={colors.textMuted} /> {method.time}
                </Text>
              </View>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>{method.price}</Text>
              </View>
            </View>
            <View style={styles.featuresList}>
              {method.features.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <FontAwesome name="check" size={12} color="#16a34a" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Info note */}
        <View style={styles.infoNote}>
          <FontAwesome name="info-circle" size={14} color={colors.tint} />
          <Text style={styles.infoNoteText}>
            Czas dostawy jest liczony od momentu wysyłki z magazynu. Zamówienia złożone do 12:00 
            w dni robocze są wysyłane tego samego dnia.
          </Text>
        </View>
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

  // Header
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
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Free shipping banner
  freeShippingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#dcfce7',
    marginHorizontal: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  freeShippingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
    flex: 1,
  },

  // Method card
  methodCard: {
    backgroundColor: colors.card,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
    gap: 2,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  methodTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  priceTag: {
    backgroundColor: colors.tintLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.tint,
  },

  // Features
  featuresList: {
    gap: 6,
    paddingLeft: 56,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 20,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  infoNoteText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    flex: 1,
  },
});
