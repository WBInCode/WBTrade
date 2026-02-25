'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { searchApi } from '../lib/api';

// Bot branding
const BOT_NAME = 'WuBuś';
const WB_LOGO = '/images/wb-trade-bez-tla.png';

// ─── FAQ Knowledge Base ───
const FAQ_DATA: { keywords: string[]; question: string; answer: string; category: string }[] = [
  // ═══ ZAMÓWIENIA ═══
  {
    keywords: ['zamówienie', 'złożyć', 'składanie', 'kupić', 'zakup', 'jak zamówić', 'jak kupić'],
    question: 'Jak złożyć zamówienie?',
    answer: 'Aby złożyć zamówienie:\n1. Dodaj produkty do koszyka\n2. Przejdź do koszyka (ikona 🛒)\n3. Kliknij „Dostawa i płatność"\n4. Podaj adres dostawy\n5. Wybierz metodę wysyłki i płatności\n6. Potwierdź zamówienie\n\nOtrzymasz e-mail z potwierdzeniem.',
    category: 'Zamówienia',
  },
  {
    keywords: ['status', 'śledzić', 'śledzenie', 'gdzie zamówienie', 'sprawdzić zamówienie', 'tracking', 'moje zamówienia'],
    question: 'Jak sprawdzić status zamówienia?',
    answer: 'Przejdź do: Konto → Moje zamówienia. Zobaczysz listę wszystkich zamówień z aktualnym statusem (Nowe → Potwierdzone → W realizacji → Wysłane → Dostarczone). Kliknij w zamówienie, aby zobaczyć szczegóły i numer śledzenia przesyłki.',
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
    answer: 'Fakturę VAT możesz pobrać z zakładki Konto → Moje zamówienia po kliknięciu w dane zamówienie. Ważne: aby otrzymać fakturę na firmę, podaj dane firmy (nazwa, NIP) w kroku „Adres" podczas składania zamówienia lub uzupełnij je w swoim profilu.',
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
    answer: 'Zamówienie przechodzi przez następujące etapy:\n\n1. 📝 Nowe — zamówienie złożone\n2. ✅ Potwierdzone — płatność zweryfikowana\n3. 📦 W realizacji — kompletowane w magazynie\n4. 🚚 Wysłane — przekazane do kuriera\n5. ✔️ Dostarczone — odebrane\n\nCały postęp widzisz w szczegółach zamówienia.',
    category: 'Zamówienia',
  },

  // ═══ KOSZYK I CHECKOUT ═══
  {
    keywords: ['koszyk', 'dodać do koszyka', 'co jest w koszyku', 'produkty w koszyku'],
    question: 'Jak działa koszyk?',
    answer: 'Koszyk znajdziesz klikając ikonę 🛒 w nagłówku strony. Produkty są automatycznie grupowane według magazynów jako osobne paczki (Paczka 1, Paczka 2...). Możesz zmieniać ilość produktów, usuwać je, oraz dodawać kupony rabatowe.',
    category: 'Koszyk',
  },
  {
    keywords: ['paczka', 'magazyn', 'dlaczego kilka paczek', 'kilka przesyłek', 'grupowanie'],
    question: 'Dlaczego moje zamówienie jest podzielone na paczki?',
    answer: 'Produkty w WBTrade pochodzą z różnych magazynów. Każdy magazyn wysyła osobną paczkę, dlatego w koszyku widzisz podział na „Paczka 1", „Paczka 2" itd. Aby zaoszczędzić na wysyłce, dodawaj produkty z tego samego magazynu.',
    category: 'Koszyk',
  },
  {
    keywords: ['checkout', 'realizacja zamówienia', 'kroki zamówienia', 'jak zamówić krok po kroku'],
    question: 'Jak wygląda proces składania zamówienia?',
    answer: 'Proces zamówienia ma 4 kroki:\n\n1. 📍 Adres — podaj dane i adres dostawy\n2. 🚚 Dostawa — wybierz metodę wysyłki dla każdej paczki\n3. 💳 Płatność — wybierz sposób zapłaty\n4. 📋 Podsumowanie — sprawdź wszystko i złóż zamówienie\n\nMożesz się cofać między krokami.',
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
    answer: 'Tak, wszystkie płatności są realizowane przez certyfikowanego operatora Przelewy24 z szyfrowaniem SSL. Nie przechowujemy danych Twoich kart płatniczych.',
    category: 'Płatności',
  },
  {
    keywords: ['zwrot pieniędzy', 'refund', 'oddać pieniądze', 'zwrot środków', 'zwrot na konto'],
    question: 'Jak otrzymać zwrot pieniędzy?',
    answer: 'Zwrot środków następuje automatycznie po zaakceptowaniu zwrotu produktu. Pieniądze wrócą na konto, z którego dokonano płatności w ciągu 5-14 dni roboczych, w zależności od banku.',
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
    answer: 'Reklamację możesz złożyć:\n• Na stronie: Konto → Moje zamówienia → kliknij zamówienie → „Zgłoś reklamację"\n• Mailowo: support@wb-partners.pl\n\nOpisz problem i dołącz zdjęcia uszkodzonego produktu. Rozpatrzymy reklamację w ciągu 14 dni.',
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
    answer: 'Oferujemy:\n• 📦 Paczkomaty InPost — od 12,99 zł\n• 🚚 Kurier InPost — od 14,99 zł\n• 🚛 Kurier DPD — od 15,99 zł\n• 📐 Wysyłka gabarytowa (duże przedmioty)\n• 🏪 Odbiór osobisty (Outlet)',
    category: 'Dostawa',
  },
  {
    keywords: ['ile kosztuje dostawa', 'cena dostawy', 'koszt wysyłki', 'darmowa dostawa', 'za darmo'],
    question: 'Ile kosztuje dostawa i kiedy jest darmowa?',
    answer: 'Koszty wysyłki:\n• Paczkomaty InPost — od 12,99 zł\n• Kurier InPost — od 14,99 zł\n• Kurier DPD — od 15,99 zł\n\n🎉 Dostawa GRATIS przy zamówieniach powyżej 299 zł!',
    category: 'Dostawa',
  },
  {
    keywords: ['ile trwa dostawa', 'czas dostawy', 'kiedy przyjdzie', 'kiedy dostanę'],
    question: 'Ile trwa dostawa?',
    answer: 'Standardowe czasy dostawy:\n• Paczkomaty InPost — zwykle następnego dnia roboczego\n• Kurier InPost/DPD — 1-2 dni robocze\n• Wysyłka gabarytowa — 2-5 dni roboczych\n\nCzas może się wydłużyć w okresach promocyjnych.',
    category: 'Dostawa',
  },
  {
    keywords: ['śledzenie przesyłki', 'tracking', 'numer śledzenia', 'gdzie paczka', 'numer paczki'],
    question: 'Jak śledzić przesyłkę?',
    answer: 'Po nadaniu przesyłki:\n1. Otrzymasz e-mail z numerem śledzenia\n2. Na stronie przejdź do Konto → Moje zamówienia → kliknij zamówienie\n3. W sekcji „Przesyłka" zobaczysz numer śledzenia i link do śledzenia',
    category: 'Dostawa',
  },

  // ═══ KUPONY I RABATY ═══
  {
    keywords: ['kupon', 'kod rabatowy', 'zniżka', 'rabat', 'kod promocyjny', 'gdzie kupony', 'moje kupony'],
    question: 'Gdzie znajdę swoje kody rabatowe?',
    answer: 'Wszystkie Twoje kupony znajdziesz w: Konto → Moje rabaty.\n\nZobaczysz tam:\n• Aktywne kupony z kodem do skopiowania\n• Wartość rabatu (%, kwota lub darmowa dostawa)\n• Datę ważności i minimalną kwotę zamówienia\n\nKupony możesz też szybko zastosować bezpośrednio w koszyku!',
    category: 'Kupony i Rabaty',
  },
  {
    keywords: ['użyć kuponu', 'wpisać kupon', 'zastosować kupon', 'jak użyć kodu', 'pole kuponu'],
    question: 'Jak użyć kodu rabatowego?',
    answer: 'W koszyku wpisz kod w polu „Kod kuponu" i kliknij „Zastosuj". Możesz też kliknąć na dostępny kupon pod polem, aby zastosować go automatycznie. Rabat zostanie natychmiast naliczony.',
    category: 'Kupony i Rabaty',
  },
  {
    keywords: ['zdobyć kupon', 'jak dostać rabat', 'skąd kupony', 'rabaty do zdobycia', 'darmowy kupon'],
    question: 'Jak zdobyć kupony rabatowe?',
    answer: 'Przejdź do Konto → Moje rabaty → sekcja „Rabaty do zdobycia":\n\n📧 Zapisz się do newslettera → -10%\n⭐ Wystaw pierwszą opinię → -5%\n👥 Poleć znajomemu → -10%\n🎂 Urodzinowy prezent → -15%',
    category: 'Kupony i Rabaty',
  },
  {
    keywords: ['newsletter kupon', 'kupon za newsletter', 'newsletter rabat', '-10%', 'nie zapisałem', 'zapomniałem newsletter'],
    question: 'Jak dostać kupon za newsletter?',
    answer: 'Aby otrzymać kupon -10% za newsletter:\n\n📌 Przy rejestracji — zaznacz checkbox „Chcę otrzymywać newsletter"\n\n💡 Przegapiłeś? Przejdź do Konto → Moje rabaty → „Zapisz się do newslettera" → kliknij „Odbierz" — kupon -10% pojawi się automatycznie na Twoim koncie! 🎉',
    category: 'Kupony i Rabaty',
  },

  // ═══ WYSZUKIWANIE ═══
  {
    keywords: ['szukać', 'wyszukiwarka', 'szukaj', 'znaleźć produkt', 'wyszukać', 'szukanie'],
    question: 'Jak szukać produktów?',
    answer: 'Użyj paska wyszukiwania na górze strony. Wpisz frazę, a zobaczysz podpowiedzi w czasie rzeczywistym (produkty i kategorie). Wyniki możesz sortować (cena, popularność, ocena, nowości) i filtrować.',
    category: 'Nawigacja',
  },
  {
    keywords: ['sortowanie', 'sortować', 'po cenie', 'od najtańszego', 'od najdroższego', 'filtrowanie'],
    question: 'Jak sortować i filtrować produkty?',
    answer: 'W wynikach wyszukiwania i na stronach kategorii możesz sortować:\n\n• Trafność / Popularność\n• Najlepiej oceniane\n• Najnowsze\n• Cena: rosnąco ↑ lub malejąco ↓\n• Nazwa A-Z',
    category: 'Nawigacja',
  },

  // ═══ PRODUKT ═══
  {
    keywords: ['strona produktu', 'szczegóły produktu', 'informacje o produkcie', 'opis produktu', 'specyfikacja'],
    question: 'Co znajdę na stronie produktu?',
    answer: 'Strona produktu zawiera:\n\n• 🖼️ Galerię zdjęć\n• 💰 Cenę z ewentualną zniżką i ceną Omnibus\n• 📏 Wybór wariantów (kolor, rozmiar itp.)\n• 📦 Status dostępności\n• 🛒 Przycisk „Dodaj do koszyka"\n• ❤️ Przycisk ulubionych\n• 📝 Opis i Specyfikacja\n• ⭐ Opinie klientów',
    category: 'Produkty',
  },
  {
    keywords: ['omnibus', 'najniższa cena', 'cena omnibus', 'cena z 30 dni'],
    question: 'Co to jest cena Omnibus?',
    answer: 'Cena Omnibus to najniższa cena produktu z ostatnich 30 dni przed obniżką. Wyświetlamy ją zgodnie z dyrektywą UE Omnibus — dzięki temu zawsze wiesz, czy promocja jest rzeczywista.',
    category: 'Produkty',
  },

  // ═══ ULUBIONE ═══
  {
    keywords: ['ulubione', 'wishlist', 'polubione', 'serce', 'dodać do ulubionych', 'zapisać produkt'],
    question: 'Jak dodać produkt do ulubionych?',
    answer: 'Kliknij ikonę ❤️ (serce) na karcie produktu lub na stronie produktu. Wymaga to zalogowania. Wszystkie ulubione produkty znajdziesz na stronie „Ulubione" w swoim koncie.',
    category: 'Ulubione',
  },

  // ═══ OPINIE ═══
  {
    keywords: ['opinia', 'recenzja', 'ocena', 'gwiazdki', 'dodać opinię', 'napisać opinię'],
    question: 'Jak dodać opinię o produkcie?',
    answer: 'Na stronie kupionego produktu przewiń do sekcji „Opinie" i kliknij „Dodaj opinię". Wybierz ocenę (1-5 gwiazdek), wpisz recenzję i wyślij. Za pierwszą opinię otrzymasz kupon -5%! ⭐',
    category: 'Opinie',
  },

  // ═══ KONTO ═══
  {
    keywords: ['konto', 'rejestracja', 'założyć konto', 'zarejestrować', 'nowe konto'],
    question: 'Jak założyć konto?',
    answer: 'Kliknij „Zarejestruj się" w prawym górnym rogu strony. Podaj:\n• Imię i nazwisko\n• Adres e-mail\n• Hasło (min. 8 znaków)\n• Zaznacz akceptację regulaminu\n• Opcjonalnie: zaznacz newsletter (dostaniesz kupon -10%!)\n\nPo rejestracji możesz od razu kupować!',
    category: 'Konto',
  },
  {
    keywords: ['logowanie', 'zalogować', 'nie mogę się zalogować', 'login'],
    question: 'Jak się zalogować?',
    answer: 'Kliknij „Zaloguj się" w prawym górnym rogu strony. Wpisz swój e-mail i hasło. Jeśli zapomniałeś hasła, kliknij „Zapomniałem hasła" — otrzymasz link do resetu na e-mail.',
    category: 'Konto',
  },
  {
    keywords: ['zmienić hasło', 'nowe hasło', 'reset hasła', 'zapomniane hasło', 'nie pamiętam hasła'],
    question: 'Jak zmienić hasło?',
    answer: 'Jeśli jesteś zalogowany: Konto → Zmień hasło.\n\nJeśli zapomniałeś hasła: Na stronie logowania kliknij „Zapomniałem hasła" → podaj e-mail → otrzymasz link do resetu.',
    category: 'Konto',
  },

  // ═══ NEWSLETTER ═══
  {
    keywords: ['newsletter', 'subskrypcja', 'zapisać się', 'powiadomienia', 'maile'],
    question: 'Jak zapisać się do newslettera?',
    answer: 'Możesz zapisać się do newslettera:\n\n1️⃣ Przy rejestracji — zaznacz checkbox „Chcę otrzymywać newsletter"\n2️⃣ W dowolnym momencie — Konto → Moje rabaty → „Zapisz się do newslettera"\n\nKorzyści:\n✉️ Kupon -10% od razu po zapisie!\n📢 Informacje o wyprzedażach i nowościach',
    category: 'Newsletter',
  },

  // ═══ KONTAKT ═══
  {
    keywords: ['kontakt', 'pomoc', 'support', 'obsługa', 'telefon', 'email support', 'napisać', 'numer telefonu'],
    question: 'Jak się z nami skontaktować?',
    answer: 'Masz kilka sposobów na kontakt z nami:\n\n📧 E-mail: support@wb-partners.pl\n📞 Telefon: +48 570 034 367\n💬 Ten czat — zadaj pytanie!\n\nOdpowiadamy w ciągu 24 godzin w dni robocze.\n\nFirma: WB Partners Sp. z o.o., ul. Słowackiego 24/11, Rzeszów',
    category: 'Kontakt',
  },
  {
    keywords: ['regulamin', 'warunki', 'zasady', 'terms'],
    question: 'Gdzie znajdę regulamin?',
    answer: 'Regulamin sklepu znajdziesz na dole strony w stopce lub w Konto → Regulamin.',
    category: 'Kontakt',
  },
  {
    keywords: ['polityka prywatności', 'dane osobowe', 'rodo', 'cookies', 'ciasteczka'],
    question: 'Gdzie znajdę politykę prywatności?',
    answer: 'Politykę prywatności znajdziesz na dole strony w stopce lub w Konto → Polityka prywatności.',
    category: 'Kontakt',
  },
  {
    keywords: ['o nas', 'kto prowadzi', 'właściciel', 'firma', 'siedziba'],
    question: 'Kim jesteście? Informacje o firmie',
    answer: 'WBTrade to sklep internetowy prowadzony przez:\n\n🏢 WB Partners Sp. z o.o.\n📍 ul. Słowackiego 24/11, Rzeszów\n🔢 NIP: 5170455185\n📧 support@wb-partners.pl\n📞 +48 570 034 367',
    category: 'Kontakt',
  },

  // ═══ PROBLEMY TECHNICZNE ═══
  {
    keywords: ['nie ładuje', 'błąd', 'problem', 'nie działa', 'freeze', 'zawiesza się'],
    question: 'Strona nie działa poprawnie — co robić?',
    answer: 'Spróbuj tych kroków:\n\n1. 🔄 Odśwież stronę (F5 lub Ctrl+R)\n2. 📶 Sprawdź połączenie z internetem\n3. 🗑️ Wyczyść cache przeglądarki\n4. 🌐 Spróbuj inną przeglądarkę\n\nJeśli problem nie ustępuje — napisz na support@wb-partners.pl.',
    category: 'Pomoc techniczna',
  },

  // ═══ O BOCIE ═══
  {
    keywords: ['wubuś', 'wubus', 'kim jesteś', 'kim jest wubuś', 'bot', 'chatbot', 'asystent', 'co umiesz', 'jak ci na imię', 'twoje imię'],
    question: 'Kim jest WuBuś?',
    answer: `Jestem ${BOT_NAME} — wirtualny asystent sklepu WBTrade! 🤖\n\nMogę pomóc Ci z:\n• 📦 Zamówieniami — składanie, śledzenie, anulowanie\n• 💳 Płatnościami — metody, bezpieczeństwo\n• 🚚 Dostawą — metody, koszty, śledzenie\n• 🔄 Zwrotami i reklamacjami\n• 🎁 Kuponami i rabatami\n• 👤 Kontem — rejestracja, logowanie\n• 🔍 Wyszukiwaniem produktów\n\nJeśli nie znam odpowiedzi — przekieruję Cię do naszego zespołu wsparcia! 😊`,
    category: 'O bocie',
  },
];

