import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Keyboard,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import type { ThemeColors } from '../constants/Colors';

const { width: SCREEN_W } = Dimensions.get('window');

// Bot branding
const WB_LOGO = require('../assets/images/wb-trade-logo.png');
const BOT_NAME = 'Piotrek';

// ─── FAQ Knowledge Base (from centrum pomocy + nawigacja po aplikacji) ───
const FAQ_DATA: { keywords: string[]; question: string; answer: string; category: string }[] = [
  // ═══ ZAMÓWIENIA ═══
  {
    keywords: ['zamówienie', 'złożyć', 'składanie', 'kupić', 'zakup', 'jak zamówić', 'jak kupić'],
    question: 'Jak złożyć zamówienie?',
    answer: 'Aby złożyć zamówienie:\n1. Dodaj produkty do koszyka\n2. Przejdź do koszyka (ikona 🛒 na dole)\n3. Kliknij „Dostawa i płatność"\n4. Podaj adres dostawy\n5. Wybierz metodę wysyłki i płatności\n6. Potwierdź zamówienie\n\nOtrzymasz e-mail z potwierdzeniem.',
    category: 'Zamówienia',
  },
  {
    keywords: ['status', 'śledzić', 'śledzenie', 'gdzie zamówienie', 'sprawdzić zamówienie', 'tracking', 'moje zamówienia'],
    question: 'Jak sprawdzić status zamówienia?',
    answer: 'Przejdź do: Konto → Moje zamówienia. Zobaczysz listę wszystkich zamówień z aktualnym statusem (Nowe → Potwierdzone → W realizacji → Wysłane → Dostarczone). Kliknij w zamówienie, aby zobaczyć oś czasu statusów i numer śledzenia przesyłki.',
    category: 'Zamówienia',
  },
  {
    keywords: ['anulować', 'anulowanie', 'odwołać', 'rezygnacja', 'zrezygnować'],
    question: 'Jak anulować zamówienie?',
    answer: 'Zamówienie możesz anulować w zakładce Konto → Moje zamówienia, o ile nie zostało jeszcze wysłane. Kliknij w zamówienie i wybierz opcję anulowania. Jeśli zamówienie zostało już nadane, skorzystaj z procedury zwrotu.',
    category: 'Zamówienia',
  },
  {
    keywords: ['faktura', 'vat', 'rachunek', 'dokument', 'firma', 'nip'],
    question: 'Jak otrzymać fakturę VAT?',
    answer: 'Fakturę VAT możesz pobrać z zakładki Konto → Moje zamówienia po kliknięciu w dane zamówienie. Ważne: aby otrzymać fakturę na firmę, podaj dane firmy (nazwa, NIP) w kroku „Adres" podczas składania zamówienia lub uzupełnij je w Konto → Edytuj profil.',
    category: 'Zamówienia',
  },
  {
    keywords: ['zamówienie bez konta', 'gość', 'bez rejestracji', 'bez logowania'],
    question: 'Czy mogę zamówić bez zakładania konta?',
    answer: 'Tak! Możesz złożyć zamówienie jako gość. W koszyku kliknij „Dostawa i płatność" — pojawi się opcja „Kontynuuj bez logowania". Podaj adres i dane dostawy. Pamiętaj jednak, że z kontem masz dostęp do historii zamówień, kuponów i list zakupowych.',
    category: 'Zamówienia',
  },
  {
    keywords: ['statusy zamówienia', 'etapy', 'oś czasu', 'timeline'],
    question: 'Jakie są etapy realizacji zamówienia?',
    answer: 'Zamówienie przechodzi przez następujące etapy:\n\n1. 📝 Nowe — zamówienie złożone\n2. ✅ Potwierdzone — płatność zweryfikowana\n3. 📦 W realizacji — kompletowane w magazynie\n4. 🚚 Wysłane — przekazane do kuriera\n5. ✔️ Dostarczone — odebrane\n\nCały postęp widzisz na osi czasu w szczegółach zamówienia.',
    category: 'Zamówienia',
  },

  // ═══ KOSZYK I CHECKOUT ═══
  {
    keywords: ['koszyk', 'dodać do koszyka', 'co jest w koszyku', 'produkty w koszyku'],
    question: 'Jak działa koszyk?',
    answer: 'Koszyk znajdziesz na dolnym pasku nawigacji (ikona 🛒). Produkty są automatycznie grupowane według magazynów jako osobne paczki (Paczka 1, Paczka 2...). Możesz zmieniać ilość produktów, usuwać je, oraz dodawać kupony rabatowe.',
    category: 'Koszyk',
  },
  {
    keywords: ['paczka', 'magazyn', 'dlaczego kilka paczek', 'kilka przesyłek', 'grupowanie'],
    question: 'Dlaczego moje zamówienie jest podzielone na paczki?',
    answer: 'Produkty w WBTrade pochodzą z różnych magazynów (Zielona Góra, Białystok, Chotów, Chynów, Rzeszów). Każdy magazyn wysyła osobną paczkę, dlatego w koszyku widzisz podział na „Paczka 1", „Paczka 2" itd. Aby zaoszczędzić na wysyłce, dodawaj produkty z tego samego magazynu — w koszyku znajdziesz link „Dodaj więcej z tego magazynu".',
    category: 'Koszyk',
  },
  {
    keywords: ['checkout', 'realizacja zamówienia', 'kroki zamówienia', 'jak zamówić krok po kroku'],
    question: 'Jak wygląda proces składania zamówienia?',
    answer: 'Proces zamówienia ma 4 kroki:\n\n1. 📍 Adres — podaj dane i adres dostawy (lub wybierz zapisany)\n2. 🚚 Dostawa — wybierz metodę wysyłki dla każdej paczki\n3. 💳 Płatność — wybierz sposób zapłaty\n4. 📋 Podsumowanie — sprawdź wszystko i złóż zamówienie\n\nMożesz się cofać między krokami.',
    category: 'Koszyk',
  },
  {
    keywords: ['zapisany adres', 'adres dostawy', 'moje adresy', 'zarządzać adresami'],
    question: 'Jak zarządzać adresami dostawy?',
    answer: 'Przejdź do Konto → Dane do zamówień. Tam możesz:\n• Dodawać nowe adresy (wysyłkowe i fakturowe)\n• Edytować istniejące adresy\n• Ustawiać adres domyślny\n• Usuwać zbędne adresy\n\nPrzy składaniu zamówienia zapisane adresy pojawią się automatycznie do wyboru.',
    category: 'Koszyk',
  },

  // ═══ PŁATNOŚCI ═══
  {
    keywords: ['płatność', 'płacić', 'metody płatności', 'blik', 'karta', 'przelew', 'zapłacić', 'przelewy24'],
    question: 'Jakie metody płatności są dostępne?',
    answer: 'Akceptujemy:\n• Szybkie przelewy online (Przelewy24)\n• BLIK\n• Karty płatnicze (Visa, Mastercard)\n• Apple Pay, Google Pay\n• Przelewy tradycyjne\n• Płatność przy odbiorze (za pobraniem)\n\nWszystkie transakcje online są szyfrowane i bezpieczne.',
    category: 'Płatności',
  },
  {
    keywords: ['bezpieczne', 'bezpieczeństwo płatności', 'szyfrowanie', 'ssl'],
    question: 'Czy płatności są bezpieczne?',
    answer: 'Tak, wszystkie płatności są realizowane przez certyfikowanego operatora Przelewy24 z szyfrowaniem SSL. Nie przechowujemy danych Twoich kart płatniczych — są one przetwarzane wyłącznie przez operatora płatności.',
    category: 'Płatności',
  },
  {
    keywords: ['obciążony', 'pobranie', 'kiedy płatność', 'kiedy pobrana', 'za pobraniem'],
    question: 'Kiedy zostanę obciążony?',
    answer: 'Obciążenie następuje w momencie potwierdzenia płatności. Przy szybkich przelewach i BLIK — natychmiast. Przy kartach — kwota może być zablokowana od razu, a pobrana po wysyłce. Przy płatności za pobraniem płacisz kurierowi przy odbiorze.',
    category: 'Płatności',
  },
  {
    keywords: ['zwrot pieniędzy', 'refund', 'oddać pieniądze', 'zwrot środków', 'zwrot na konto'],
    question: 'Jak otrzymać zwrot pieniędzy?',
    answer: 'Zwrot środków następuje automatycznie po zaakceptowaniu zwrotu produktu. Pieniądze wrócą na konto, z którego dokonano płatności w ciągu 5-14 dni roboczych, w zależności od banku. Status zwrotu możesz śledzić w Konto → Moje zamówienia.',
    category: 'Płatności',
  },
  {
    keywords: ['status płatności', 'czy zapłacono', 'opłacone', 'nieopłacone'],
    question: 'Jak sprawdzić status płatności?',
    answer: 'Status płatności znajdziesz w szczegółach zamówienia (Konto → Moje zamówienia → kliknij zamówienie). Przy płatności zobaczysz status: Opłacone ✅, Oczekuje ⏳, Nieudana ❌ lub Zwrócone 🔄.',
    category: 'Płatności',
  },

  // ═══ ZWROTY I REKLAMACJE ═══
  {
    keywords: ['zwrot', 'zwrócić', 'odesłać', 'odstąpienie', '14 dni', 'zwrot produktu'],
    question: 'Jak złożyć zwrot?',
    answer: 'Masz 14 dni od otrzymania produktu na odstąpienie od umowy bez podania przyczyny.\n\n1. Przejdź do Konto → Moje zamówienia\n2. Kliknij zamówienie ze statusem „Dostarczone" lub „Wysłane"\n3. Kliknij „Złóż wniosek o zwrot"\n4. Otrzymasz numer zwrotu i adres do odesłania\n5. Wyślij produkt w oryginalnym opakowaniu\n\nMożesz też napisać na support@wb-partners.pl.',
    category: 'Zwroty',
  },
  {
    keywords: ['reklamacja', 'reklamować', 'uszkodzony', 'wadliwy', 'zepsuty', 'nie działa'],
    question: 'Jak złożyć reklamację?',
    answer: 'Reklamację możesz złożyć na dwa sposoby:\n• W aplikacji: Konto → Moje zamówienia → kliknij zamówienie → „Zgłoś reklamację"\n• Mailowo: support@wb-partners.pl\n\nOpisz problem i dołącz zdjęcia uszkodzonego produktu. Rozpatrzymy reklamację w ciągu 14 dni.',
    category: 'Zwroty',
  },
  {
    keywords: ['ile trwa reklamacja', 'czas reklamacji', 'rozpatrzenie'],
    question: 'Ile trwa rozpatrzenie reklamacji?',
    answer: 'Reklamacja zostaje rozpatrzona w ciągu 14 dni kalendarzowych od jej złożenia. O decyzji poinformujemy Cię mailowo. W przypadku uznania reklamacji oferujemy wymianę, naprawę lub zwrot środków.',
    category: 'Zwroty',
  },
  {
    keywords: ['koszty zwrotu', 'kto płaci za zwrot', 'opłata za zwrot'],
    question: 'Kto pokrywa koszty zwrotu?',
    answer: 'W przypadku odstąpienia od umowy (14 dni) koszty przesyłki zwrotnej ponosi kupujący. W przypadku uznanej reklamacji koszty pokrywa sklep.',
    category: 'Zwroty',
  },

  // ═══ DOSTAWA ═══
  {
    keywords: ['dostawa', 'wysyłka', 'metody dostawy', 'kurier', 'paczkomat', 'inpost', 'dpd'],
    question: 'Jakie są metody dostawy?',
    answer: 'Oferujemy:\n• 📦 Paczkomaty InPost — od 12,99 zł\n• 🚚 Kurier InPost — od 14,99 zł\n• 🚛 Kurier DPD — od 15,99 zł\n• 📐 Wysyłka gabarytowa (duże przedmioty)\n• 🏪 Odbiór osobisty (Outlet)\n\nMetodę dostawy wybierasz dla każdej paczki osobno w kroku 2 zamówienia.',
    category: 'Dostawa',
  },
  {
    keywords: ['ile kosztuje dostawa', 'cena dostawy', 'koszt wysyłki', 'darmowa dostawa', 'za darmo'],
    question: 'Ile kosztuje dostawa i kiedy jest darmowa?',
    answer: 'Koszty wysyłki:\n• Paczkomaty InPost — od 12,99 zł\n• Kurier InPost — od 14,99 zł\n• Kurier DPD — od 15,99 zł\n\n🎉 Dostawa GRATIS przy zamówieniach powyżej 299 zł!\n\nTip: Możesz też zdobyć kupon na darmową dostawę — sprawdź Konto → Moje rabaty.',
    category: 'Dostawa',
  },
  {
    keywords: ['ile trwa dostawa', 'czas dostawy', 'kiedy przyjdzie', 'kiedy dostanę'],
    question: 'Ile trwa dostawa?',
    answer: 'Standardowe czasy dostawy:\n• Paczkomaty InPost — zwykle następnego dnia roboczego\n• Kurier InPost/DPD — 1-2 dni robocze\n• Wysyłka gabarytowa — 2-5 dni roboczych\n\nCzas może się wydłużyć w okresach promocyjnych (Black Friday, Święta).',
    category: 'Dostawa',
  },
  {
    keywords: ['śledzenie przesyłki', 'tracking', 'numer śledzenia', 'gdzie paczka', 'numer paczki'],
    question: 'Jak śledzić przesyłkę?',
    answer: 'Po nadaniu przesyłki:\n1. Otrzymasz e-mail z numerem śledzenia\n2. W aplikacji przejdź do Konto → Moje zamówienia → kliknij zamówienie\n3. W sekcji „Przesyłka" zobaczysz nazwę kuriera, numer śledzenia i klikalny link do śledzenia\n\nMożesz też wkleić numer na stronie InPost lub DPD.',
    category: 'Dostawa',
  },
  {
    keywords: ['paczkomat', 'jak wybrac paczkomat', 'skrytka', 'paczkomat inpost'],
    question: 'Jak wybrać Paczkomat InPost?',
    answer: 'Podczas składania zamówienia w kroku „Dostawa" wybierz „Paczkomat InPost". Otworzy się mapa z paczkomatami w Twojej okolicy. Kliknij wybrany paczkomat na mapie, aby go wybrać. Po nadaniu paczki otrzymasz kod odbioru na e-mail i SMS.',
    category: 'Dostawa',
  },

  // ═══ KUPONY I RABATY ═══
  {
    keywords: ['kupon', 'kod rabatowy', 'zniżka', 'rabat', 'kod promocyjny', 'gdzie kupony', 'moje kupony'],
    question: 'Gdzie znajdę swoje kody rabatowe?',
    answer: 'Wszystkie Twoje kupony znajdziesz w: Konto → Moje rabaty.\n\nZobaczysz tam:\n• Aktywne kupony z kodem do skopiowania\n• Wartość rabatu (%, kwota lub darmowa dostawa)\n• Datę ważności i minimalną kwotę zamówienia\n• Historię wykorzystanych kuponów\n\nKupony możesz też szybko zastosować bezpośrednio w koszyku!',
    category: 'Kupony i Rabaty',
  },
  {
    keywords: ['użyć kuponu', 'wpisać kupon', 'zastosować kupon', 'jak użyć kodu', 'pole kuponu'],
    question: 'Jak użyć kodu rabatowego?',
    answer: 'Kod rabatowy możesz zastosować na dwa sposoby:\n\n1. 📝 Ręcznie: W koszyku wpisz kod w polu „Kod kuponu" i kliknij „Zastosuj"\n2. ⚡ Szybko: W koszyku pod polem kuponu zobaczysz listę swoich dostępnych kuponów — kliknij wybrany, aby zastosować go automatycznie\n\nRabat zostanie natychmiast naliczony.',
    category: 'Kupony i Rabaty',
  },
  {
    keywords: ['zdobyć kupon', 'jak dostać rabat', 'skąd kupony', 'rabaty do zdobycia', 'darmowy kupon'],
    question: 'Jak zdobyć kupony rabatowe?',
    answer: 'W WBTrade masz do dyspozycji kilka źródeł kuponów! Przejdź do Konto → Moje rabaty → sekcja „Rabaty do zdobycia":\n\n🎁 Pobierz aplikację → -5% (kliknij „Odbierz")\n📧 Zapisz się do newslettera → -10%\n⭐ Wystaw pierwszą opinię → -5%\n👥 Poleć znajomemu → -10%\n🎂 Urodzinowy prezent → -15%\n\nNiektóre kupony można odebrać od razu jednym kliknięciem!',
    category: 'Kupony i Rabaty',
  },
  {
    keywords: ['kupon powitalny', 'zniżka powitalna', 'pierwsza zniżka', 'rabat na start'],
    question: 'Czy jest kupon powitalny dla nowych klientów?',
    answer: 'Tak! Nowi klienci mogą otrzymać kupon powitalny na kilka sposobów:\n• -5% za pobranie aplikacji — odbierz go w Konto → Moje rabaty\n• -10% za zapis do newslettera\n\n💡 Nie zaznaczyłeś newslettera przy rejestracji? Nic straconego! Przejdź do Konto → Moje rabaty → sekcja „Rabaty do zdobycia" i kliknij „Zapisz się do newslettera". Kupon -10% nadal na Ciebie czeka!',
    category: 'Kupony i Rabaty',
  },
  {
    keywords: ['newsletter kupon', 'kupon za newsletter', 'newsletter rabat', '-10%', 'nie odebrałem', 'nie wziąłem', 'nie zapisałem', 'przegapiłem', 'nie zaznaczyłem', 'zapomniałem newsletter'],
    question: 'Jak dostać kupon za newsletter?',
    answer: 'Aby otrzymać kupon -10% za newsletter:\n\n📌 Przy rejestracji — zaznacz checkbox „Chcę otrzymywać newsletter"\n\n💡 Przegapiłeś przy rejestracji? Spokojnie! Możesz zapisać się później:\n1. Przejdź do Konto → Moje rabaty\n2. W sekcji „Rabaty do zdobycia" znajdź „Zapisz się do newslettera"\n3. Kliknij „Odbierz" — newsletter zostanie aktywowany\n4. Kupon -10% pojawi się automatycznie na Twoim koncie! 🎉\n\nGotowy kupon znajdziesz w sekcji „Twoje kupony" na tym samym ekranie.',
    category: 'Kupony i Rabaty',
  },
  {
    keywords: ['kupon za opinię', 'rabat za recenzję', 'zniżka za opinię', '-5% opinia'],
    question: 'Jak dostać kupon za wystawienie opinii?',
    answer: 'Za wystawienie pierwszej opinii otrzymasz kupon -5%! Aby wystawić opinię:\n1. Kup produkt i poczekaj na dostawę\n2. Otwórz stronę produktu\n3. Przewiń do sekcji „Opinie"\n4. Kliknij „Dodaj opinię" — oceń produkt gwiazdkami i napisz recenzję\n\nKupon pojawi się automatycznie w Konto → Moje rabaty.',
    category: 'Kupony i Rabaty',
  },

  // ═══ WYSZUKIWANIE I PRZEGLĄDANIE ═══
  {
    keywords: ['szukać', 'wyszukiwarka', 'szukaj', 'znaleźć produkt', 'wyszukać', 'szukanie'],
    question: 'Jak szukać produktów?',
    answer: 'Masz kilka sposobów:\n\n🔍 Zakładka „Szukaj" — na dolnym pasku nawigacji. Wpisz frazę, a zobaczysz podpowiedzi w czasie rzeczywistym (produkty i kategorie).\n\n🔍 Pasek na stronie głównej — kliknij „Czego szukasz?" na górze ekranu głównego.\n\nWyniki możesz sortować (cena, popularność, ocena, nowości) i filtrować po magazynie.',
    category: 'Nawigacja',
  },
  {
    keywords: ['sortowanie', 'sortować', 'po cenie', 'od najtańszego', 'od najdroższego', 'filtrowanie'],
    question: 'Jak sortować i filtrować produkty?',
    answer: 'W wynikach wyszukiwania i na stronach kategorii możesz sortować produkty:\n\n• Trafność / Popularność\n• Najlepiej oceniane\n• Najnowsze\n• Cena: rosnąco ↑ lub malejąco ↓\n• Nazwa A-Z\n\nDodatkowo możesz filtrować produkty po magazynie, aby zamówić z jednego miejsca i zaoszczędzić na wysyłce.',
    category: 'Nawigacja',
  },
  {
    keywords: ['kategorie', 'przeglądać kategorie', 'lista kategorii', 'drzewko kategorii', 'wszystkie kategorie'],
    question: 'Jak przeglądać kategorie produktów?',
    answer: 'Kategorie znajdziesz na kilka sposobów:\n\n1. 🏠 Strona główna — kółka z kategoriami na górze + przycisk „Wszystkie kategorie"\n2. 📂 Ekran kategorii — pełne drzewko kategorii z podkategoriami (3 poziomy zagnieżdżenia)\n\nKategorie: Elektronika, AGD, Dom i ogród, Sport, Moda, Dziecko, Zdrowie, Motoryzacja, Narzędzia, Zabawki i więcej.',
    category: 'Nawigacja',
  },
  {
    keywords: ['strona główna', 'główna', 'co na głównej', 'ekran startowy', 'start'],
    question: 'Co znajdę na stronie głównej?',
    answer: 'Strona główna zawiera:\n\n• 🔍 Pasek wyszukiwania\n• 📂 Kółka szybkich kategorii\n• 🖼️ Banery promocyjne (przesuwane)\n• ⭐ Polecane produkty\n• 🏆 Bestsellery\n• 🌟 Najlepiej oceniane\n• 🆕 Nowości\n• 🎯 Produkt dnia\n• 🥇 Top 3 tego tygodnia\n• 🔄 Odkryj coś dla siebie (nieskończony scroll)\n\nPrzeciągnij w dół, aby odświeżyć zawartość.',
    category: 'Nawigacja',
  },
  {
    keywords: ['historia wyszukiwania', 'ostatnie wyszukiwania', 'usunąć historię', 'wyczyścić wyszukiwanie'],
    question: 'Jak zarządzać historią wyszukiwania?',
    answer: 'W zakładce „Szukaj" zobaczysz swoje ostatnie wyszukiwania (do 15 fraz). Możesz:\n• Kliknąć frazę, aby wyszukać ponownie\n• Usunąć pojedynczą frazę klikając X\n• Usunąć całą historię klikając „Wyczyść"\n\nPod historią znajdziesz też popularne wyszukiwania innych użytkowników.',
    category: 'Nawigacja',
  },

  // ═══ PRODUKT ═══
  {
    keywords: ['strona produktu', 'szczegóły produktu', 'informacje o produkcie', 'opis produktu', 'specyfikacja'],
    question: 'Co znajdę na stronie produktu?',
    answer: 'Strona produktu zawiera:\n\n• 🖼️ Galerię zdjęć (przesuwalną)\n• 💰 Cenę z ewentualną zniżką i ceną Omnibus (najniższa z 30 dni)\n• 📏 Wybór wariantów (kolor, rozmiar itp.)\n• 📦 Status dostępności\n• 🛒 Przycisk „Dodaj do koszyka"\n• ❤️ Przycisk ulubionych\n• 📝 Zakładki: Opis i Specyfikacja\n• ⭐ Opinie klientów z możliwością dodania własnej\n• 📦 Podobne produkty z tego samego magazynu',
    category: 'Produkty',
  },
  {
    keywords: ['omnibus', 'najniższa cena', 'cena omnibus', 'cena z 30 dni'],
    question: 'Co to jest cena Omnibus?',
    answer: 'Cena Omnibus to najniższa cena produktu z ostatnich 30 dni przed obniżką. Wyświetlamy ją zgodnie z dyrektywą UE Omnibus — dzięki temu zawsze wiesz, czy promocja jest rzeczywista. Znajdziesz ją pod ceną produktu na stronie szczegółów.',
    category: 'Produkty',
  },
  {
    keywords: ['warianty', 'rozmiar', 'kolor', 'wariant produktu', 'wersja produktu'],
    question: 'Jak wybrać wariant produktu (kolor, rozmiar)?',
    answer: 'Na stronie produktu, pod ceną, zobaczysz dostępne warianty (np. kolor, rozmiar, pojemność). Kliknij wybrany wariant — cena i dostępność zaktualizują się automatycznie. Niedostępne warianty są wyszarzone.',
    category: 'Produkty',
  },

  // ═══ ULUBIONE ═══
  {
    keywords: ['ulubione', 'wishlist', 'polubione', 'serce', 'dodać do ulubionych', 'zapisać produkt'],
    question: 'Jak dodać produkt do ulubionych?',
    answer: 'Aby dodać produkt do ulubionych, kliknij ikonę ❤️ (serce) na stronie produktu. Wymaga to zalogowania.\n\nWszystkie ulubione produkty znajdziesz w zakładce „Ulubione" (serce na dolnym pasku nawigacji). Stamtąd możesz też szybko dodać produkt do koszyka lub usunąć z ulubionych.',
    category: 'Ulubione',
  },
  {
    keywords: ['lista ulubionych', 'gdzie ulubione', 'moje ulubione'],
    question: 'Gdzie znajdę moje ulubione produkty?',
    answer: 'Twoje ulubione produkty znajdziesz klikając ikonę ❤️ na dolnym pasku nawigacji (zakładka „Ulubione"). Zobaczysz listę wszystkich polubionych produktów z cenami, dostępnością i przyciskiem szybkiego dodawania do koszyka.',
    category: 'Ulubione',
  },

  // ═══ LISTY ZAKUPOWE ═══
  {
    keywords: ['lista zakupowa', 'listy zakupowe', 'stworzyć listę', 'lista produktów', 'moja lista'],
    question: 'Jak korzystać z list zakupowych?',
    answer: 'Listy zakupowe pozwalają organizować produkty w tematyczne zestawy (np. „Prezenty", „Remont kuchni").\n\nAby zarządzać listami: Konto → Listy zakupowe.\n\n• Utwórz nową listę klikając „+"\n• Dodaj produkty do listy ze strony produktu (przycisk „Dodaj do listy")\n• Przeglądaj zawartość klikając na listę\n• Usuwaj niepotrzebne listy',
    category: 'Listy zakupowe',
  },
  {
    keywords: ['dodać do listy', 'dodać na listę zakupową'],
    question: 'Jak dodać produkt do listy zakupowej?',
    answer: 'Na stronie produktu kliknij przycisk „Dodaj do listy" 📋. Pojawi się okno z Twoimi listami zakupowymi — wybierz odpowiednią listę. Jeśli nie masz jeszcze żadnej listy, możesz ją utworzyć w Konto → Listy zakupowe.',
    category: 'Listy zakupowe',
  },

  // ═══ OPINIE ═══
  {
    keywords: ['opinia', 'recenzja', 'ocena', 'gwiazdki', 'dodać opinię', 'napisać opinię'],
    question: 'Jak dodać opinię o produkcie?',
    answer: 'Aby dodać opinię:\n1. Otwórz stronę kupionego produktu\n2. Przewiń do sekcji „Opinie"\n3. Kliknij „Dodaj opinię"\n4. Wybierz ocenę (1-5 gwiazdek)\n5. Wpisz tytuł i treść recenzji\n6. Kliknij „Wyślij"\n\nOpinie mogą dodawać tylko zweryfikowani kupujący. Za pierwszą opinię otrzymasz kupon -5%! ⭐',
    category: 'Opinie',
  },
  {
    keywords: ['moje opinie', 'historia opinii', 'usunąć opinię', 'edytować opinię'],
    question: 'Gdzie znajdę swoje opinie?',
    answer: 'Wszystkie Twoje opinie znajdziesz w Konto → Moje opinie. Zobaczysz:\n• Zdjęcie i nazwę produktu\n• Twoją ocenę gwiazdkową\n• Treść recenzji\n• Datę wystawienia\n• Badge „Zweryfikowany zakup"\n\nMożesz też usunąć swoją opinię klikając ikonę kosza.',
    category: 'Opinie',
  },

  // ═══ KONTO I USTAWIENIA ═══
  {
    keywords: ['konto', 'rejestracja', 'założyć konto', 'zarejestrować', 'nowe konto'],
    question: 'Jak założyć konto?',
    answer: 'Kliknij zakładkę „Konto" na dolnym pasku → „Zarejestruj się". Podaj:\n• Imię i nazwisko\n• Adres e-mail\n• Hasło (min. 8 znaków)\n• Zaznacz akceptację regulaminu\n• Opcjonalnie: zaznacz newsletter (dostaniesz kupon -10%!)\n\nPo rejestracji możesz od razu kupować!',
    category: 'Konto',
  },
  {
    keywords: ['logowanie', 'zalogować', 'nie mogę się zalogować', 'login'],
    question: 'Jak się zalogować?',
    answer: 'Kliknij zakładkę „Konto" na dolnym pasku nawigacji → „Zaloguj się". Wpisz swój e-mail i hasło. Jeśli zapomniałeś hasła, kliknij „Zapomniałem hasła" — otrzymasz link do resetu na e-mail.',
    category: 'Konto',
  },
  {
    keywords: ['zmienić dane', 'edytować profil', 'imię', 'nazwisko', 'telefon', 'dane osobowe'],
    question: 'Jak zmienić dane osobowe?',
    answer: 'Przejdź do Konto → Edytuj profil. Możesz zmienić:\n• Imię i nazwisko\n• Numer telefonu\n• Dane firmowe (nazwa firmy, NIP, adres firmy)\n\nUwaga: Adres e-mail nie może być zmieniony — jest on stałym identyfikatorem konta.',
    category: 'Konto',
  },
  {
    keywords: ['zmienić hasło', 'nowe hasło', 'reset hasła', 'zapomniane hasło', 'nie pamiętam hasła'],
    question: 'Jak zmienić hasło?',
    answer: 'Jeśli jesteś zalogowany: Konto → Zmień hasło → podaj aktualne hasło i ustaw nowe (min. 8 znaków).\n\nJeśli zapomniałeś hasła: Na ekranie logowania kliknij „Zapomniałem hasła" → podaj e-mail → otrzymasz link do resetu hasła.',
    category: 'Konto',
  },
  {
    keywords: ['usunąć konto', 'kasować konto', 'skasować', 'gdpr', 'rodo', 'prywatność'],
    question: 'Jak usunąć konto?',
    answer: 'Aby usunąć konto: Konto → Polityka prywatności → sekcja o usunięciu danych, lub napisz na support@wb-partners.pl.\n\nUsunięcie jest nieodwracalne — wszystkie dane, zamówienia, kupony i opinie zostaną trwale usunięte zgodnie z RODO.',
    category: 'Konto',
  },
  {
    keywords: ['wylogować', 'wylogowanie', 'wyloguj'],
    question: 'Jak się wylogować?',
    answer: 'Przejdź do zakładki „Konto" na dolnym pasku nawigacji. Przewiń na sam dół ekranu — znajdziesz tam czerwony przycisk „Wyloguj się". Po wylogowaniu możesz dalej przeglądać produkty jako gość.',
    category: 'Konto',
  },

  // ═══ MOTYW (DARK/LIGHT MODE) ═══
  {
    keywords: ['motyw', 'ciemny', 'jasny', 'dark mode', 'tryb ciemny', 'tryb nocny', 'zmienić wygląd', 'ustawienia wyglądu'],
    question: 'Jak zmienić motyw aplikacji (ciemny/jasny)?',
    answer: 'Przejdź do Konto → Motyw. Masz 3 opcje:\n\n📱 Automatyczny — aplikacja dostosowuje się do ustawień systemu\n☀️ Jasny — zawsze jasny motyw\n🌙 Ciemny — zawsze ciemny motyw\n\nZmiana jest natychmiastowa, nie wymaga restartu aplikacji.',
    category: 'Ustawienia',
  },

  // ═══ NAWIGACJA PO APLIKACJI ═══
  {
    keywords: ['nawigacja', 'pasek', 'menu', 'zakładki', 'dolny pasek', 'jak poruszać się'],
    question: 'Jak poruszać się po aplikacji?',
    answer: 'Na dole ekranu masz 5 głównych zakładek:\n\n🏠 Główna — strona startowa z produktami i promocjami\n🔍 Szukaj — wyszukiwarka produktów\n❤️ Ulubione — zapisane produkty\n🛒 Koszyk — Twoje zakupy\n👤 Konto — profil, zamówienia, ustawienia\n\nZ poziomu Konto masz dostęp do wszystkich podstron: zamówienia, rabaty, adresy, opinie, listy zakupowe, ustawienia i pomoc.',
    category: 'Nawigacja',
  },
  {
    keywords: ['gdzie znaleźć', 'jak trafić', 'jak wejść', 'nie mogę znaleźć', 'szukam opcji'],
    question: 'Nie mogę znaleźć danej opcji — gdzie szukać?',
    answer: 'Oto mapa najważniejszych funkcji:\n\n• Zamówienia → Konto → Moje zamówienia\n• Kupony → Konto → Moje rabaty\n• Adresy → Konto → Dane do zamówień\n• Opinie → Konto → Moje opinie\n• Listy → Konto → Listy zakupowe\n• Profil → Konto → Edytuj profil\n• Hasło → Konto → Zmień hasło\n• Motyw → Konto → Motyw\n• Pomoc → Konto → Centrum pomocy\n• Kontakt → Konto → Skontaktuj się z nami',
    category: 'Nawigacja',
  },
  {
    keywords: ['produkt dnia', 'polecane', 'bestsellery', 'top produkty', 'nowości', 'odkryj'],
    question: 'Gdzie znajdę produkty polecane, bestsellery i nowości?',
    answer: 'Wszystko na stronie głównej! 🏠 Przewijaj w dół, a zobaczysz:\n\n⭐ Polecane — nasze rekomendacje\n🏆 Bestsellery — najczęściej kupowane\n🌟 Najlepiej oceniane — najwyższe oceny klientów\n🆕 Nowości — ostatnio dodane produkty\n🎯 Produkt dnia — hit cenowy\n🥇 Top 3 tego tygodnia — podium popularności\n🔄 Odkryj coś dla siebie — nieskończony scroll losowych produktów',
    category: 'Nawigacja',
  },
  {
    keywords: ['dane firmowe', 'nip', 'firma', 'dane do faktury'],
    question: 'Gdzie wpisać dane firmowe do faktury?',
    answer: 'Dane firmowe możesz uzupełnić w dwóch miejscach:\n\n1. Konto → Edytuj profil → sekcja „Dane firmowe" (nazwa, NIP, adres)\n2. Przy składaniu zamówienia w kroku „Adres" — zaznacz opcję danych do faktury\n\nDane zostaną zapamiętane na przyszłe zamówienia.',
    category: 'Konto',
  },

  // ═══ NEWSLETTER ═══
  {
    keywords: ['newsletter', 'subskrypcja', 'zapisać się', 'powiadomienia', 'maile', 'rezygnacja newsletter'],
    question: 'Jak zapisać się do newslettera?',
    answer: 'Możesz zapisać się do newslettera na dwa sposoby:\n\n1️⃣ Przy rejestracji — zaznacz checkbox „Chcę otrzymywać newsletter"\n2️⃣ W dowolnym momencie — przejdź do Konto → Moje rabaty → sekcja „Rabaty do zdobycia" → „Zapisz się do newslettera" → kliknij „Odbierz"\n\nKorzyści z newslettera:\n✉️ Kupon -10% od razu po zapisie!\n📢 Informacje o wyprzedażach i nowościach\n🎁 Specjalne oferty tylko dla subskrybentów\n\n💡 Nie zapisałeś się przy rejestracji? Nie szkodzi — wejdź w Moje rabaty i odbierz kupon!',
    category: 'Newsletter',
  },

  // ═══ KONTAKT I POMOC ═══
  {
    keywords: ['kontakt', 'pomoc', 'support', 'obsługa', 'telefon', 'email support', 'napisać', 'numer telefonu'],
    question: 'Jak się z nami skontaktować?',
    answer: 'Masz kilka sposobów na kontakt z nami:\n\n📧 E-mail: support@wb-partners.pl\n📞 Telefon: +48 570 034 367\n📝 Formularz: Konto → Skontaktuj się z nami\n💬 Ten czat — zadaj pytanie!\n\nOdpowiadamy w ciągu 24 godzin w dni robocze.\n\nFirma: WB Partners Sp. z o.o., ul. Słowackiego 24/11, Rzeszów',
    category: 'Kontakt',
  },
  {
    keywords: ['centrum pomocy', 'faq', 'pytania i odpowiedzi', 'pomoc w aplikacji'],
    question: 'Gdzie jest Centrum Pomocy?',
    answer: 'Centrum Pomocy znajdziesz w: Konto → Centrum pomocy. Zawiera ono FAQ podzielone na kategorie:\n\n📦 Zamówienia\n💳 Płatności\n🔄 Zwroty i reklamacje\n🚚 Dostawa\n👤 Konto\n🔒 Bezpieczeństwo\n\nA jeśli nie znajdziesz odpowiedzi — pisz do mnie! 😊',
    category: 'Kontakt',
  },
  {
    keywords: ['regulamin', 'warunki', 'zasady', 'terms'],
    question: 'Gdzie znajdę regulamin?',
    answer: 'Regulamin sklepu znajdziesz w: Konto → Regulamin. Zawiera on warunki sprzedaży, zasady zwrotów, politykę cenową i inne istotne informacje prawne.',
    category: 'Kontakt',
  },
  {
    keywords: ['polityka prywatności', 'dane osobowe', 'rodo', 'cookies', 'ciasteczka'],
    question: 'Gdzie znajdę politykę prywatności?',
    answer: 'Politykę prywatności znajdziesz w: Konto → Polityka prywatności. Zawiera informacje o zbieraniu i przetwarzaniu danych, plikach cookies, Twoich prawach (RODO) i bezpieczeństwie danych.',
    category: 'Kontakt',
  },
  {
    keywords: ['o nas', 'kto prowadzi', 'właściciel', 'firma', 'siedziba'],
    question: 'Kim jesteście? Informacje o firmie',
    answer: 'WBTrade to sklep internetowy prowadzony przez:\n\n🏢 WB Partners Sp. z o.o.\n📍 ul. Słowackiego 24/11, Rzeszów\n🔢 NIP: 5170455185\n📧 support@wb-partners.pl\n📞 +48 570 034 367\n\nWięcej informacji: Konto → O nas.',
    category: 'Kontakt',
  },

  // ═══ PROBLEMY TECHNICZNE ═══
  {
    keywords: ['nie ładuje', 'błąd', 'problem', 'nie działa aplikacja', 'freeze', 'zawiesza się', 'crash'],
    question: 'Aplikacja nie działa poprawnie — co robić?',
    answer: 'Spróbuj tych kroków:\n\n1. 🔄 Wymuś zamknięcie aplikacji i otwórz ponownie\n2. 📶 Sprawdź połączenie z internetem\n3. ⬇️ Przeciągnij ekran w dół, aby odświeżyć dane\n4. 🗑️ Wyczyść cache aplikacji (Ustawienia telefonu → Aplikacje → WBTrade)\n5. 📲 Upewnij się, że masz najnowszą wersję aplikacji\n\nJeśli problem nieustępuje — napisz na support@wb-partners.pl opisując problem.',
    category: 'Pomoc techniczna',
  },
  {
    keywords: ['odświeżyć', 'odśwież', 'przeładować', 'nie pokazuje', 'stare dane'],
    question: 'Jak odświeżyć dane w aplikacji?',
    answer: 'Na większości ekranów możesz odświeżyć dane przeciągając palcem w dół (pull-to-refresh). Dotyczy to m.in. strony głównej, koszyka, ulubionych, zamówień, listy kuponów i wyników wyszukiwania.',
    category: 'Pomoc techniczna',
  },
  {
    keywords: ['wersja aplikacji', 'jaka wersja', 'aktualizacja', 'update'],
    question: 'Jak sprawdzić wersję aplikacji?',
    answer: 'Numer wersji aplikacji znajdziesz na samym dole ekranu Konto (przewiń w dół). Upewnij się, że masz najnowszą wersję — aktualizacje pobierasz z Google Play lub App Store.',
    category: 'Pomoc techniczna',
  },

  // ═══ O BOCIE PIOTREK ═══
  {
    keywords: ['piotrek', 'kim jesteś', 'kim jest piotrek', 'bot', 'chatbot', 'asystent', 'co umiesz', 'jak ci na imię', 'twoje imię'],
    question: 'Kim jest Piotrek?',
    answer: `Jestem ${BOT_NAME} — wirtualny asystent sklepu WBTrade! 🤖\n\nMogę pomóc Ci z:\n• 📦 Zamówieniami — składanie, śledzenie, anulowanie\n• 💳 Płatnościami — metody, bezpieczeństwo, statusy\n• 🚚 Dostawą — metody, koszty, śledzenie paczek\n• 🔄 Zwrotami i reklamacjami\n• 🎁 Kuponami i rabatami\n• 👤 Kontem — rejestracja, logowanie, ustawienia\n• 📱 Nawigacją po aplikacji\n\nJeśli nie znam odpowiedzi — przekieruję Cię do naszego zespołu wsparcia! 😊`,
    category: 'O bocie',
  },
];

