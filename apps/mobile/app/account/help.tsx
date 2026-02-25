import React, { useState, useMemo } from 'react';
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
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Answer data type ───
type HelpItem = {
  question: string;
  answer: { heading?: string; lines: string[]; type?: string }[];
};

// ─── Help categories with full answers from website ───
const CATEGORIES: {
  icon: string;
  title: string;
  items: HelpItem[];
}[] = [
  {
    icon: 'shopping-bag',
    title: 'Zamówienia',
    items: [
      {
        question: 'Jak złożyć zamówienie?',
        answer: [
          {
            lines: ['Składanie zamówień w WB Trade jest proste i intuicyjne. Poniżej znajdziesz szczegółową instrukcję krok po kroku.'],
          },
          {
            heading: 'Krok po kroku',
            lines: [
              '1. Znajdź produkt – użyj wyszukiwarki, przeglądaj kategorie lub sprawdź promocje',
              '2. Dodaj do koszyka – wybierz wariant (rozmiar, kolor), określ ilość i kliknij „Dodaj do koszyka"',
              '3. Przejdź do koszyka – sprawdź zawartość, zmień ilość lub usuń produkty',
              '4. Wypełnij dane dostawy – imię, nazwisko, adres lub punkt odbioru, telefon, e-mail',
              '5. Wybierz metodę dostawy – Kurier InPost, Paczkomat InPost lub wysyłka gabaryt',
              '6. Wybierz metodę płatności – BLIK, karta, przelew online (PayU) lub płatność przy odbiorze',
              '7. Potwierdź zamówienie – sprawdź podsumowanie, zaakceptuj regulamin i kliknij „Złóż zamówienie"',
            ],
          },
          {
            lines: ['💡 Załóż konto, aby śledzić zamówienia, zapisać adresy dostawy i otrzymywać spersonalizowane oferty.'],
          },
        ],
      },
      {
        question: 'Jak sprawdzić status zamówienia?',
        answer: [
          {
            heading: 'Dla zalogowanych użytkowników',
            lines: [
              '1. Zaloguj się na swoje konto',
              '2. Przejdź do sekcji „Moje konto" → „Zamówienia"',
              '3. Znajdź zamówienie na liście',
              '4. Kliknij „Szczegóły" aby zobaczyć pełne informacje',
            ],
          },
          {
            heading: 'Dla gości (bez konta)',
            lines: [
              '1. Otwórz e-mail z potwierdzeniem zamówienia',
              '2. Kliknij link „Śledź zamówienie"',
              '3. Lub wpisz numer zamówienia i adres e-mail na stronie śledzenia',
            ],
          },
          {
            heading: 'Znaczenie statusów',
            lines: [
              '• Oczekuje na płatność – zamówienie złożone, oczekujemy na potwierdzenie płatności',
              '• Opłacone – płatność potwierdzona, zamówienie czeka na realizację',
              '• W realizacji – zamówienie jest przygotowywane do wysyłki',
              '• Wysłane – paczka przekazana kurierowi, możesz śledzić przesyłkę',
              '• Dostarczone – zamówienie dostarczone do odbiorcy',
              '• Anulowane – zamówienie zostało anulowane',
            ],
          },
          {
            lines: ['💡 Sprawdź folder SPAM jeśli nie otrzymujesz powiadomień. Dodaj nasz adres do kontaktów.'],
          },
        ],
      },
      {
        question: 'Jak anulować zamówienie?',
        answer: [
          {
            lines: ['Możesz anulować zamówienie, jeśli nie zostało jeszcze wysłane.'],
          },
          {
            heading: 'Kiedy można anulować?',
            lines: [
              '✅ Zamówienia oczekujące na płatność',
              '✅ Zamówienia opłacone (przed wysyłką)',
              '✅ Zamówienia w trakcie kompletowania',
              '❌ Zamówienia już wysłane',
              '❌ Zamówienia w trakcie dostawy',
              '❌ Zamówienia dostarczone',
            ],
          },
          {
            heading: 'Jak anulować – krok po kroku',
            lines: [
              '1. Zaloguj się na swoje konto w WB Trade',
              '2. Przejdź do sekcji „Moje konto" → „Zamówienia"',
              '3. Znajdź zamówienie, które chcesz anulować',
              '4. Kliknij przycisk „Szczegóły"',
              '5. Wybierz opcję „Anuluj zamówienie"',
              '6. Podaj powód anulowania (opcjonalnie)',
              '7. Potwierdź anulowanie',
            ],
          },
          {
            heading: 'Zwrot pieniędzy po anulowaniu',
            lines: [
              '• Płatność kartą: zwrot w ciągu 5-10 dni roboczych',
              '• BLIK / przelew: zwrot w ciągu 3-5 dni roboczych',
              'Zwrot zostanie wykonany tą samą metodą płatności, którą użyto przy składaniu zamówienia.',
            ],
          },
          {
            lines: ['⚠️ Po wysłaniu zamówienia nie można go anulować. W takim przypadku możesz skorzystać z prawa do zwrotu w ciągu 14 dni od otrzymania przesyłki.'],
          },
        ],
      },
      {
        question: 'Jak otrzymać fakturę?',
        answer: [
          {
            heading: 'Podczas składania zamówienia',
            lines: [
              '1. W formularzu zamówienia zaznacz opcję „Chcę otrzymać fakturę VAT"',
              '2. Uzupełnij adres rozliczeniowy z danymi firmy (nazwa firmy, NIP)',
              '3. Dokończ składanie zamówienia',
              '4. Po opłaceniu zamówienia faktura będzie dostępna do pobrania w panelu klienta',
            ],
          },
          {
            heading: 'Po złożeniu zamówienia',
            lines: [
              'Jeśli zapomniałeś zaznaczyć opcji faktury przy zamówieniu:',
              '1. Skontaktuj się z nami w ciągu 7 dni od zakupu',
              '2. Podaj numer zamówienia i dane do faktury (NIP, nazwa firmy, adres)',
              '3. Faktura zostanie wystawiona i udostępniona do pobrania w panelu klienta',
            ],
          },
          {
            heading: 'Wymagane dane do faktury',
            lines: [
              '• Nazwa firmy – pełna nazwa zgodna z rejestrem',
              '• NIP – 10-cyfrowy numer identyfikacji podatkowej',
              '• Adres siedziby – ulica, numer, kod pocztowy, miasto',
              '• E-mail – na który wyślemy fakturę w formacie PDF',
            ],
          },
          {
            heading: 'Gdzie znajdę fakturę?',
            lines: [
              'Panel klienta: Zaloguj się → Moje konto → Zamówienia → Pobierz fakturę (widoczne tylko jeśli zaznaczyłeś opcję faktury przy zamówieniu i zamówienie jest opłacone)',
            ],
          },
          {
            heading: 'Rodzaje dokumentów',
            lines: [
              '• Paragon fiskalny – wystawiany standardowo dla zamówień bez żądania faktury, dołączany do paczki',
              '• Faktura VAT – wystawiana na życzenie klienta, zawiera dane firmy i NIP nabywcy',
              '• Faktura korygująca – wystawiana w przypadku zwrotu towaru lub błędnych danych na fakturze',
            ],
          },
          {
            heading: 'Korekta faktury',
            lines: [
              'Jeśli dane na fakturze są błędne, skontaktuj się z nami podając:',
              '• Numer faktury do korekty',
              '• Dane, które wymagają poprawy',
              '• Prawidłowe dane',
            ],
          },
          {
            lines: ['⚠️ Zgodnie z przepisami, nie możemy wystawić faktury na firmę jeśli wcześniej został wystawiony paragon bez NIP. Zadbaj o podanie danych do faktury przed złożeniem zamówienia.'],
          },
          {
            lines: ['💡 Jako zalogowany użytkownik możesz zapisać dane do faktury w profilu – będą automatycznie uzupełniane przy kolejnych zamówieniach.'],
          },
        ],
      },
    ],
  },
  {
    icon: 'credit-card',
    title: 'Płatności',
    items: [
      {
        question: 'Jakie metody płatności są dostępne?',
        answer: [
          {
            lines: ['W WB Trade oferujemy wiele bezpiecznych i wygodnych metod płatności.'],
          },
          {
            heading: 'Szybkie płatności online',
            lines: [
              '• BLIK – najszybsza płatność mobilna. Wpisz 6-cyfrowy kod z aplikacji bankowej',
              '• Karty płatnicze – Visa, Mastercard, Maestro. Bezpieczne płatności z 3D Secure',
              '• Przelewy online – płać bezpośrednio ze swojego banku przez PayU',
              '• Google Pay / Apple Pay – płać jednym kliknięciem używając portfela cyfrowego',
            ],
          },
          {
            heading: 'Płatności odroczone i raty',
            lines: [
              '• PayPo – kup teraz, zapłać za 30 dni bez odsetek (min. 40 zł)',
              '• Raty PayU – rozłóż płatność na wygodne raty, decyzja online w kilka minut',
            ],
          },
          {
            heading: 'Inne metody',
            lines: [
              '• Przelew tradycyjny – realizacja po zaksięgowaniu wpłaty (1-2 dni robocze)',
              '• Za pobraniem – zapłać kurierowi przy odbiorze paczki (dodatkowa opłata: 5 zł)',
            ],
          },
          {
            lines: ['💡 Najszybszą metodą płatności jest BLIK – zamówienie zostanie zrealizowane natychmiast po potwierdzeniu płatności.'],
          },
        ],
      },
      {
        question: 'Czy płatności są bezpieczne?',
        answer: [
          {
            lines: ['W WB Trade bezpieczeństwo Twoich zakupów i danych jest dla nas priorytetem.'],
          },
          {
            heading: 'Jak chronimy Twoje płatności',
            lines: [
              '• Wszystkie płatności są szyfrowane (SSL/TLS)',
              '• Współpracujemy z certyfikowanym operatorem PayU',
              '• Płatności kartą chronione przez 3D Secure',
              '• Nie przechowujemy danych kart płatniczych',
            ],
          },
          {
            heading: 'Nasze certyfikaty i standardy',
            lines: [
              '• PCI DSS – standard bezpieczeństwa danych kart płatniczych',
              '• RODO/GDPR – zgodność z przepisami o ochronie danych osobowych',
              '• Trusted Shops – certyfikat zaufanego sklepu internetowego',
              '• Regularne audyty bezpieczeństwa – zewnętrzne kontrole zabezpieczeń',
            ],
          },
          {
            heading: 'Twoje gwarancje jako kupującego',
            lines: [
              '• Gwarancja dostawy – jeśli paczka nie dotrze, zwrócimy pieniądze lub wyślemy nową',
              '• 14 dni na zwrot – prawo do zwrotu bez podania przyczyny',
              '• Rękojmia 2 lata – odpowiedzialność sprzedawcy za wady produktu',
              '• Ochrona kupującego – pomożemy w sporach ze sprzedawcą',
            ],
          },
        ],
      },
      {
        question: 'Problemy z płatnością',
        answer: [
          {
            heading: 'Płatność została odrzucona',
            lines: [
              'Możliwe przyczyny:',
              '• Niewystarczające środki na koncie',
              '• Przekroczony limit dzienny karty',
              '• Karta wygasła lub jest zablokowana',
              '• Błędne dane karty (numer, data, CVV)',
              '• Bank odrzucił transakcję (brak autoryzacji 3D Secure)',
            ],
          },
          {
            heading: 'Co zrobić?',
            lines: [
              '• Sprawdź stan konta i limit dzienny',
              '• Upewnij się, że karta jest aktywna',
              '• Spróbuj innej metody płatności (np. BLIK)',
              '• Skontaktuj się z bankiem w sprawie odblokowania',
            ],
          },
          {
            heading: 'BLIK nie działa',
            lines: [
              '• Upewnij się, że masz aktywny BLIK w aplikacji bankowej',
              '• Sprawdź, czy wpisałeś prawidłowy 6-cyfrowy kod',
              '• Kod BLIK jest ważny tylko 2 minuty – wygeneruj nowy',
              '• Potwierdź transakcję w aplikacji mobilnej banku',
              '• Sprawdź czy masz wystarczające środki na koncie',
            ],
          },
          {
            heading: 'Pobrano pieniądze, ale zamówienie nie zostało złożone',
            lines: [
              '1. Sprawdź folder SPAM w skrzynce e-mail',
              '2. Zaloguj się na konto i sprawdź sekcję „Zamówienia"',
              '3. Poczekaj 15-30 minut – czasem potwierdzenie jest opóźnione',
              '4. Jeśli zamówienia nadal nie ma – skontaktuj się z nami',
              '⚠️ Pieniądze są czasami tylko zablokowane (nie pobrane). Blokada zostanie automatycznie zwolniona w ciągu 7 dni.',
            ],
          },
          {
            heading: 'Strona płatności się nie ładuje',
            lines: [
              '• Wyczyść cache i cookies przeglądarki',
              '• Wyłącz blokady reklam (AdBlock) dla naszej strony',
              '• Spróbuj w innej przeglądarce lub trybie incognito',
              '• Sprawdź połączenie internetowe',
              '• Odśwież stronę i spróbuj ponownie',
            ],
          },
          {
            heading: 'Problemy z PayPo lub ratami',
            lines: [
              '• PayPo: minimalna kwota zamówienia to 40 zł',
              '• Raty: wymagana jest pozytywna weryfikacja kredytowa',
              '• Sprawdź, czy podane dane osobowe są poprawne',
              '• W razie odrzucenia – skontaktuj się bezpośrednio z PayPo lub PayU',
            ],
          },
          {
            lines: ['💡 Jeśli przypadkowo zapłaciłeś dwa razy za to samo zamówienie, skontaktuj się z nami. Nadpłata zostanie zwrócona w ciągu 5-7 dni roboczych.'],
          },
        ],
      },
      {
        question: 'Jak otrzymać zwrot pieniędzy?',
        answer: [
          {
            heading: 'Kiedy otrzymam zwrot?',
            lines: [
              'Zwrot pieniędzy realizujemy po:',
              '• Anulowaniu zamówienia (przed wysyłką)',
              '• Otrzymaniu zwróconego towaru i pozytywnej weryfikacji',
              '• Rozpatrzeniu reklamacji na korzyść klienta',
              '• Wykryciu nadpłaty na zamówieniu',
            ],
          },
          {
            heading: 'Czas realizacji zwrotu',
            lines: [
              '• BLIK: 1-3 dni robocze',
              '• Karta płatnicza (Visa, Mastercard): 5-10 dni roboczych',
              '• Przelew online: 3-5 dni roboczych',
              '• Google Pay / Apple Pay: 5-10 dni roboczych',
              '• PayPo: automatyczne anulowanie zobowiązania',
              '• Przelew tradycyjny: 3-5 dni roboczych',
            ],
          },
          {
            heading: 'Na jakie konto otrzymam zwrot?',
            lines: [
              'Zwrot realizujemy TĄ SAMĄ METODĄ PŁATNOŚCI, którą użyto przy zamówieniu:',
              '• Karta: na kartę, z której wykonano płatność',
              '• BLIK/Przelew: na konto bankowe, z którego wysłano przelew',
              '• Za pobraniem: na konto wskazane w formularzu zwrotu',
            ],
          },
          {
            lines: ['💡 Przy płatności kartą zwrot może najpierw pojawić się jako „oczekująca transakcja" zanim zostanie zaksięgowany.'],
          },
        ],
      },
    ],
  },
  {
    icon: 'refresh',
    title: 'Zwroty i reklamacje',
    items: [
      {
        question: 'Jak złożyć zwrot?',
        answer: [
          {
            lines: ['Masz 14 dni kalendarzowych od dnia otrzymania przesyłki na odstąpienie od umowy bez podania przyczyny.'],
          },
          {
            heading: 'Warunki zwrotu',
            lines: [
              '• Towar musi być nieużywany i w stanie nienaruszonym',
              '• Produkt powinien znajdować się w oryginalnym opakowaniu',
              '• Należy dołączyć wszystkie akcesoria i dokumentację',
              '• Metki i plomby nie mogą być usunięte (dotyczy odzieży)',
              '• Towar nie może nosić śladów użytkowania',
            ],
          },
          {
            heading: 'Jak dokonać zwrotu',
            lines: [
              '1. Zgłoś zwrot: Zaloguj się → Moje zamówienia → Wybierz zamówienie → „Zwróć produkt"',
              '2. Wypełnij formularz: podaj powód zwrotu i wybierz produkty do zwrotu',
              '3. Wydrukuj etykietę: pobierz i wydrukuj etykietę zwrotną (jeśli dostępna)',
              '4. Zapakuj towar: starannie zapakuj produkty w karton',
              '5. Nadaj przesyłkę: wyślij paczkę na podany adres',
            ],
          },
          {
            heading: 'Zwrot pieniędzy',
            lines: [
              '• Zwrot realizujemy w ciągu 14 dni od otrzymania towaru',
              '• Pieniądze zwracamy tą samą metodą, którą zapłacono',
              '• Zwracamy pełną kwotę za towar + koszt najtańszej dostawy (przy całkowitym zwrocie)',
            ],
          },
          {
            lines: ['💡 Zachowaj dowód nadania przesyłki zwrotnej do momentu otrzymania potwierdzenia przyjęcia zwrotu i zwrotu pieniędzy.'],
          },
        ],
      },
      {
        question: 'Jak złożyć reklamację?',
        answer: [
          {
            heading: 'Kiedy możesz złożyć reklamację?',
            lines: [
              '• Produkt ma wadę fabryczną',
              '• Towar jest uszkodzony (nie z Twojej winy)',
              '• Produkt nie działa zgodnie z opisem',
              '• Otrzymałeś inny produkt niż zamawiany',
              '• Produkt uległ awarii w okresie gwarancji',
            ],
          },
          {
            heading: 'Twoje prawa',
            lines: [
              '• Rękojmia (2 lata) – odpowiedzialność sprzedawcy za wady towaru',
              '• Gwarancja producenta – dodatkowe uprawnienia, czas zależy od produktu',
            ],
          },
          {
            heading: 'Jak złożyć reklamację – krok po kroku',
            lines: [
              '1. Zaloguj się na swoje konto WB Trade',
              '2. Przejdź do zamówienia: Moje konto → Zamówienia → Wybierz zamówienie',
              '3. Wybierz „Reklamuj" przy produkcie do reklamacji',
              '4. Opisz problem: podaj szczegółowy opis wady',
              '5. Dodaj zdjęcia: załącz zdjęcia pokazujące wadę (min. 2-3 zdjęcia)',
              '6. Wybierz żądanie: naprawa, wymiana, obniżka ceny lub zwrot pieniędzy',
              '7. Wyślij zgłoszenie i oczekuj na kontakt',
            ],
          },
          {
            heading: 'Czego możesz żądać?',
            lines: [
              '• Naprawa – bezpłatna naprawa wadliwego produktu',
              '• Wymiana – wymiana na nowy, wolny od wad egzemplarz',
              '• Obniżka ceny – częściowy zwrot pieniędzy proporcjonalny do wady',
              '• Zwrot pieniędzy – pełny zwrot i odstąpienie od umowy (przy istotnych wadach)',
            ],
          },
        ],
      },
      {
        question: 'Ile trwa rozpatrzenie reklamacji?',
        answer: [
          {
            lines: ['Mamy 14 dni na rozpatrzenie reklamacji. Jeśli nie otrzymasz odpowiedzi w tym terminie, reklamacja uznawana jest za przyjętą.'],
          },
          {
            heading: 'Statusy reklamacji',
            lines: [
              '• Nowa reklamacja – zgłoszenie przyjęte do rozpatrzenia',
              '• W trakcie rozpatrywania – analizujemy zgłoszenie (maks. 14 dni)',
              '• Oczekuje na produkt – czekamy na przesłanie produktu do weryfikacji',
              '• Uznana – reklamacja rozpatrzona pozytywnie',
              '• Nieuznana – reklamacja nie została uwzględniona, sprawdź uzasadnienie',
            ],
          },
          {
            heading: 'Przesyłka reklamacyjna',
            lines: [
              '• Wyślemy kuriera po odbiór produktu (bezpłatnie)',
              '• Lub otrzymasz etykietę zwrotną do wydruku',
              '• Zapakuj produkt starannie w karton',
              '• Dołącz wypełniony formularz reklamacyjny',
            ],
          },
          {
            lines: ['💡 Zachowaj dowód zakupu i oryginalne opakowanie przez cały okres gwarancji – ułatwi to proces reklamacji.'],
          },
        ],
      },
      {
        question: 'Kto pokrywa koszty zwrotu?',
        answer: [
          {
            heading: 'Koszty zwrotu',
            lines: [
              '• Zwrot z własnej woli – koszt odesłania pokrywa klient',
              '• Towar wadliwy/niezgodny z opisem – koszt odesłania pokrywa WB Trade',
              '• Przesyłkę kurierską możesz zamówić przez naszą stronę',
            ],
          },
          {
            heading: 'Ważne informacje',
            lines: [
              '• Zwrot za dostawę jest realizowany tylko przy zwrocie całego zamówienia',
              '• Koszty odesłania towaru pokrywa klient (chyba że towar był wadliwy)',
              '• Przy ratach – anulowanie może wymagać kontaktu z instytucją finansową',
            ],
          },
          {
            heading: 'Produkty wyłączone ze zwrotu',
            lines: [
              'Zgodnie z ustawą, nie podlegają zwrotowi:',
              '• Produkty spożywcze i szybko psujące się',
              '• Produkty higieniczne po otwarciu opakowania',
              '• Kosmetyki po otwarciu (szminka, krem, perfumy itp.)',
              '• Bielizna i stroje kąpielowe (ze względów higienicznych)',
              '• Produkty wykonane na zamówienie klienta',
              '• Nagrania audio/wideo i oprogramowanie po otwarciu',
              '• Gazety, czasopisma i książki cyfrowe',
            ],
          },
        ],
      },
    ],
  },
  {
    icon: 'truck',
    title: 'Dostawa',
    items: [
      {
        question: 'Jakie są metody dostawy?',
        answer: [
          {
            heading: 'Dostępne opcje dostawy',
            lines: [
              '• Paczkomat InPost 24/7 – ponad 20 000 paczkomatów w Polsce, odbiór całą dobę',
              '• Kurier InPost – dostawa pod drzwi w 1-2 dni robocze',
              '• Wysyłka gabaryt – dla dużych produktów',
            ],
          },
          {
            heading: 'Punkty odbioru',
            lines: [
              '• Paczkomat InPost – odbiór 48h, darmowa dostawa od 100 zł',
              '• Żabka – odbiór w jednym z tysięcy sklepów, 3 dni robocze',
              '• Orlen Paczka – automaty paczkowe na stacjach, dostęp 24/7',
            ],
          },
          {
            heading: 'Jak wybrać punkt odbioru?',
            lines: [
              '1. Podczas składania zamówienia wybierz „Dostawa do punktu"',
              '2. Na mapie znajdź najbliższy punkt lub wpisz adres',
              '3. Kliknij wybrany punkt aby zobaczyć szczegóły',
              '4. Potwierdź wybór i kontynuuj zamówienie',
            ],
          },
        ],
      },
      {
        question: 'Ile kosztuje dostawa?',
        answer: [
          {
            heading: 'Koszty dostawy',
            lines: [
              '• Paczkomat InPost: darmowa dostawa od 100 zł',
              '• Kurier InPost: koszt zależy od wagi i wymiarów paczki',
              '• Wysyłka gabaryt: wycena indywidualna w zależności od rozmiaru',
              '• Za pobraniem: dodatkowa opłata 5 zł',
            ],
          },
          {
            lines: ['💡 Darmowa dostawa od 100 zł do Paczkomatu InPost! Aktualne ceny dostawy są widoczne przy składaniu zamówienia.'],
          },
        ],
      },
      {
        question: 'Ile trwa dostawa?',
        answer: [
          {
            heading: 'Standardowe czasy dostawy',
            lines: [
              '• Paczkomat InPost: 1-2 dni robocze',
              '• Kurier InPost: 1-2 dni robocze',
              'Standardowy czas realizacji zamówienia to 1-3 dni robocze.',
            ],
          },
          {
            heading: 'Co wpływa na czas dostawy?',
            lines: [
              '• Czas kompletowania zamówienia w magazynie',
              '• Wybrany sposób dostawy',
              '• Okres wzmożonego ruchu (np. Black Friday, święta)',
              '• Warunki pogodowe (w wyjątkowych sytuacjach)',
            ],
          },
          {
            lines: ['💡 Zamówienia złożone i opłacone przed godziną 14:00 są zazwyczaj wysyłane tego samego dnia.'],
          },
        ],
      },
      {
        question: 'Jak śledzić przesyłkę?',
        answer: [
          {
            heading: 'Gdzie znajdę numer przesyłki?',
            lines: [
              '• E-mail: wysyłamy powiadomienie z numerem śledzenia po nadaniu paczki',
              '• Panel klienta: Moje konto → Zamówienia → Szczegóły zamówienia',
              '• SMS: jeśli podałeś numer telefonu, otrzymasz SMS z linkiem do śledzenia',
            ],
          },
          {
            heading: 'Jak śledzić paczkę?',
            lines: [
              '1. Zaloguj się na konto WB Trade',
              '2. Przejdź do „Moje konto" → „Zamówienia"',
              '3. Znajdź zamówienie ze statusem „Wysłane"',
              '4. Kliknij „Śledź przesyłkę"',
            ],
          },
          {
            heading: 'Typowe statusy przesyłki',
            lines: [
              '• Nadana – paczka przekazana kurierowi',
              '• W sortowni – przesyłka w centrum logistycznym',
              '• W doręczeniu – kurier wyruszył z paczką, dostawa dzisiaj!',
              '• W paczkomacie – paczka czeka na odbiór (masz 48 godzin)',
              '• Doręczona – paczka została odebrana',
            ],
          },
          {
            lines: ['💡 Zainstaluj aplikację InPost – otrzymasz powiadomienia push o każdej zmianie statusu.'],
          },
        ],
      },
    ],
  },
  {
    icon: 'user',
    title: 'Konto',
    items: [
      {
        question: 'Jak założyć konto?',
        answer: [
          {
            heading: 'Korzyści z posiadania konta',
            lines: [
              '• Śledzenie zamówień – wszystkie zamówienia w jednym miejscu',
              '• Lista życzeń – zapisuj ulubione produkty na później',
              '• Zapisane adresy – szybsze składanie zamówień',
              '• Powiadomienia – informacje o promocjach i statusie',
            ],
          },
          {
            heading: 'Metoda 1: Formularz rejestracji',
            lines: [
              '1. Kliknij „Zaloguj się" w prawym górnym rogu',
              '2. Wybierz „Utwórz konto" lub „Zarejestruj się"',
              '3. Podaj swój adres e-mail',
              '4. Utwórz hasło (min. 8 znaków, litery i cyfry)',
              '5. Podaj imię i nazwisko',
              '6. Zaakceptuj regulamin i politykę prywatności',
              '7. Kliknij „Zarejestruj"',
              '8. Potwierdź adres e-mail klikając link w wiadomości',
            ],
          },
          {
            heading: 'Metoda 2: Logowanie przez Google',
            lines: [
              '1. Kliknij „Zaloguj się"',
              '2. Wybierz „Kontynuuj przez Google"',
              '3. Wybierz swoje konto Google',
              '4. Zaakceptuj uprawnienia',
              '5. Gotowe! Konto zostało utworzone automatycznie',
            ],
          },
          {
            heading: 'Metoda 3: Podczas składania zamówienia',
            lines: [
              '1. Dodaj produkty do koszyka i przejdź do kasy',
              '2. Wypełnij dane kontaktowe i dostawy',
              '3. Zaznacz opcję „Utwórz konto"',
              '4. Wprowadź hasło',
              '5. Konto zostanie utworzone wraz z zamówieniem',
            ],
          },
          {
            heading: 'Problemy z rejestracją',
            lines: [
              '• E-mail już zarejestrowany – możliwe że już masz konto, spróbuj odzyskać hasło lub zaloguj się przez Google',
              '• Nie otrzymałem e-maila potwierdzającego – sprawdź folder SPAM, kliknij „Wyślij ponownie" na stronie logowania',
              '• Link aktywacyjny wygasł – linki są ważne 24 godziny, poproś o nowy lub zarejestruj się ponownie',
            ],
          },
          {
            lines: ['💡 Logowanie przez Google jest najszybsze i nie wymaga pamiętania dodatkowego hasła. Twoje dane są bezpieczne.'],
          },
        ],
      },
      {
        question: 'Jak zmienić dane osobowe?',
        answer: [
          {
            heading: 'Jak zmienić dane?',
            lines: [
              '1. Zaloguj się na swoje konto',
              '2. Przejdź do „Moje konto" → „Edytuj profil"',
              '3. Zmień dane, które chcesz zaktualizować (imię, nazwisko, telefon)',
              '4. Kliknij „Zapisz zmiany"',
            ],
          },
          {
            heading: 'Zmiana adresu e-mail',
            lines: [
              'Aby zmienić adres e-mail przypisany do konta:',
              '1. Przejdź do ustawień konta',
              '2. Kliknij „Zmień e-mail"',
              '3. Podaj nowy adres e-mail',
              '4. Potwierdź zmianę klikając link w wiadomości wysłanej na nowy adres',
            ],
          },
          {
            heading: 'Zmiana adresu dostawy',
            lines: [
              '1. Przejdź do „Moje konto" → „Adresy"',
              '2. Edytuj istniejący adres lub dodaj nowy',
              '3. Ustaw domyślny adres dostawy',
            ],
          },
        ],
      },
      {
        question: 'Jak zmienić hasło?',
        answer: [
          {
            heading: 'Zmiana hasła (będąc zalogowanym)',
            lines: [
              '1. Zaloguj się na swoje konto',
              '2. Przejdź do „Moje konto" → „Zmień hasło"',
              '3. Podaj aktualne hasło',
              '4. Wprowadź nowe hasło (min. 8 znaków)',
              '5. Powtórz nowe hasło',
              '6. Kliknij „Zapisz"',
            ],
          },
          {
            heading: 'Zapomniałeś hasła?',
            lines: [
              '1. Na stronie logowania kliknij „Zapomniałem hasła"',
              '2. Podaj adres e-mail powiązany z kontem',
              '3. Sprawdź skrzynkę e-mail (również folder SPAM)',
              '4. Kliknij link do resetowania hasła',
              '5. Ustaw nowe hasło',
            ],
          },
          {
            heading: 'Wymagania dotyczące hasła',
            lines: [
              '• Minimum 8 znaków',
              '• Co najmniej jedna wielka litera',
              '• Co najmniej jedna cyfra',
              '• Zalecane: znak specjalny (!@#$%)',
            ],
          },
        ],
      },
      {
        question: 'Jak usunąć konto?',
        answer: [
          {
            heading: 'Usuwanie konta',
            lines: [
              'Jeśli chcesz usunąć swoje konto w WB Trade:',
              '1. Zaloguj się na swoje konto',
              '2. Przejdź do „Moje konto" → „Prywatność"',
              '3. Kliknij „Usuń konto"',
              '4. Potwierdź decyzję podając hasło',
              '5. Konto zostanie usunięte w ciągu 30 dni',
            ],
          },
          {
            heading: 'Co się stanie po usunięciu konta?',
            lines: [
              '• Utracisz dostęp do historii zamówień',
              '• Listy życzeń i zapisane adresy zostaną usunięte',
              '• Kupony i rabaty przypisane do konta przepadną',
              '• Nie będzie można cofnąć tej operacji',
            ],
          },
          {
            lines: ['⚠️ Upewnij się, że nie masz aktywnych zamówień lub otwartych reklamacji przed usunięciem konta. Dane niezbędne do celów podatkowych będą przechowywane zgodnie z prawem (5 lat).'],
          },
        ],
      },
    ],
  },
  {
    icon: 'shield',
    title: 'Bezpieczeństwo',
    items: [
      {
        question: 'Jak chronimy Twoje dane?',
        answer: [
          {
            lines: ['Dbamy o Twoją prywatność i chronimy dane osobowe zgodnie z RODO.'],
          },
          {
            heading: 'Jakie dane zbieramy?',
            lines: [
              '• Dane podane przez Ciebie: imię, nazwisko, e-mail, telefon, adres dostawy',
              '• Dane z aktywności: historia zamówień, przeglądane produkty',
              '• Dane techniczne: adres IP, typ przeglądarki, pliki cookies',
            ],
          },
          {
            heading: 'Do czego używamy Twoich danych?',
            lines: [
              '• Realizacja zamówień i dostaw',
              '• Obsługa zwrotów i reklamacji',
              '• Kontakt w sprawie zamówień',
              '• Wysyłka newslettera (za zgodą)',
              '• Personalizacja rekomendacji produktów',
            ],
          },
          {
            heading: 'Twoje prawa (RODO)',
            lines: [
              '• Prawo dostępu – możesz uzyskać kopię swoich danych',
              '• Prawo do sprostowania – możesz poprawić nieprawidłowe dane',
              '• Prawo do usunięcia – możesz żądać usunięcia danych',
              '• Prawo do przenoszenia – możesz pobrać swoje dane',
              '• Prawo do sprzeciwu – możesz sprzeciwić się przetwarzaniu',
              '• Prawo do ograniczenia – możesz ograniczyć przetwarzanie',
            ],
          },
          {
            heading: 'Komu udostępniamy dane?',
            lines: [
              '• Firmy kurierskie: do realizacji dostaw',
              '• Operatorzy płatności: do przetwarzania transakcji',
              '• Sprzedawcy: dane niezbędne do realizacji zamówienia',
              '• Organy państwowe: jeśli wymaga tego prawo',
              'Nigdy nie sprzedajemy Twoich danych!',
            ],
          },
          {
            heading: 'Jak długo przechowujemy dane?',
            lines: [
              '• Dane konta: do czasu usunięcia konta',
              '• Historia zamówień: 5 lat (wymogi prawne)',
              '• Dane marketingowe: do cofnięcia zgody',
              '• Logi techniczne: 12 miesięcy',
            ],
          },
        ],
      },
      {
        question: 'Bezpieczeństwo zakupów',
        answer: [
          {
            heading: 'Jak chronimy Twoje zakupy',
            lines: [
              '• Szyfrowanie SSL/TLS – wszystkie dane są szyfrowane',
              '• Bezpieczne płatności – certyfikowany operator PayU, 3D Secure',
              '• Ochrona danych karty – nie przechowujemy danych kart płatniczych',
              '• Weryfikacja sprzedawców – wszyscy przechodzą proces weryfikacji',
            ],
          },
          {
            heading: 'Jak bezpiecznie kupować?',
            lines: [
              '• Sprawdzaj czy w przeglądarce jest kłódka (HTTPS)',
              '• Używaj silnego, unikalnego hasła do konta',
              '• Nie loguj się przez publiczne sieci Wi-Fi',
              '• Sprawdzaj opinie o produktach i sprzedawcach',
              '• Zachowuj potwierdzenia zamówień i płatności',
              '• Nigdy nie podawaj hasła przez e-mail lub telefon',
            ],
          },
          {
            lines: [
              '⚠️ Nasza oficjalna strona to: wbtrade.pl. Uważaj na strony podszywające się pod WB Trade – nie klikaj w podejrzane linki w e-mailach.',
              '',
              '💡 Zalecamy włączenie dwuetapowej weryfikacji (2FA) w ustawieniach konta dla dodatkowej ochrony.',
            ],
          },
        ],
      },
      {
        question: 'Podejrzana aktywność na koncie',
        answer: [
          {
            heading: 'Sygnały ostrzegawcze',
            lines: [
              '• Nieznane zamówienia – potwierdzenia zamówień, których nie składałeś',
              '• Zmiana hasła bez Twojej wiedzy',
              '• Nieznane adresy dostawy w zamówieniach',
              '• Nieautoryzowane płatności',
              '• Zmienione dane konta',
            ],
          },
          {
            heading: 'Co zrobić natychmiast?',
            lines: [
              '1. Zmień hasło na silne i unikalne',
              '2. Sprawdź historię zamówień i anuluj nieznane',
              '3. Usuń nieznane adresy dostawy z konta',
              '4. Zweryfikuj dane kontaktowe',
              '5. Skontaktuj się z nami: support@wb-partners.pl',
              '6. Sprawdź wyciąg bankowy i zgłoś podejrzane transakcje',
            ],
          },
          {
            heading: 'Nie możesz się zalogować?',
            lines: [
              'Jeśli ktoś zmienił hasło do Twojego konta:',
              '1. Kliknij „Zapomniałem hasła" na stronie logowania',
              '2. Użyj adresu e-mail przypisanego do konta',
              '3. Jeśli e-mail też został zmieniony – skontaktuj się z nami pilnie',
              '4. Przygotuj dowód tożsamości do weryfikacji',
            ],
          },
          {
            heading: 'Fałszywe e-maile (phishing)',
            lines: [
              'Nigdy nie wysyłamy e-maili z prośbą o:',
              '• Podanie hasła',
              '• Dane karty płatniczej w odpowiedzi na e-mail',
              '• Kliknięcie w link do „weryfikacji konta"',
              '• Pobranie załącznika z „fakturą"',
              '⚠️ Jeśli otrzymałeś taki e-mail – NIE KLIKAJ w linki. Prześlij go do nas: support@wb-partners.pl',
            ],
          },
          {
            heading: 'Jak się chronić w przyszłości?',
            lines: [
              '• Używaj silnego, unikalnego hasła (min. 12 znaków)',
              '• Włącz weryfikację dwuetapową (2FA)',
              '• Nie używaj tego samego hasła w innych serwisach',
              '• Nie loguj się na publicznych komputerach',
              '• Regularnie sprawdzaj historię aktywności konta',
              '• Wylogowuj się po zakończeniu sesji',
            ],
          },
        ],
      },
      {
        question: 'Weryfikacja sprzedawców',
        answer: [
          {
            heading: 'Proces weryfikacji',
            lines: [
              '1. Weryfikacja tożsamości – dokumenty rejestrowe firmy, NIP, REGON',
              '2. Weryfikacja adresu – potwierdzenie adresu siedziby i magazynu',
              '3. Weryfikacja konta bankowego – sprawdzenie konta firmowego',
              '4. Weryfikacja produktów – sprawdzenie legalności i jakości',
              '5. Podpisanie umowy – zobowiązanie do przestrzegania standardów',
            ],
          },
          {
            heading: 'System ocen sprzedawców',
            lines: [
              '⭐ Super Sprzedawca:',
              '• Ocena powyżej 4.8/5',
              '• Min. 100 sprzedanych produktów',
              '• Szybka wysyłka (do 24h)',
              '• Niski procent reklamacji',
              '',
              '✅ Zweryfikowany:',
              '• Przeszedł pełną weryfikację',
              '• Aktywny na platformie',
              '• Regularne transakcje',
              '• Spełnia standardy WB Trade',
            ],
          },
          {
            heading: 'Na co zwracać uwagę?',
            lines: [
              '• Ocena sprzedawcy – sprawdź średnią ocenę i liczbę opinii',
              '• Odznaki – szukaj „Zweryfikowany" lub „Super Sprzedawca"',
              '• Czas działania – starsi sprzedawcy mają dłuższą historię',
              '• Opinie klientów – przeczytaj recenzje innych kupujących',
              '• Czas wysyłki – sprawdź deklarowany czas realizacji',
              '• Polityka zwrotów – upewnij się, że sprzedawca akceptuje zwroty',
            ],
          },
          {
            heading: 'Ochrona kupującego',
            lines: [
              '• Jeśli produkt nie dotrze – zwrot pieniędzy',
              '• Jeśli produkt niezgodny z opisem – zwrot lub wymiana',
              '• Mediacja w sporach ze sprzedawcą',
              '• Ochrona przed nieuczciwymi praktykami',
            ],
          },
          {
            heading: 'Jak zgłosić problem ze sprzedawcą?',
            lines: [
              '1. Najpierw skontaktuj się ze sprzedawcą przez wiadomości',
              '2. Jeśli nie otrzymasz pomocy w ciągu 48h – skontaktuj się z nami',
              '3. Przejdź do zamówienia i kliknij „Zgłoś problem"',
              '4. Opisz sytuację i załącz dowody (zdjęcia, korespondencję)',
              '5. Nasz zespół rozpatrzy sprawę w ciągu 5 dni roboczych',
            ],
          },
          {
            heading: 'Podejrzany sprzedawca?',
            lines: [
              'Jeśli zauważysz:',
              '• Ceny znacznie niższe od rynkowych',
              '• Prośby o płatność poza platformą',
              '• Podejrzane opisy produktów',
              '• Brak kontaktu lub nietypowe odpowiedzi',
              '⚠️ Zgłoś to do nas: support@wb-partners.pl',
            ],
          },
        ],
      },
    ],
  },
];