// Quick suggestion chips
const PRODUCT_SEARCH_KEYWORDS = [
  'szukam', 'szukasz', 'znajdź', 'znajdz', 'poszukaj', 'pokaż', 'pokaz',
  'chcę kupić', 'chce kupic', 'interesuje mnie', 'potrzebuję', 'potrzebuje',
  'szukasz produktu', 'szukam produktu', 'wyszukaj', 'polecasz', 'polecisz',
  'jaki produkt', 'jakie produkty', 'co polecasz', 'najlepszy', 'najlepsza', 'najlepsze',
];

const QUICK_QUESTIONS = [
  '🔍 Szukasz produktu?',
  'Kim jest WuBuś?',
  'Jak złożyć zamówienie?',
  'Gdzie moje kupony?',
  'Kupon za newsletter',
  'Jak zwrócić produkt?',
  'Darmowa dostawa',
  'Jak zdobyć kupon?',
  'Ile trwa dostawa?',
  'Jak dodać opinię?',
  'Dlaczego kilka paczek?',
  'Jak śledzić przesyłkę?',
  'Kontakt z supportem',
];

const FOLLOWUP_MESSAGES = [
  'Czy mogę Ci jeszcze w czymś pomóc? 😊',
  'Masz jeszcze jakieś pytanie? Chętnie pomogę! 💬',
  'Czy jest coś jeszcze, w czym mogę pomóc? 🙂',
  'Potrzebujesz pomocy z czymś innym? Pytaj śmiało!',
];