// Quick suggestion chips
const QUICK_QUESTIONS = [
  'Kim jest Piotrek?',
  'Jak złożyć zamówienie?',
  'Gdzie moje kupony?',
  'Kupon za newsletter',
  'Jak zwrócić produkt?',
  'Darmowa dostawa',
  'Jak zdobyć kupon?',
  'Jak poruszać się po aplikacji?',
  'Ile trwa dostawa?',
  'Jak dodać opinię?',
  'Dlaczego kilka paczek?',
  'Jak śledzić przesyłkę?',
  'Tryb ciemny',
  'Kontakt z supportem',
];

const FOLLOWUP_MESSAGES = [
  'Czy mogę Ci jeszcze w czymś pomóc? 😊',
  'Masz jeszcze jakieś pytanie? Chętnie pomogę! 💬',
  'Czy jest coś jeszcze, w czym mogę pomóc? 🙂',
  'Potrzebujesz pomocy z czymś innym? Pytaj śmiało!',
];

interface MessageAction {
  label: string;
  icon: 'envelope' | 'phone' | 'external-link' | 'question-circle';
  type: 'email' | 'link';
  payload: string; // email address or URL
  subject?: string;
  body?: string;
}

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  actions?: MessageAction[];
  showSuggestions?: boolean;
}

