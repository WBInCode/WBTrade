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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Section {
  title: string;
  content: string;
}

const SECTIONS: Section[] = [
  {
    title: '1. Informacje ogólne',
    content:
      'Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych przekazanych przez Użytkowników w związku z korzystaniem z serwisu wb-trade.pl („Sklep").\n\n' +
      'Administratorem danych osobowych jest WB Partners Sp. z o.o. z siedzibą w Rzeszowie pod ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów, wpisana do rejestru przedsiębiorców KRS pod numerem 0001151642, NIP: 5170455185, REGON: 540735769.',
  },
  {
    title: '2. Zakres zbieranych danych',
    content:
      'Zbieramy następujące dane osobowe:\n\n' +
      '• Imię i nazwisko\n' +
      '• Adres e-mail\n' +
      '• Numer telefonu\n' +
      '• Adres dostawy\n' +
      '• Dane rozliczeniowe\n' +
      '• Dane do faktury\n' +
      '• Dane zamówień\n' +
      '• Dane techniczne i analityczne',
  },
  {
    title: '3. Źródło danych osobowych',
    content:
      'Dane osobowe pozyskujemy bezpośrednio od Ciebie, w szczególności podczas: rejestracji konta, składania zamówienia, wypełniania formularzy kontaktowych, zapisu do newslettera oraz w trakcie kontaktu z Biurem Obsługi Klienta.\n\n' +
      'Dodatkowo, po wyrażeniu zgody na pliki cookies, możemy pozyskiwać dane z urządzenia i przeglądarki (np. identyfikatory cookies, adres IP, informacje o aktywności w Sklepie) w związku z korzystaniem z narzędzi analitycznych i marketingowych.',
  },
  {
    title: '4. Cel przetwarzania danych',
    content:
      'Dane osobowe przetwarzane są w celu:\n\n' +
      '• Realizacji zamówień i umów sprzedaży\n' +
      '• Obsługi konta użytkownika\n' +
      '• Obsługi zwrotów i reklamacji\n' +
      '• Kontaktu z klientem w sprawach zamówienia\n' +
      '• Prowadzenia analiz i statystyk\n' +
      '• Marketingu bezpośredniego\n' +
      '• Wysyłki newslettera (na podstawie zgody)\n' +
      '• Wypełnienia obowiązków prawnych\n' +
      '• Ustalenia, dochodzenia i obrony roszczeń',
  },
  {
    title: '5. Podstawa prawna przetwarzania',
    content:
      'Przetwarzamy dane osobowe na podstawie:\n\n' +
      '• Art. 6 ust. 1 lit. a RODO – zgoda użytkownika\n' +
      '• Art. 6 ust. 1 lit. b RODO – niezbędność do wykonania umowy\n' +
      '• Art. 6 ust. 1 lit. c RODO – wypełnienie obowiązku prawnego\n' +
      '• Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes administratora\n\n' +
      'Szczegółowe cele i przypisane im podstawy prawne wskazujemy w dokumencie „RODO" dostępnym w Sklepie.',
  },
  {
    title: '6. Okres przechowywania danych',
    content:
      'Dane osobowe przechowywane są przez okres niezbędny do realizacji celów, dla których zostały zebrane, a następnie przez okres wymagany przepisami prawa (np. przepisami podatkowymi – 5 lat od końca roku, w którym powstał obowiązek podatkowy).\n\n' +
      'Dane przetwarzane na podstawie zgody przechowujemy do momentu jej wycofania.',
  },
  {
    title: '7. Prawa użytkownika',
    content:
      'Każdy użytkownik ma prawo do:\n\n' +
      '• Dostępu do swoich danych osobowych\n' +
      '• Sprostowania nieprawdziwych danych\n' +
      '• Usunięcia danych („prawo do bycia zapomnianym")\n' +
      '• Ograniczenia przetwarzania\n' +
      '• Przenoszenia danych\n' +
      '• Sprzeciwu wobec przetwarzania\n' +
      '• Wycofania zgody w dowolnym momencie\n' +
      '• Wniesienia skargi do organu nadzorczego (UODO)',
  },
  {
    title: '8. Odbiorcy danych',
    content:
      'Dane osobowe mogą być przekazywane następującym podmiotom:\n\n' +
      '• Firmom kurierskim i pocztowym (w celu dostawy zamówień)\n' +
      '• Operatorom płatności (w celu realizacji płatności)\n' +
      '• Dostawcom usług IT i hostingu\n' +
      '• Biurom rachunkowym i kancelariom prawnym\n' +
      '• Organom państwowym (na podstawie przepisów prawa)',
  },
  {
    title: '9. Pliki cookies',
    content:
      'Serwis wykorzystuje pliki cookies w celu:\n\n' +
      '• Utrzymania sesji użytkownika\n' +
      '• Zapamiętania zawartości koszyka\n' +
      '• Prowadzenia analiz statystycznych\n' +
      '• Personalizacji treści i reklam\n\n' +
      'Użytkownik może w każdej chwili zmienić ustawienia przeglądarki dotyczące cookies.',
  },
  {
    title: '10. Bezpieczeństwo danych',
    content:
      'Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych przed nieuprawnionym dostępem, utratą lub zniszczeniem.\n\n' +
      'Wykorzystujemy szyfrowanie SSL, kontrolę dostępu oraz regularne kopie zapasowe.',
  },
  {
    title: '11. Kontakt',
    content:
      'W sprawach związanych z ochroną danych osobowych można kontaktować się:\n\n' +
      '• E-mail: support@wb-partners.pl\n' +
      '• Telefon: +48 570 034 367\n' +
      '• Adres: WB Partners Sp. z o.o., ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów',
  },
  {
    title: '12. Zmiany polityki prywatności',
    content:
      'Administrator zastrzega sobie prawo do wprowadzania zmian w Polityce Prywatności. O wszelkich zmianach użytkownicy będą informowani poprzez publikację nowej wersji na stronie internetowej.\n\n' +
      'Korzystanie z serwisu po wprowadzeniu zmian oznacza ich akceptację.',
  },
];