// ─── Types ───
interface MessageAction {
  label: string;
  icon: 'envelope' | 'phone' | 'external-link';
  type: 'email' | 'link';
  payload: string;
  subject?: string;
  body?: string;
}

interface ProductResult {
  id: string;
  name: string;
  price: string | number;
  rating?: string | number;
  reviewCount?: number;
  imageUrl?: string;
}

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  actions?: MessageAction[];
  showSuggestions?: boolean;
  products?: ProductResult[];
}

// ─── FAQ Matching ───
function findBestAnswer(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return null;

  const POLITE_RESPONSES: { patterns: string[]; replies: string[] }[] = [
    {
      patterns: ['dziękuję', 'dziekuje', 'dzięki', 'dzieki', 'dzięks', 'thanks', 'thx', 'wielkie dzięki', 'dziękuje bardzo'],
      replies: [
        'Nie ma za co! 😊 Cieszę się, że mogłem pomóc. Gdybyś miał jeszcze pytania — pisz śmiało!',
        'Proszę bardzo! 🙌 Zawsze chętnie pomogę. Miłych zakupów w WBTrade!',
        'Cała przyjemność po mojej stronie! 😄 Jeśli coś jeszcze — jestem tutaj.',
      ],
    },
    {
      patterns: ['miłego dnia', 'do widzenia', 'pa pa', 'papa', 'nara', 'cześć', 'trzymaj się', 'do zobaczenia', 'bye'],
      replies: [
        'Miłego dnia! ☀️ Do zobaczenia w WBTrade!',
        'Nawzajem! 😊 Życzę Ci świetnego dnia i udanych zakupów!',
        'Do zobaczenia! 👋 Gdybyś potrzebował pomocy — zawsze tu jestem!',
      ],
    },
    {
      patterns: ['super', 'świetnie', 'extra', 'ekstra', 'bomba', 'git', 'top', 'kozak', 'rewelacja', 'idealnie'],
      replies: [
        'Cieszę się! 🎉 Jeśli potrzebujesz czegoś jeszcze — pytaj!',
        'Super, że mogłem pomóc! 💪 Miłych zakupów!',
      ],
    },
    {
      patterns: ['hej', 'hejka', 'siema', 'elo', 'yo', 'witam', 'witaj', 'cześć', 'czesc', 'dzień dobry', 'dzien dobry', 'hello', 'hi'],
      replies: [
        `Hej! 👋 Jestem ${BOT_NAME}. W czym mogę Ci dzisiaj pomóc?`,
        `Cześć! 😊 Jestem ${BOT_NAME}, Twój asystent WBTrade. Zadaj mi pytanie!`,
        `Witaj! 🙌 Jak mogę Ci pomóc? Pytaj o zamówienia, dostawę, kupony i więcej!`,
      ],
    },
    {
      patterns: ['ok', 'okej', 'okay', 'dobra', 'jasne', 'rozumiem', 'spoko', 'w porządku'],
      replies: [
        'Jasne! 👍 Gdybyś miał jeszcze pytania — pisz śmiało!',
        'Okej! 😊 Jestem tu, jeśli będziesz potrzebować pomocy.',
      ],
    },
  ];

  for (const group of POLITE_RESPONSES) {
    for (const pattern of group.patterns) {
      if (q === pattern || q.includes(pattern)) {
        return group.replies[Math.floor(Math.random() * group.replies.length)];
      }
    }
  }

  let bestScore = 0;
  let bestAnswer: typeof FAQ_DATA[0] | null = null;

  for (const faq of FAQ_DATA) {
    let score = 0;
    const words = q.split(/\s+/);

    for (const keyword of faq.keywords) {
      const kw = keyword.toLowerCase();
      if (q.includes(kw)) {
        score += kw.length * 3;
      }
      for (const w of words) {
        if (w.length >= 3 && kw.includes(w)) {
          score += w.length;
        }
      }
    }

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

// ─── Icons (inline SVG) ───
function CommentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 512 512" width="24" height="24">
      <path d="M512 240c0 114.9-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6C73.6 471.1 44.7 480 16 480c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c0 0 0 0 0 0s0 0 0 0s0 0 0 0c0 0 0 0 0 0l.3-.3c.3-.3 .7-.7 1.3-1.4c1.1-1.2 2.8-3.1 4.9-5.7c4.1-5 9.6-12.4 15.2-21.6c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208z"/>
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 512 512" width="16" height="16">
      <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 googl492.3 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.4-16.1-.9-21.9s-16.1-5.4-21.9 .9l-165 176.3-73.3-33.3C124.1 317.4 35.5 311.2 31.9 297.6c-3.6-13.6 3.4-27.8 16.1-33.3L486.8 .4c10.3-4.4 22.3-1.8 29.6 5.2L498.1 5.6z"/>
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 448 512" width="16" height="16">
      <path d="M432 256c0 17.7-14.3 32-32 32H48c-17.7 0-32-14.3-32-32s14.3-32 32-32H400c17.7 0 32 14.3 32 32z"/>
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 384 512" width="16" height="16">
      <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 576 512" width="12" height="12">
      <path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L searching438.5 329 542.7 225.9c8.6-8.4 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 320 512" width="12" height="12">
      <path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/>
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 512 512" width="14" height="14">
      <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/>
    </svg>
  );
}