function findBestAnswer(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return null;

  // ─── Grzecznościowe frazy ───
  const POLITE_RESPONSES: { patterns: string[]; replies: string[] }[] = [
    {
      patterns: ['dziękuję', 'dziekuje', 'dzięki', 'dzieki', 'dzięks', 'thanks', 'thx', 'wielkie dzięki', 'super dzięki', 'dziękuje bardzo', 'dziekuje bardzo', 'bardzo dziękuję'],
      replies: [
        'Nie ma za co! 😊 Cieszę się, że mogłem pomóc. Gdybyś miał jeszcze pytania — pisz śmiało!',
        'Proszę bardzo! 🙌 Zawsze chętnie pomogę. Miłych zakupów w WBTrade!',
        'Cała przyjemność po mojej stronie! 😄 Jeśli coś jeszcze — jestem tutaj.',
        'Nie ma sprawy! ✨ Życzę udanych zakupów!',
      ],
    },
    {
      patterns: ['miłego dnia', 'milego dnia', 'dobrego dnia', 'miłego wieczoru', 'dobrej nocy', 'dobranoc', 'do widzenia', 'pa pa', 'papa', 'nara', 'cześć', 'hej hej', 'trzymaj się', 'do zobaczenia', 'bye'],
      replies: [
        'Miłego dnia! ☀️ Do zobaczenia w WBTrade!',
        'Nawzajem! 😊 Życzę Ci świetnego dnia i udanych zakupów!',
        'Do zobaczenia! 👋 Gdybyś potrzebował pomocy — zawsze tu jestem!',
        'Trzymaj się ciepło! 🌟 Wpadaj do nas kiedy chcesz!',
      ],
    },
    {
      patterns: ['super', 'świetnie', 'extra', 'ekstra', 'bomba', 'git', 'top', 'zajebiste', 'kozak', 'pięknie', 'rewelacja', 'idealnie', 'genialnie', 'wspaniale'],
      replies: [
        'Cieszę się! 🎉 Jeśli potrzebujesz czegoś jeszcze — pytaj!',
        'Super, że mogłem pomóc! 💪 Miłych zakupów!',
        'To miło słyszeć! 😊 Jestem tu, gdybyś potrzebował pomocy.',
      ],
    },
    {
      patterns: ['hej', 'hejka', 'siema', 'elo', 'yo', 'witam', 'witaj', 'cześć', 'czesc', 'dzień dobry', 'dzien dobry', 'dobry wieczór', 'hello', 'hi'],
      replies: [
        `Hej! 👋 Jestem ${BOT_NAME}. W czym mogę Ci dzisiaj pomóc?`,
        `Cześć! 😊 Jestem ${BOT_NAME}, Twój asystent WBTrade. Zadaj mi pytanie!`,
        `Witaj! 🙌 Jak mogę Ci pomóc? Pytaj o zamówienia, dostawę, kupony i więcej!`,
      ],
    },
    {
      patterns: ['ok', 'okej', 'okay', 'dobra', 'jasne', 'rozumiem', 'zrozumiałem', 'spoko', 'w porządku', 'no dobra'],
      replies: [
        'Jasne! 👍 Gdybyś miał jeszcze pytania — pisz śmiało!',
        'Okej! 😊 Jestem tu, jeśli będziesz potrzebować pomocy.',
        'Super! Jeśli coś jeszcze — pytaj bez wahania! 💬',
      ],
    },
  ];

  // Check polite phrases first
  for (const group of POLITE_RESPONSES) {
    for (const pattern of group.patterns) {
      if (q === pattern || q.includes(pattern)) {
        return group.replies[Math.floor(Math.random() * group.replies.length)];
      }
    }
  }

  // Score each FAQ by keyword match
  let bestScore = 0;
  let bestAnswer: typeof FAQ_DATA[0] | null = null;

  for (const faq of FAQ_DATA) {
    let score = 0;
    const words = q.split(/\s+/);

    for (const keyword of faq.keywords) {
      const kw = keyword.toLowerCase();
      // Exact keyword in query
      if (q.includes(kw)) {
        score += kw.length * 3; // longer keywords = more specific
      }
      // Individual words overlap
      for (const w of words) {
        if (w.length >= 3 && kw.includes(w)) {
          score += w.length;
        }
      }
    }

    // Bonus for question text match
    if (faq.question.toLowerCase().includes(q)) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestAnswer = faq;
    }
  }

  if (bestScore >= 6 && bestAnswer) {
    return bestAnswer.answer;
  }

  return null;
}

