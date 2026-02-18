import React, { useState, useRef } from 'react';
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
    title: '§ 1. Postanowienia ogólne',
    content:
      '1. Niniejszy Regulamin określa zasady korzystania ze sklepu internetowego prowadzonego pod adresem: https://www.wb-trade.pl (dalej: „Sklep").\n\n' +
      '2. Właścicielem i operatorem Sklepu jest: WB Partners Sp. z o.o. z siedzibą w Rzeszowie, ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów, NIP: 5170455185, REGON: 540735769, KRS: 0001151642 (dalej: „Sprzedawca").\n\n' +
      '3. Kontakt ze Sprzedawcą:\n   a) e-mail: support@wb-partners.pl,\n   b) telefon: +48 570 034 367,\n   c) godziny obsługi: pon.–pt. 9:00–17:00.\n\n' +
      '4. Regulamin jest udostępniony nieodpłatnie w Sklepie w sposób umożliwiający jego pozyskanie, odtwarzanie i utrwalanie.\n\n' +
      '5. Do korzystania ze Sklepu niezbędne są: urządzenie z dostępem do Internetu, przeglądarka internetowa, aktywne konto e-mail (w przypadku składania Zamówień).\n\n' +
      '6. Regulamin ma zastosowanie do Umów sprzedaży zawieranych w Sklepie z Klientami na terytorium Rzeczypospolitej Polskiej.\n\n' +
      '7. Sklep nie jest marketplace\'em umożliwiającym sprzedaż przez zewnętrznych sprzedawców – Sprzedawca oferuje produkty we własnym imieniu.\n\n' +
      '8. Korzystanie ze Sklepu oznacza akceptację niniejszego Regulaminu.',
  },
  {
    title: '§ 2. Definicje',
    content:
      '1. Klient – osoba fizyczna, osoba prawna lub jednostka organizacyjna posiadająca zdolność prawną, korzystająca ze Sklepu, w tym składająca Zamówienie.\n\n' +
      '2. Konsument – osoba fizyczna dokonująca zakupu niezwiązanego bezpośrednio z jej działalnością gospodarczą lub zawodową.\n\n' +
      '3. Przedsiębiorca – osoba fizyczna, osoba prawna lub jednostka organizacyjna prowadząca działalność gospodarczą lub zawodową.\n\n' +
      '4. Przedsiębiorca na prawach konsumenta – osoba fizyczna zawierająca Umowę bezpośrednio związaną z jej działalnością gospodarczą, gdy z treści Umowy wynika, że nie ma ona dla tej osoby charakteru zawodowego.\n\n' +
      '5. Konto – indywidualne konto Klienta w Sklepie, umożliwiające korzystanie z wybranych funkcji (w tym podgląd Zamówień).\n\n' +
      '6. Produkt – rzecz ruchoma oferowana w Sklepie (Sklep nie oferuje produktów cyfrowych).\n\n' +
      '7. Koszyk – funkcjonalność Sklepu umożliwiająca gromadzenie wybranych Produktów przed złożeniem Zamówienia.\n\n' +
      '8. Zamówienie – oświadczenie woli Klienta zmierzające bezpośrednio do zawarcia Umowy sprzedaży Produktu/Produktów.\n\n' +
      '9. Oferta – złożone przez Klienta Zamówienie, które stanowi ofertę w rozumieniu przepisów prawa.\n\n' +
      '10. Umowa – umowa sprzedaży zawarta pomiędzy Sprzedawcą a Klientem na odległość.\n\n' +
      '11. Dzień roboczy – dzień od poniedziałku do piątku, z wyłączeniem dni ustawowo wolnych od pracy.',
  },
  {
    title: '§ 3. Konto i zakupy bez rejestracji',
    content:
      '1. Założenie Konta jest dobrowolne i bezpłatne.\n\n' +
      '2. Klient może dokonywać zakupów bez rejestracji (jako „gość").\n\n' +
      '3. Założenie Konta wymaga podania co najmniej adresu e-mail i utworzenia hasła. Klient jest zobowiązany do podania danych zgodnych z prawdą.\n\n' +
      '4. Klient ponosi odpowiedzialność za zachowanie poufności danych logowania.\n\n' +
      '5. Sprzedawca może zablokować lub usunąć Konto, jeżeli:\n   a) Klient narusza postanowienia Regulaminu lub przepisy prawa,\n   b) działania Klienta zagrażają bezpieczeństwu Sklepu,\n   c) Klient podejmuje działania o charakterze nadużyciowym.\n\n' +
      '6. Usunięcie Konta nie wpływa na ważność Umów zawartych przed jego usunięciem.',
  },
  {
    title: '§ 4. Składanie Zamówień i zawarcie Umowy',
    content:
      '1. Zamówienia w Sklepie można składać 24 godziny na dobę, 7 dni w tygodniu, z zastrzeżeniem przerw technicznych.\n\n' +
      '2. W celu złożenia Zamówienia Klient:\n   a) wybiera Produkt/Produkty i dodaje je do Koszyka,\n   b) wybiera sposób dostawy i płatności,\n   c) podaje dane wymagane do realizacji Zamówienia,\n   d) potwierdza Zamówienie, akceptując Regulamin.\n\n' +
      '3. Złożenie Zamówienia przez Klienta stanowi ofertę zakupu Produktów na warunkach wskazanych w Sklepie.\n\n' +
      '4. Umowa zostaje zawarta z chwilą otrzymania przez Klienta potwierdzenia przyjęcia Zamówienia do realizacji.\n\n' +
      '5. Sprzedawca może odmówić przyjęcia Zamówienia do realizacji w szczególności, gdy:\n   a) Zamówienie zawiera oczywiste błędy,\n   b) brak jest możliwości realizacji Zamówienia z przyczyn niezależnych od Sprzedawcy,\n   c) zachodzi uzasadnione podejrzenie nadużycia.\n\n' +
      '6. Anulowanie Zamówienia:\n   a) Do czasu opłacenia Zamówienia Klient może anulować Zamówienie bez podania przyczyny,\n   b) Po opłaceniu Zamówienia anulowanie wymaga kontaktu z Biurem Obsługi Klienta,\n   c) Po nadaniu przesyłki anulowanie może nie być możliwe.',
  },
  {
    title: '§ 5. Ceny i płatności',
    content:
      '1. Ceny Produktów podawane są w złotych polskich (PLN) i zawierają podatek VAT.\n\n' +
      '2. Cena widoczna przy Produkcie w chwili składania Zamówienia jest wiążąca dla Stron.\n\n' +
      '3. Koszty dostawy są podawane w trakcie składania Zamówienia.\n\n' +
      '4. Dostępne metody płatności:\n   a) szybkie płatności online (PayU),\n   b) płatność kartą,\n   c) BLIK,\n   d) przelew tradycyjny.\n\n' +
      '5. W przypadku płatności przelewem tradycyjnym Sprzedawca przystępuje do realizacji po zaksięgowaniu środków.\n\n' +
      '6. Sprzedawca może udostępniać kupony rabatowe i akcje promocyjne na zasadach określonych w § 11.\n\n' +
      '7. Faktury wystawiane są na życzenie Klienta na podstawie danych podanych podczas składania Zamówienia.\n\n' +
      '8. Bezpieczeństwo transakcji: Sprzedawca nie przechowuje danych kart płatniczych. Płatności online realizowane są przez zewnętrznego operatora.\n\n' +
      '9. Zwrot płatności realizowany jest w formie odpowiadającej pierwotnej metodzie płatności.',
  },
  {
    title: '§ 6. Dostawa i realizacja Zamówień',
    content:
      '1. Dostawa realizowana jest na terytorium Polski.\n\n' +
      '2. Dostępne metody dostawy/odbioru:\n   a) Paczkomaty InPost,\n   b) Kurier InPost,\n   c) Kurier DPD,\n   d) przesyłka gabarytowa (dla wybranych Produktów),\n   e) odbiór osobisty w siedzibie Sprzedawcy – wyłącznie dla Produktów w kategorii „Outlet".\n\n' +
      '3. Dla wybranych Produktów obowiązują kwoty dostawy gabarytowej.\n\n' +
      '4. Czas realizacji Zamówienia wynosi zwykle 1–5 dni roboczych od dnia przyjęcia do realizacji.\n\n' +
      '5. Sprzedawca przekazuje Klientowi informację o nadaniu przesyłki, w tym numer przesyłki do śledzenia.\n\n' +
      '6. Odbiór i szkody w transporcie: Klient powinien sprawdzić stan przesyłki przy odbiorze. W przypadku uszkodzenia zaleca się sporządzenie protokołu szkody.\n\n' +
      '7. Ryzyko przypadkowej utraty lub uszkodzenia Produktu przechodzi na Klienta z chwilą wydania Produktu.',
  },
  {
    title: '§ 7. Gwarancja producenta',
    content:
      '1. Produkty mogą być objęte gwarancją udzieloną przez producenta lub dystrybutora.\n\n' +
      '2. Sprzedawca nie udziela dodatkowej gwarancji własnej ponad uprawnienia wynikające z przepisów prawa.\n\n' +
      '3. Warunki i zakres Gwarancji określa dokument gwarancyjny producenta/dystrybutora dołączony do Produktu.',
  },
  {
    title: '§ 8. Odstąpienie od Umowy (zwroty)',
    content:
      '1. Konsument oraz Przedsiębiorca na prawach konsumenta mają prawo odstąpić od Umowy bez podania przyczyny w terminie 14 dni od dnia otrzymania Produktu.\n\n' +
      '2. Dla zachowania terminu wystarczy wysłanie oświadczenia o odstąpieniu przed jego upływem.\n\n' +
      '3. Oświadczenie o odstąpieniu może zostać złożone poprzez formularz na podstronie „Zwroty i reklamacje" lub mailowo na: support@wb-partners.pl.\n\n' +
      '4. Warunek formalny: zgłoszenie wymaga podania numeru Zamówienia oraz danych identyfikujących Klienta.\n\n' +
      '5. Zwrot Produktu: Klient odsyła Produkt niezwłocznie, nie później niż 14 dni od złożenia oświadczenia. Produkt powinien być zwrócony kompletny, w stanie niepogorszonym.\n\n' +
      '6. Koszty zwrotu Produktu ponosi Klient, chyba że Sprzedawca wyraźnie zgodzi się pokryć te koszty.\n\n' +
      '7. Zwrot płatności nastąpi nie później niż w terminie 14 dni od dnia otrzymania oświadczenia o odstąpieniu.\n\n' +
      '8. Prawo odstąpienia nie przysługuje w przypadkach przewidzianych przepisami prawa.',
  },
  {
    title: '§ 9. Reklamacje i szkody',
    content:
      '1. Sprzedawca odpowiada wobec Klienta za zgodność Produktu z Umową na zasadach wynikających z przepisów prawa.\n\n' +
      '2. Zgłoszenie reklamacji:\n   a) poprzez formularz na podstronie „Zwroty i reklamacje" albo mailowo: support@wb-partners.pl,\n   b) reklamacja powinna zawierać: numer Zamówienia, opis problemu, żądanie Klienta, dane kontaktowe.\n\n' +
      '3. Zaleca się dołączenie zdjęć dokumentujących problem.\n\n' +
      '4. Termin rozpatrzenia: Sprzedawca udzieli odpowiedzi w terminie 14 dni od dnia otrzymania reklamacji.\n\n' +
      '5. W przypadku uznania reklamacji Sprzedawca ponosi uzasadnione koszty związane z reklamacją.\n\n' +
      '6. Szkody w transporcie: Klient powinien sprawdzić stan przesyłki przy odbiorze i niezwłocznie zgłosić szkodę przewoźnikowi.',
  },
  {
    title: '§ 10. Ochrona danych osobowych',
    content:
      '1. Administratorem danych osobowych jest Sprzedawca.\n\n' +
      '2. Dane osobowe przetwarzane są w celach i na zasadach opisanych w Polityce Prywatności dostępnej w Sklepie.\n\n' +
      '3. Podanie danych jest dobrowolne, lecz niezbędne do realizacji Zamówienia oraz świadczenia usług w Sklepie.',
  },
  {
    title: '§ 11. Newsletter i kupony rabatowe',
    content:
      '1. Newsletter: zapis jest dobrowolny. Zasady zapisu, wypisu oraz ewentualnych benefitów wynikają z komunikatów w Sklepie.\n\n' +
      '2. Kupony rabatowe:\n   a) kupon po rejestracji – ważny 14 dni,\n   b) kupon po zapisie do newslettera – ważny 30 dni,\n   c) Sprzedawca może przekazywać kody rabatowe w ramach działań marketingowych.\n\n' +
      '3. Jeżeli warunki kuponu/akcji przewidują ograniczenia, są one wiążące dla Klienta.\n\n' +
      '4. Sprzedawca może odmówić realizacji kuponu w przypadku uzasadnionego podejrzenia nadużycia.',
  },
  {
    title: '§ 12. Własność intelektualna',
    content:
      '1. Wszelkie treści dostępne w Sklepie (teksty, grafiki, zdjęcia, logotypy, elementy UI) stanowią własność Sprzedawcy lub są wykorzystywane na podstawie licencji.\n\n' +
      '2. Zabrania się kopiowania, rozpowszechniania lub wykorzystywania treści Sklepu w celach komercyjnych bez zgody Sprzedawcy.',
  },
  {
    title: '§ 13. Odpowiedzialność i bezpieczeństwo',
    content:
      '1. Sprzedawca dokłada należytej staranności, aby informacje prezentowane w Sklepie były aktualne i rzetelne.\n\n' +
      '2. W przypadku oczywistego błędu cenowego Sprzedawca może odmówić realizacji Zamówienia.\n\n' +
      '3. Sprzedawca nie ponosi odpowiedzialności za:\n   a) przerwy w działaniu Sklepu wynikające z przyczyn niezależnych,\n   b) korzystanie ze Sklepu w sposób sprzeczny z Regulaminem lub przepisami prawa.\n\n' +
      '4. Klient zobowiązuje się do korzystania ze Sklepu zgodnie z prawem, dobrymi obyczajami oraz postanowieniami Regulaminu.',
  },
  {
    title: '§ 14. Postanowienia końcowe',
    content:
      '1. Sprzedawca zastrzega sobie prawo do zmiany Regulaminu z ważnych przyczyn.\n\n' +
      '2. Zmiany Regulaminu wchodzą w życie z dniem publikacji w Sklepie.\n\n' +
      '3. W sprawach nieuregulowanych Regulaminem zastosowanie mają przepisy prawa polskiego.\n\n' +
      '4. Ewentualne spory:\n   a) dla Konsumentów – sąd właściwy zgodnie z przepisami prawa,\n   b) dla Klientów niebędących Konsumentami – sąd właściwy dla siedziby Sprzedawcy.\n\n' +
      '5. Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń (ADR). Szczegółowe informacje: polubowne.uokik.gov.pl.',
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

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Regulamin', headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome name="file-text-o" size={28} color={Colors.primary[600]} />
          </View>
          <Text style={styles.heroTitle}>Regulamin</Text>
          <Text style={styles.heroDate}>Ostatnia aktualizacja: 4 lutego 2026 r.</Text>
        </View>

        {/* Intro */}
        <View style={styles.introCard}>
          <FontAwesome name="info-circle" size={16} color={Colors.primary[600]} />
          <Text style={styles.introText}>
            Poniżej znajdziesz pełną treść regulaminu sklepu WBTrade. Kliknij na sekcję, aby
            rozwinąć jej treść.
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