// ─── Initial message ───
const createInitialMessage = (): Message => ({
  id: '0',
  text: `Cześć! 👋 Jestem ${BOT_NAME} — Twój wirtualny asystent WBTrade. Zadaj mi pytanie dotyczące zamówień, płatności, dostawy, zwrotów lub konta — chętnie pomogę!`,
  isBot: true,
  timestamp: new Date(),
});

// ─── Chat Bubble Component ───
export function ChatBubble({ onClick, hasActiveChat }: { onClick: () => void; hasActiveChat?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onClick}
        className="relative w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 animate-pulse-gentle focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label="Otwórz czat z WuBuś"
      >
        <CommentIcon className="w-6 h-6" />
        {hasActiveChat && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
        )}
      </button>
      <span className="mt-1 px-2 py-0.5 text-[10px] font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        Zapytaj
      </span>
    </div>
  );
}

// ─── Chat Modal Component ───
export default function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([createInitialMessage()]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const noMatchCount = useRef(0);
  const waitingForProductSearch = useRef(false);
  const productSearchRetryCount = useRef(0);

  const hasConversation = messages.length > 1;
  const showInitialChips = messages.length <= 1;

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  const handleOpen = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsOpen(true);
    } else {
      setIsOpen(true);
    }
  }, [isMinimized]);

  const handleMinimize = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(true);
  }, []);

  const handleEndChat = useCallback(() => {
    if (hasConversation) {
      if (!window.confirm('Zakończyć rozmowę? Historia czatu zostanie usunięta.')) return;
    }
    setIsOpen(false);
    setIsMinimized(false);
    setMessages([createInitialMessage()]);
    setInput('');
    noMatchCount.current = 0;
    productSearchRetryCount.current = 0;
  }, [hasConversation]);

  const handleProductSearch = useCallback(async (query: string) => {
    setIsTyping(true);
    scrollToEnd();
    try {
      const result = await searchApi.search(query, { limit: 20 } as any);
      const products = ((result as any).products || [])
        .sort((a: any, b: any) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
        .slice(0, 3);

      if (products.length === 0) {
        productSearchRetryCount.current += 1;
        if (productSearchRetryCount.current < 2) {
          waitingForProductSearch.current = true;
          const retryMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `Niestety, nie znalazłem produktów dla "${query}" 😔\n\nSpróbuj wpisać inną frazę — np. krótsze słowo kluczowe, nazwę kategorii lub markę produktu.`,
            isBot: true,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, retryMsg]);
        } else {
          productSearchRetryCount.current = 0;
          const noResultMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `Niestety, nie znalazłem też produktów dla "${query}" 😔\n\nSpróbuj skorzystać z wyszukiwarki na górze strony!`,
            isBot: true,
            timestamp: new Date(),
            showSuggestions: true,
          };
          setMessages(prev => [...prev, noResultMsg]);
        }
      } else {
        productSearchRetryCount.current = 0;
        const productResults: ProductResult[] = products.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          rating: p.rating,
          reviewCount: p.reviewCount,
          imageUrl: p.images?.[0]?.url,
        }));

        const resultMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: `Oto ${products.length} najlepiej oceniane produkty dla "${query}" ⭐`,
          isBot: true,
          timestamp: new Date(),
          products: productResults,
        };
        setMessages(prev => [...prev, resultMsg]);

        setTimeout(() => {
          setIsTyping(true);
          scrollToEnd();
          setTimeout(() => {
            const followupMsg: Message = {
              id: (Date.now() + 2).toString(),
              text: 'Kliknij w produkt, żeby zobaczyć szczegóły! 😊 Mogę też wyszukać coś innego — wystarczy napisać!',
              isBot: true,
              timestamp: new Date(),
              showSuggestions: true,
            };
            setMessages(prev => [...prev, followupMsg]);
            setIsTyping(false);
            scrollToEnd();
          }, 500);
        }, 800);
      }
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Ups, coś poszło nie tak przy wyszukiwaniu 😅 Spróbuj ponownie za chwilę!',
        isBot: true,
        timestamp: new Date(),
        showSuggestions: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      scrollToEnd();
    }
  }, [scrollToEnd]);

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

    if (waitingForProductSearch.current) {
      waitingForProductSearch.current = false;
      handleProductSearch(text.trim());
      return;
    }

    const lowerText = text.trim().toLowerCase();
    const isProductSearchIntent = PRODUCT_SEARCH_KEYWORDS.some(kw => lowerText.includes(kw)) ||
      lowerText === '🔍 szukasz produktu?' || lowerText === 'szukasz produktu?';

    if (isProductSearchIntent) {
      const isQuickQuestionTap = lowerText === '🔍 szukasz produktu?' ||
        lowerText === 'szukasz produktu?' || lowerText === 'szukasz produktu';

      let searchQuery = lowerText;
      const sortedKeywords = [...PRODUCT_SEARCH_KEYWORDS].sort((a, b) => b.length - a.length);
      for (const kw of sortedKeywords) {
        searchQuery = searchQuery.replace(kw, '').trim();
      }
      searchQuery = searchQuery.replace(/[?!.,🔍]/g, '').trim();

      if (!isQuickQuestionTap && searchQuery.length >= 2) {
        handleProductSearch(searchQuery);
        return;
      } else {
        setTimeout(() => {
          waitingForProductSearch.current = true;
          productSearchRetryCount.current = 0;
          const askMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Jasne! 🔍 Napisz czego szukasz, a znajdę dla Ciebie 3 najlepiej oceniane produkty!\n\nNp. "głośnik bluetooth", "frytkownica", "kamera" itp.',
            isBot: true,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, askMsg]);
          setIsTyping(false);
          scrollToEnd();
        }, 600);
        return;
      }
    }

    setTimeout(() => {
      const answer = findBestAnswer(text);
      let botMsg: Message;

      if (answer) {
        noMatchCount.current = 0;
        botMsg = {
          id: (Date.now() + 1).toString(),
          text: answer,
          isBot: true,
          timestamp: new Date(),
        };

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
        return;
      } else {
        noMatchCount.current += 1;

        if (noMatchCount.current === 1) {
          botMsg = {
            id: (Date.now() + 1).toString(),
            text: 'Hmm, nie jestem pewien odpowiedzi na to pytanie. 🤔\n\nSpróbuj zapytać inaczej lub wyślij wiadomość e-mail do naszego centrum pomocy — odpowiemy w ciągu 24h!',
            isBot: true,
            timestamp: new Date(),
            actions: [{
              label: 'Wyślij e-mail do pomocy',
              icon: 'envelope',
              type: 'email',
              payload: 'support@wb-partners.pl',
              subject: `Pytanie ze strony: ${text.trim().substring(0, 80)}`,
              body: `Cześć,\n\nMam pytanie:\n\n${text.trim()}\n\nProszę o pomoc.\n\nPozdrawiam`,
            }],
          };
        } else {
          botMsg = {
            id: (Date.now() + 1).toString(),
            text: 'Niestety, to pytanie wykracza poza moje możliwości. 😅\n\nZalecam skontaktować się bezpośrednio z naszym zespołem wsparcia!',
            isBot: true,
            timestamp: new Date(),
            actions: [{
              label: '📧 Napisz do centrum pomocy',
              icon: 'envelope',
              type: 'email',
              payload: 'support@wb-partners.pl',
              subject: 'Pytanie ze strony WBTrade',
              body: `Cześć,\n\nMam pytanie, z którym bot nie mógł mi pomóc:\n\n${text.trim()}\n\nProszę o odpowiedź.\n\nPozdrawiam`,
            }],
          };
        }
      }

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
      scrollToEnd();
    }, 800 + Math.random() * 600);
  }, [scrollToEnd, handleProductSearch]);

  const handleAction = useCallback((action: MessageAction) => {
    if (action.type === 'email') {
      const subject = encodeURIComponent(action.subject || 'Pytanie ze strony WBTrade');
      const body = encodeURIComponent(action.body || '');
      window.open(`mailto:${action.payload}?subject=${subject}&body=${body}`, '_blank');
    } else if (action.type === 'link') {
      window.open(action.payload, '_blank');
    }
  }, []);

  const getAvailableSuggestions = useCallback(() => {
    const askedTexts = new Set(
      messages.filter(m => !m.isBot).map(m => m.text.toLowerCase().trim()),
    );
    return QUICK_QUESTIONS.filter(
      q => q === '🔍 Szukasz produktu?' || !askedTexts.has(q.toLowerCase()),
    ).slice(0, 6);
  }, [messages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleMinimize();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleMinimize]);

  return (
    <>
      {/* Floating Bubble */}
      <div className="fixed bottom-6 right-6 z-50" style={{ zIndex: 9999 }}>
        {!isOpen && (
          <ChatBubble onClick={handleOpen} hasActiveChat={isMinimized && hasConversation} />
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-slide-up"
          style={{ zIndex: 9999 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center overflow-hidden">
                <Image src={WB_LOGO} alt="WuBuś" width={28} height={28} className="object-contain" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{BOT_NAME}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMinimize}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Minimalizuj"
              >
                <MinusIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={handleEndChat}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                aria-label="Zamknij czat"
              >
                <XIcon className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onAction={handleAction}
                onQuickQuestion={sendMessage}
                availableSuggestions={msg.showSuggestions ? getAvailableSuggestions() : []}
              />
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center overflow-hidden shrink-0">
                  <Image src={WB_LOGO} alt="" width={18} height={18} className="object-contain" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <span className="text-sm text-gray-400 dark:text-gray-500 italic">Pisze...</span>
                </div>
              </div>
            )}

            {/* Initial chips */}
            {showInitialChips && (
              <div className="pl-9 pt-1">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">Popularne pytania:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.slice(0, 6).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napisz pytanie..."
              className="flex-1 px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-400 bg-orange-500 hover:bg-orange-600 text-white disabled:cursor-not-allowed"
              aria-label="Wyślij"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Message Bubble Sub-Component ───
function MessageBubble({
  message,
  onAction,
  onQuickQuestion,
  availableSuggestions,
}: {
  message: Message;
  onAction: (action: MessageAction) => void;
  onQuickQuestion: (q: string) => void;
  availableSuggestions: string[];
}) {
  if (message.isBot) {
    return (
      <>
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center overflow-hidden shrink-0">
            <Image src={WB_LOGO} alt="" width={18} height={18} className="object-contain" />
          </div>
          <div className="max-w-[72%] bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
            {message.id !== '0' && (
              <p className="text-[11px] font-bold text-orange-500 dark:text-orange-400 mb-0.5 tracking-wide">{BOT_NAME}</p>
            )}
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">{message.text}</p>

            {/* Product results */}
            {message.products && message.products.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {message.products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center gap-2.5 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-14 h-14 rounded-lg object-contain bg-white dark:bg-gray-800"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                        📷
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">{product.name}</p>
                      <p className="text-sm font-bold text-orange-500 dark:text-orange-400 mt-0.5">{Number(product.price).toFixed(2)} zł</p>
                      {product.rating && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <StarIcon className="w-3 h-3 text-amber-400" />
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {Number(product.rating).toFixed(1)}{product.reviewCount ? ` (${product.reviewCount})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRightIcon className="w-3 h-3 text-gray-400 group-hover:text-orange-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}

            {/* Action buttons */}
            {message.actions && message.actions.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {message.actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAction(action)}
                    className="flex items-center gap-2 w-full px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <EnvelopeIcon className="w-3.5 h-3.5" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inline suggestions */}
        {availableSuggestions.length > 0 && (
          <div className="pl-9 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {availableSuggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => onQuickQuestion(q)}
                  className="px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  // User message
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] bg-orange-500 rounded-2xl rounded-br-sm px-3.5 py-2.5">
        <p className="text-sm text-white leading-relaxed">{message.text}</p>
      </div>
    </div>
  );
}