// ─── Popular FAQ ───
const FAQ: { q: string; a: string }[] = [
  {
    q: 'Jak mogę śledzić moje zamówienie?',
    a: 'Po zalogowaniu się na swoje konto, przejdź do sekcji „Moje zamówienia".',
  },
  {
    q: 'Ile mam czasu na zwrot produktu?',
    a: 'Masz 14 dni od daty otrzymania przesyłki na dokonanie zwrotu bez podania przyczyny. Produkt musi być nieużywany i w oryginalnym opakowaniu.',
  },
  {
    q: 'Jakie są dostępne metody płatności?',
    a: 'Akceptujemy płatności kartą (Visa, Mastercard), BLIK, przelewy online (PayU).',
  },
  {
    q: 'Jak długo trwa realizacja zamówienia?',
    a: 'Standardowy czas realizacji to 1-3 dni robocze.',
  },
];

function CategoryCard({
  icon,
  title,
  items,
}: {
  icon: string;
  title: string;
  items: HelpItem[];
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const openQuestion = (item: HelpItem) => {
    router.push({
      pathname: '/account/help-detail',
      params: {
        title: item.question,
        answer: JSON.stringify(item.answer),
      },
    });
  };

  return (
    <View style={styles.catCard}>
      <TouchableOpacity style={styles.catHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.catIconWrap}>
          <FontAwesome name={icon as any} size={18} color={colors.tint} />
        </View>
        <Text style={styles.catTitle}>{title}</Text>
        <FontAwesome
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.catItems}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.catItem}
              onPress={() => openQuestion(item)}
              activeOpacity={0.6}
            >
              <FontAwesome name="circle" size={5} color={colors.tint} style={{ marginTop: 7 }} />
              <Text style={styles.catItemText}>{item.question}</Text>
              <FontAwesome name="chevron-right" size={10} color={colors.textMuted} style={{ marginTop: 5 }} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          color={colors.tint}
        />
      </TouchableOpacity>
      {open && <Text style={styles.faqAnswer}>{a}</Text>}
    </View>
  );
}

export default function HelpScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Centrum pomocy', headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome name="question-circle" size={32} color={colors.tint} />
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
          <FontAwesome name="comments" size={28} color={colors.tint} />
          <Text style={styles.ctaTitle}>Nie znalazłeś odpowiedzi?</Text>
          <Text style={styles.ctaSubtitle}>
            Skontaktuj się z nami — odpowiemy najszybciej, jak to możliwe
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/account/contact')}
            activeOpacity={0.7}
          >
            <FontAwesome name="headphones" size={16} color={colors.textInverse} />
            <Text style={styles.ctaBtnText}>Skontaktuj się</Text>
          </TouchableOpacity>
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

  // ─── Hero ───
  hero: {
    backgroundColor: colors.card,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
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
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // ─── Category cards ───
  catList: {
    gap: 8,
  },
  catCard: {
    backgroundColor: colors.card,
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
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  catItems: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingLeft: 68,
    gap: 8,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingRight: 4,
  },
  catItemText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // ─── FAQ ───
  faqList: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
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
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },

  // ─── CTA ───
  ctaCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 24,
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
