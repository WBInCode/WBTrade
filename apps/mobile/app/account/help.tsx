import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Help categories ───
const CATEGORIES = [
  {
    icon: 'shopping-bag',
    title: 'Zamówienia',
    items: [
      'Jak złożyć zamówienie?',
      'Jak sprawdzić status zamówienia?',
      'Jak anulować zamówienie?',
      'Jak otrzymać fakturę?',
    ],
  },
  {
    icon: 'credit-card',
    title: 'Płatności',
    items: [
      'Jakie metody płatności są dostępne?',
      'Czy płatności są bezpieczne?',
      'Kiedy zostanę obciążony?',
      'Jak otrzymać zwrot pieniędzy?',
    ],
  },
  {
    icon: 'refresh',
    title: 'Zwroty i reklamacje',
    items: [
      'Jak złożyć zwrot?',
      'Jak złożyć reklamację?',
      'Ile trwa rozpatrzenie reklamacji?',
      'Kto pokrywa koszty zwrotu?',
    ],
  },
  {
    icon: 'truck',
    title: 'Dostawa',
    items: [
      'Jakie są metody dostawy?',
      'Ile kosztuje dostawa?',
      'Ile trwa dostawa?',
      'Jak śledzić przesyłkę?',
    ],
  },
  {
    icon: 'user',
    title: 'Konto',
    items: [
      'Jak założyć konto?',
      'Jak zmienić dane osobowe?',
      'Jak zmienić hasło?',
      'Jak usunąć konto?',
    ],
  },
  {
    icon: 'shield',
    title: 'Bezpieczeństwo i Prawne',
    items: [
      'Jak chronimy Twoje dane?',
      'Regulamin sklepu',
      'Polityka prywatności',
      'Polityka cookies',
    ],
  },
];

// ─── Popular FAQ ───
const FAQ: { q: string; a: string }[] = [
  {
    q: 'Jak mogę śledzić moje zamówienie?',
    a: 'Po nadaniu przesyłki otrzymasz wiadomość e-mail z numerem śledzenia. Możesz też sprawdzić status zamówienia w zakładce „Moje zamówienia" w swoim profilu.',
  },
  {
    q: 'Jakie są metody płatności?',
    a: 'Akceptujemy szybkie płatności online (PayU), BLIK, karty płatnicze oraz przelewy tradycyjne. Wszystkie transakcje są szyfrowane i bezpieczne.',
  },
  {
    q: 'Jak mogę zwrócić produkt?',
    a: 'Masz 14 dni od otrzymania produktu na odstąpienie od umowy bez podania przyczyny. Złóż zgłoszenie zwrotu przez zakładkę „Reklamacje i zwroty" lub napisz na support@wb-partners.pl.',
  },
  {
    q: 'Ile trwa dostawa?',
    a: 'Standardowe zamówienia realizujemy w 1–5 dni roboczych. Czas dostawy zależy od wybranej metody – Paczkomaty InPost, kurier InPost lub kurier DPD.',
  },
];

function CategoryCard({
  icon,
  title,
  items,
}: {
  icon: string;
  title: string;
  items: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.catCard}>
      <TouchableOpacity style={styles.catHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.catIconWrap}>
          <FontAwesome name={icon as any} size={18} color={Colors.primary[600]} />
        </View>
        <Text style={styles.catTitle}>{title}</Text>
        <FontAwesome
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={Colors.secondary[400]}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.catItems}>
          {items.map((item, i) => (
            <View key={i} style={styles.catItem}>
              <FontAwesome name="circle" size={5} color={Colors.secondary[300]} style={{ marginTop: 7 }} />
              <Text style={styles.catItemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity style={styles.faqHeader} onPress={toggle} activeOpacity={0.7}>
        <Text style={styles.faqQuestion}>{q}</Text>
        <FontAwesome
          name={open ? 'minus' : 'plus'}
          size={14}
          color={Colors.primary[600]}
        />
      </TouchableOpacity>
      {open && <Text style={styles.faqAnswer}>{a}</Text>}
    </View>
  );
}

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Centrum pomocy', headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome name="question-circle" size={32} color={Colors.primary[600]} />
          </View>
          <Text style={styles.heroTitle}>Centrum pomocy</Text>
          <Text style={styles.heroSubtitle}>
            Znajdź odpowiedzi na najczęściej zadawane pytania
          </Text>
        </View>

        {/* Categories */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Kategorie pomocy</Text>
          <View style={styles.catList}>
            {CATEGORIES.map((cat) => (
              <CategoryCard key={cat.title} {...cat} />
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Popularne pytania</Text>
          <View style={styles.faqList}>
            {FAQ.map((item, i) => (
              <FAQItem key={i} {...item} />
            ))}
          </View>
        </View>

        {/* CTA contact */}
        <View style={styles.ctaCard}>
          <FontAwesome name="comments" size={28} color={Colors.primary[600]} />
          <Text style={styles.ctaTitle}>Nie znalazłeś odpowiedzi?</Text>
          <Text style={styles.ctaSubtitle}>
            Skontaktuj się z nami — odpowiemy najszybciej, jak to możliwe
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/account/contact')}
            activeOpacity={0.7}
          >
            <FontAwesome name="headphones" size={16} color={Colors.white} />
            <Text style={styles.ctaBtnText}>Skontaktuj się</Text>
          </TouchableOpacity>
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
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    lineHeight: 20,
  },

  // ─── Section ───
  sectionWrap: {
    paddingHorizontal: 12,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // ─── Category cards ───
  catList: {
    gap: 8,
  },
  catCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[900],
  },
  catItems: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingLeft: 68,
    gap: 8,
  },
  catItem: {
    flexDirection: 'row',
    gap: 8,
  },
  catItemText: {
    fontSize: 14,
    color: Colors.secondary[600],
    flex: 1,
    lineHeight: 20,
  },

  // ─── FAQ ───
  faqList: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.secondary[100],
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[900],
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.secondary[600],
    lineHeight: 21,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },

  // ─── CTA ───
  ctaCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 24,
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginTop: 12,
    marginBottom: 6,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: Colors.secondary[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});