// ─── Chat Bubble (floating button) ───
export function ChatBubble({ onPress, hasActiveChat }: { onPress: () => void; hasActiveChat?: boolean }) {
  const colors = useThemeColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <View style={bubbleStyles.wrapper}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={[bubbleStyles.container, { backgroundColor: colors.tint, shadowColor: colors.shadow }]}
        >
          <FontAwesome name="comments" size={24} color="#fff" />
          {hasActiveChat && (
            <View style={bubbleStyles.activeDot} />
          )}
        </TouchableOpacity>
        <View style={[bubbleStyles.label, { backgroundColor: colors.card, shadowColor: colors.shadow, borderColor: colors.border }]}>
          <Text style={[bubbleStyles.labelText, { color: colors.text }]}>Zapytaj</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const bubbleStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  activeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

// ─── Chat Modal ───
interface ChatBotModalProps {
  visible: boolean;
  onMinimize: () => void;
  onEndChat: () => void;
}

const INITIAL_MESSAGE: Message = {
  id: '0',
  text: `Cześć! 👋 Jestem ${BOT_NAME} — Twój wirtualny asystent WBTrade. Zadaj mi pytanie dotyczące zamówień, płatności, dostawy, zwrotów lub konta — chętnie pomogę!`,
  isBot: true,
  timestamp: new Date(),
};

export default function ChatBotModal({ visible, onMinimize, onEndChat }: ChatBotModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const noMatchCount = useRef(0);
  const lastUserQuestion = useRef('');

  const hasConversation = messages.length > 1;

  const handleEndChat = useCallback(() => {
    if (!hasConversation) {
      // No conversation — just close
      onEndChat();
      setMessages([{ ...INITIAL_MESSAGE, id: Date.now().toString(), timestamp: new Date() }]);
      setInput('');
      noMatchCount.current = 0;
      return;
    }
    Alert.alert(
      'Zakończyć rozmowę?',
      'Historia czatu zostanie usunięta. Czy na pewno chcesz zakończyć?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zakończ',
          style: 'destructive',
          onPress: () => {
            onEndChat();
            // Reset conversation
            setMessages([{ ...INITIAL_MESSAGE, id: Date.now().toString(), timestamp: new Date() }]);
            setInput('');
            noMatchCount.current = 0;
          },
        },
      ],
    );
  }, [hasConversation, onEndChat]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToEnd();

    // Simulate typing delay
    setTimeout(() => {
      const answer = findBestAnswer(text);
      lastUserQuestion.current = text.trim();

      let botMsg: Message;

      if (answer) {
        noMatchCount.current = 0;
        botMsg = {
          id: (Date.now() + 1).toString(),
          text: answer,
          isBot: true,
          timestamp: new Date(),
        };

        // Add follow-up message after a short delay
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
        scrollToEnd();

        setTimeout(() => {
          setIsTyping(true);
          scrollToEnd();
          setTimeout(() => {
            const followup = FOLLOWUP_MESSAGES[Math.floor(Math.random() * FOLLOWUP_MESSAGES.length)];
            const followupMsg: Message = {
              id: (Date.now() + 2).toString(),
              text: followup,
              isBot: true,
              timestamp: new Date(),
              showSuggestions: true,
            };
            setMessages(prev => [...prev, followupMsg]);
            setIsTyping(false);
            scrollToEnd();
          }, 600 + Math.random() * 400);
        }, 1200);

        return; // already added messages above
      } else {
        noMatchCount.current += 1;

        if (noMatchCount.current === 1) {
          // First miss — suggest rephrasing + offer email
          botMsg = {
            id: (Date.now() + 1).toString(),
            text: 'Hmm, nie jestem pewien odpowiedzi na to pytanie. 🤔\n\nSpróbuj zapytać inaczej lub wyślij wiadomość e-mail do naszego centrum pomocy — odpowiemy w ciągu 24h!',
            isBot: true,
            timestamp: new Date(),
            actions: [
              {
                label: 'Wyślij e-mail do pomocy',
                icon: 'envelope',
                type: 'email',
                payload: 'support@wb-partners.pl',
                subject: `Pytanie z aplikacji: ${text.trim().substring(0, 80)}`,
                body: `Cześć,\n\nMam pytanie:\n\n${text.trim()}\n\nProszę o pomoc.\n\nPozdrawiam`,
              },
            ],
          };
        } else {
          // Repeated miss — stronger suggestion
          botMsg = {
            id: (Date.now() + 1).toString(),
            text: 'Niestety, to pytanie wykracza poza moje możliwości. 😅\n\nZalecam skontaktować się bezpośrednio z naszym zespołem wsparcia — kliknij poniżej, aby wysłać wiadomość e-mail z Twoim pytaniem. Odpowiemy najszybciej jak to możliwe!',
            isBot: true,
            timestamp: new Date(),
            actions: [
              {
                label: '📧 Napisz do centrum pomocy',
                icon: 'envelope',
                type: 'email',
                payload: 'support@wb-partners.pl',
                subject: `Pytanie z aplikacji WBTrade`,
                body: `Cześć,\n\nMam pytanie, z którym bot nie mógł mi pomóc:\n\n${text.trim()}\n\nProszę o odpowiedź.\n\nPozdrawiam`,
              },
            ],
          };
        }
      }

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
      scrollToEnd();
    }, 800 + Math.random() * 600);
  }, [scrollToEnd]);

  const handleQuickQuestion = useCallback((q: string) => {
    sendMessage(q);
  }, [sendMessage]);

  const handleAction = useCallback(async (action: MessageAction) => {
    if (action.type === 'email') {
      const subject = encodeURIComponent(action.subject || 'Pytanie z aplikacji WBTrade');
      const body = encodeURIComponent(action.body || '');
      const mailto = `mailto:${action.payload}?subject=${subject}&body=${body}`;

      try {
        const canOpen = await Linking.canOpenURL(mailto);
        if (canOpen) {
          await Linking.openURL(mailto);
        } else {
          Alert.alert(
            'Brak aplikacji e-mail',
            `Napisz do nas ręcznie na:\n${action.payload}`,
            [{ text: 'OK' }],
          );
        }
      } catch {
        Alert.alert(
          'Brak aplikacji e-mail',
          `Napisz do nas ręcznie na:\n${action.payload}`,
          [{ text: 'OK' }],
        );
      }
    } else if (action.type === 'link') {
      Linking.openURL(action.payload).catch(() => {});
    }
  }, []);

  // Filter out already-asked questions from suggestions
  const getAvailableSuggestions = useCallback(() => {
    const askedTexts = new Set(
      messages.filter(m => !m.isBot).map(m => m.text.toLowerCase().trim()),
    );
    return QUICK_QUESTIONS.filter(
      q => !askedTexts.has(q.toLowerCase()),
    ).slice(0, 6);
  }, [messages]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const availableSuggestions = item.showSuggestions ? getAvailableSuggestions() : [];

    return (
      <View>
        <View style={[styles.messageBubble, item.isBot ? styles.botBubble : styles.userBubble]}>
          {item.isBot && (
            <View style={styles.botAvatarCol}>
              <Image source={WB_LOGO} style={styles.botAvatarLogo} />
            </View>
          )}
          <View style={[styles.messageContent, item.isBot ? styles.botContent : styles.userContent]}>
            {item.isBot && item.id !== '0' && (
              <Text style={styles.botName}>{BOT_NAME}</Text>
            )}
            <Text style={[styles.messageText, item.isBot ? styles.botText : styles.userText]}>
              {item.text}
            </Text>
            {item.actions && item.actions.length > 0 && (
              <View style={styles.actionsContainer}>
                {item.actions.map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.actionButton}
                    onPress={() => handleAction(action)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name={action.icon} size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        {item.showSuggestions && availableSuggestions.length > 0 && (
          <View style={styles.inlineSuggestions}>
            <View style={styles.chipsWrap}>
              {availableSuggestions.map((q) => (
                <TouchableOpacity key={q} style={styles.chip} onPress={() => handleQuickQuestion(q)} activeOpacity={0.7}>
                  <Text style={styles.chipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }, [styles, colors, handleAction, handleQuickQuestion, getAvailableSuggestions]);

  const showInitialChips = messages.length <= 1;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onMinimize}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Image source={WB_LOGO} style={styles.headerLogo} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{BOT_NAME}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            {/* Minimize – keeps conversation */}
            <TouchableOpacity onPress={onMinimize} style={styles.headerBtn} activeOpacity={0.7}>
              <FontAwesome name="minus" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            {/* End chat – resets conversation */}
            <TouchableOpacity onPress={handleEndChat} style={styles.headerBtn} activeOpacity={0.7}>
              <FontAwesome name="times" size={20} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={
              <>
                {isTyping && (
                  <View style={[styles.messageBubble, styles.botBubble]}>
                    <View style={styles.botAvatarCol}>
                      <Image source={WB_LOGO} style={styles.botAvatarLogo} />
                    </View>
                    <View style={[styles.messageContent, styles.botContent]}>
                      <Text style={styles.typingText}>Pisze...</Text>
                    </View>
                  </View>
                )}
                {showInitialChips && (
                  <View style={styles.quickChips}>
                    <Text style={styles.quickLabel}>Popularne pytania:</Text>
                    <View style={styles.chipsWrap}>
                      {QUICK_QUESTIONS.slice(0, 6).map((q) => (
                        <TouchableOpacity key={q} style={styles.chip} onPress={() => handleQuickQuestion(q)} activeOpacity={0.7}>
                          <Text style={styles.chipText}>{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            }
          />

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Napisz pytanie..."
              placeholderTextColor={colors.placeholder}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim()}
              activeOpacity={0.7}
            >
              <FontAwesome name="send" size={16} color={input.trim() ? '#fff' : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  onlineText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Messages
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  botBubble: {
    justifyContent: 'flex-start',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  botAvatarCol: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  botAvatarLogo: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  botName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.tint,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  messageContent: {
    maxWidth: SCREEN_W * 0.72,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botContent: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  userContent: {
    backgroundColor: colors.tint,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  botText: {
    color: colors.text,
  },
  userText: {
    color: '#fff',
  },
  typingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Action buttons inside bot messages
  actionsContainer: {
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.tint,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Quick chips
  quickChips: {
    marginTop: 8,
    paddingLeft: 38,
  },
  inlineSuggestions: {
    marginTop: 10,
    paddingLeft: 38,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.tintLight,
    borderWidth: 1,
    borderColor: colors.tintMuted,
  },
  chipText: {
    fontSize: 13,
    color: colors.tint,
    fontWeight: '500',
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: colors.inputText,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    maxHeight: 44,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.backgroundTertiary,
  },
});