function SectionAccordion({ section, index }: { section: Section; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.accordionItem}>
      <TouchableOpacity style={styles.accordionHeader} onPress={toggle} activeOpacity={0.7}>
        <Text style={styles.accordionTitle}>{section.title}</Text>
        <FontAwesome
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={Colors.secondary[400]}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.accordionBody}>
          <Text style={styles.accordionText}>{section.content}</Text>
        </View>
      )}
    </View>
  );
}

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Polityka prywatności', headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome name="shield" size={28} color={Colors.primary[600]} />
          </View>
          <Text style={styles.heroTitle}>Polityka prywatności</Text>
          <Text style={styles.heroDate}>Ostatnia aktualizacja: 18 grudnia 2025</Text>
        </View>

        {/* Intro */}
        <View style={styles.introCard}>
          <FontAwesome name="lock" size={16} color={Colors.primary[600]} />
          <Text style={styles.introText}>
            Ochrona Twoich danych osobowych jest dla nas priorytetem. Poniżej znajdziesz
            szczegółowe informacje o tym, jak przetwarzamy i chronimy Twoje dane.
          </Text>
        </View>

        {/* Sections */}
        <View style={styles.accordionList}>
          {SECTIONS.map((section, i) => (
            <SectionAccordion key={i} section={section} index={i} />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            WB PARTNERS Sp. z o.o. · ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów
          </Text>
          <Text style={styles.footerText}>
            NIP: 5170455185 · KRS: 0001151642
          </Text>
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
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 6,
  },
  heroDate: {
    fontSize: 13,
    color: Colors.secondary[500],
  },

  // ─── Intro ───
  introCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary[50],
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  introText: {
    fontSize: 13,
    color: Colors.secondary[700],
    lineHeight: 20,
    flex: 1,
  },

  // ─── Accordion ───
  accordionList: {
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  accordionItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.secondary[100],
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[900],
    flex: 1,
    marginRight: 12,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  accordionText: {
    fontSize: 13,
    color: Colors.secondary[600],
    lineHeight: 21,
  },

  // ─── Footer ───
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: Colors.secondary[400],
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
