import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const VALUES = [
  {
    icon: 'handshake-o',
    title: 'Zaufanie',
    description: 'Budujemy długotrwałe relacje z klientami oparte na transparentności i uczciwości.',
  },
  {
    icon: 'lightbulb-o',
    title: 'Innowacyjność',
    description: 'Stale rozwijamy naszą platformę, aby oferować najlepsze doświadczenie zakupowe.',
  },
  {
    icon: 'users',
    title: 'Społeczność',
    description: 'Tworzymy przestrzeń dla pasjonatów technologii, gdzie każdy znajdzie coś dla siebie.',
  },
  {
    icon: 'leaf',
    title: 'Zrównoważony rozwój',
    description: 'Dbamy o środowisko i promujemy odpowiedzialne podejście do konsumpcji.',
  },
];

const STATS = [
  { value: 'Tysiące', label: 'zadowolonych klientów' },
  { value: '10 000+', label: 'produktów w ofercie' },
  { value: '24/7', label: 'dostępność sklepu' },
  { value: '14 dni', label: 'na zwrot produktu' },
];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'O nas', headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome name="shopping-cart" size={28} color={Colors.primary[600]} />
          </View>
          <Text style={styles.heroTitle}>WBTrade</Text>
          <Text style={styles.heroTagline}>Twój sklep z elektroniką i nie tylko</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Story */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nasza historia</Text>
          <View style={styles.storyCard}>
            <Text style={styles.storyText}>
              WBTrade to sklep internetowy, który powstał z pasji do nowoczesnych technologii i 
              chęci zapewnienia klientom najlepszych produktów w atrakcyjnych cenach.
            </Text>
            <Text style={styles.storyText}>
              Zaczęliśmy jako niewielki, 5-osobowy startup z wizją stworzenia platformy, która 
              łączy szeroką ofertę produktową z wyjątkowym doświadczeniem zakupowym. Dziś WBTrade 
              to dynamicznie rozwijający się sklep, który obsługuje tysiące klientów.
            </Text>
            <Text style={styles.storyText}>
              Nasza oferta obejmuje elektronikę, akcesoria komputerowe, sprzęt AGD, artykuły 
              do domu i wiele więcej. Stale poszerzamy asortyment, aby sprostać oczekiwaniom 
              nawet najbardziej wymagających klientów.
            </Text>
          </View>
        </View>

        {/* Values */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nasze wartości</Text>
          <View style={styles.valuesList}>
            {VALUES.map((v) => (
              <View key={v.title} style={styles.valueCard}>
                <View style={styles.valueIconWrap}>
                  <FontAwesome name={v.icon as any} size={22} color={Colors.primary[600]} />
                </View>
                <View style={styles.valueContent}>
                  <Text style={styles.valueTitle}>{v.title}</Text>
                  <Text style={styles.valueDesc}>{v.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Contact CTA */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Masz pytania?</Text>
            <Text style={styles.ctaSubtitle}>
              Skontaktuj się z nami — chętnie pomożemy!
            </Text>
            <View style={styles.ctaInfo}>
              <TouchableOpacity
                style={styles.ctaRow}
                onPress={() => Linking.openURL('mailto:support@wb-partners.pl')}
              >
                <FontAwesome name="envelope" size={14} color={Colors.primary[600]} />
                <Text style={styles.ctaRowText}>support@wb-partners.pl</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaRow}
                onPress={() => Linking.openURL('tel:+48570034367')}
              >
                <FontAwesome name="phone" size={14} color={Colors.primary[600]} />
                <Text style={styles.ctaRowText}>+48 570 034 367</Text>
              </TouchableOpacity>
              <View style={styles.ctaRow}>
                <FontAwesome name="clock-o" size={14} color={Colors.primary[600]} />
                <Text style={styles.ctaRowText}>pon.–pt. 9:00–17:00</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Company footer */}
        <View style={styles.footer}>
          <Text style={styles.footerCompany}>WB PARTNERS Sp. z o.o.</Text>
          <Text style={styles.footerAddr}>ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów</Text>
          <Text style={styles.footerNip}>NIP: 5170455185 · KRS: 0001151642</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[100],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ─── Hero ───
  hero: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.secondary[900],
    marginBottom: 4,
  },
  heroTagline: {
    fontSize: 15,
    color: Colors.secondary[500],
  },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 8,
  },
  statItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '46%',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary[600],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.secondary[500],
    textAlign: 'center',
  },

  // ─── Section ───
  section: {
    paddingHorizontal: 12,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // ─── Story ───
  storyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  storyText: {
    fontSize: 14,
    color: Colors.secondary[700],
    lineHeight: 22,
  },

  // ─── Values ───
  valuesList: {
    gap: 8,
  },
  valueCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
  },
  valueIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 4,
  },
  valueDesc: {
    fontSize: 13,
    color: Colors.secondary[600],
    lineHeight: 20,
  },

  // ─── CTA ───
  ctaSection: {
    paddingHorizontal: 12,
    marginTop: 24,
  },
  ctaCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: Colors.secondary[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaInfo: {
    width: '100%',
    gap: 10,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaRowText: {
    fontSize: 14,
    color: Colors.secondary[700],
  },

  // ─── Footer ───
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 4,
  },
  footerCompany: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary[500],
  },
  footerAddr: {
    fontSize: 12,
    color: Colors.secondary[400],
  },
  footerNip: {
    fontSize: 12,
    color: Colors.secondary[400],
  },
});
