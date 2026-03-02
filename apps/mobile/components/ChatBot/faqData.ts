import type { FaqEntry, MessageAction } from './types';

const BOT_NAME = 'WuBuś';

export const FAQ_DATA: FaqEntry[] = [
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
    actions: [{ label: 'Przejdź do zamówień', icon: 'arrow-right', type: 'navigate', payload: '', route: '/account/orders' }],
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
    actions: [{ label: 'Przejdź do zamówień', icon: 'arrow-right', type: 'navigate', payload: '', route: '/account/orders' }],
  },

  // ═══ KOSZYK I CHECKOUT ═══
  {
    keywords: ['koszyk', 'dodać do koszyka', 'co jest w koszyku', 'produkty w koszyku'],
    question: 'Jak działa koszyk?',
    answer: 'Koszyk znajdziesz na dolnym pasku nawigacji (ikona 🛒). Produkty są automatycznie grupowane według magazynów jako osobne paczki (Paczka 1, Paczka 2...). Możesz zmieniać ilość produktów, usuwać je, oraz dodawać kupony rabatowe.',
    category: 'Koszyk',
    actions: [{ label: 'Otwórz koszyk', icon: 'arrow-right', type: 'navigate', payload: '', route: '/(tabs)/cart' }],
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
    actions: [{ label: 'Przejdź do kuponów', icon: 'arrow-right', type: 'navigate', payload: '', route: '/account/discounts' }],
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
    actions: [{ label: 'Przejdź do kuponów', icon: 'arrow-right', type: 'navigate', payload: '', route: '/account/discounts' }],
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
    actions: [{ label: 'Przejdź do ulubionych', icon: 'arrow-right', type: 'navigate', payload: '', route: '/(tabs)/wishlist' }],
  },
  {
    keywords: ['lista ulubionych', 'gdzie ulubione', 'moje ulubione'],
    question: 'Gdzie znajdę moje ulubione produkty?',
    answer: 'Twoje ulubione produkty znajdziesz klikając ikonę ❤️ na dolnym pasku nawigacji (zakładka „Ulubione"). Zobaczysz listę wszystkich polubionych produktów z cenami, dostępnością i przyciskiem szybkiego dodawania do koszyka.',
    category: 'Ulubione',
    actions: [{ label: 'Przejdź do ulubionych', icon: 'arrow-right', type: 'navigate', payload: '', route: '/(tabs)/wishlist' }],
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
    actions: [{ label: 'Edytuj profil', icon: 'arrow-right', type: 'navigate', payload: '', route: '/account/profile' }],
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

  // ═══ O BOCIE WuBuś ═══
  {
    keywords: ['wubuś', 'wubus', 'kim jesteś', 'kim jest wubuś', 'bot', 'chatbot', 'asystent', 'co umiesz', 'jak ci na imię', 'twoje imię'],
    question: 'Kim jest WuBuś?',
    answer: `Jestem ${BOT_NAME} — wirtualny asystent sklepu WBTrade! 🤖\n\nMogę pomóc Ci z:\n• 📦 Zamówieniami — składanie, śledzenie, anulowanie\n• 💳 Płatnościami — metody, bezpieczeństwo, statusy\n• 🚚 Dostawą — metody, koszty, śledzenie paczek\n• 🔄 Zwrotami i reklamacjami\n• 🎁 Kuponami i rabatami\n• 👤 Kontem — rejestracja, logowanie, ustawienia\n• 📱 Nawigacją po aplikacji\n\nJeśli nie znam odpowiedzi — przekieruję Cię do naszego zespołu wsparcia! 😊`,
    category: 'O bocie',
  },

  // ═══ GWARANCJA ═══
  {
    keywords: ['gwarancja', 'gwarancyjny', 'serwis gwarancyjny', 'ile gwarancji', 'rękojmia', 'karta gwarancyjna'],
    question: 'Jak działa gwarancja?',
    answer: 'Każdy produkt w WBTrade objęty jest **rękojmią** (24 miesiące od daty zakupu) — to Twoje ustawowe prawo niezależne od producenta.\n\nDodatkowo wiele produktów posiada **gwarancję producenta** — czas trwania i warunki znajdziesz na karcie gwarancyjnej dołączonej do produktu lub na stronie producenta.\n\n📋 Jak zgłosić reklamację gwarancyjną?\n1. Przejdź do Konto → Zamówienia → wybierz produkt\n2. Kliknij „Zgłoś reklamację"\n3. Opisz usterkę i dołącz zdjęcia\n\nMożesz też napisać na reklamacje@wbtrade.pl z numerem zamówienia.',
    category: 'Gwarancja',
  },

  // ═══ WYMIANA PRODUKTU ═══
  {
    keywords: ['wymiana', 'wymienić', 'zamienić', 'inny rozmiar', 'inny kolor', 'zamiana', 'wymiana produktu'],
    question: 'Czy mogę wymienić produkt na inny?',
    answer: 'Obecnie nie oferujemy bezpośredniej wymiany produktów. Aby otrzymać inny wariant (np. rozmiar, kolor), wykonaj dwa kroki:\n\n1. **Zwróć produkt** — masz na to 14 dni od otrzymania przesyłki. Przejdź do Konto → Zamówienia → „Zwróć produkt"\n2. **Złóż nowe zamówienie** — wybierz właściwy wariant i zamów ponownie\n\n💡 Zwrot pieniędzy nastąpi w ciągu 14 dni od otrzymania przez nas paczki zwrotnej.\n\nJeśli potrzebujesz pomocy — napisz do nas na kontakt@wbtrade.pl!',
    category: 'Zwroty',
  },

  // ═══ POWIADOMIENIA PUSH ═══
  {
    keywords: ['powiadomienia', 'notyfikacje', 'push', 'alert', 'włączyć powiadomienia', 'wyłączyć powiadomienia', 'notyfikacja'],
    question: 'Jak zarządzać powiadomieniami push?',
    answer: 'Powiadomienia push informują Cię o:\n• 📦 Statusie zamówienia (wysłane, dostarczone)\n• 🏷️ Promocjach i kodach rabatowych\n• 🔔 Dostępności obserwowanych produktów\n\n**Aby włączyć/wyłączyć powiadomienia:**\n\n📱 **Android:** Ustawienia → Aplikacje → WBTrade → Powiadomienia\n📱 **iOS:** Ustawienia → Powiadomienia → WBTrade\n\nW aplikacji możesz też przejść do Konto → Ustawienia, aby wybrać, które kategorie powiadomień chcesz otrzymywać.',
    category: 'Pomoc techniczna',
  },

  // ═══ OUTLET / WYPRZEDAŻ ═══
  {
    keywords: ['outlet', 'wyprzedaż', 'promocje', 'okazje', 'tanie', 'black friday', 'sale', 'przecena', 'obniżka', 'produkt dnia'],
    question: 'Gdzie znajdę promocje i wyprzedaże?',
    answer: 'Najlepsze okazje znajdziesz w kilku miejscach:\n\n🏷️ **Zakładka Promocje** — na ekranie głównym aplikacji, sekcja z aktualnymi ofertami\n🔥 **Produkt dnia** — codziennie nowa oferta w specjalnej cenie na stronie głównej\n📧 **Newsletter** — zapisz się, aby otrzymywać kody rabatowe i informacje o wyprzedażach\n🛍️ **Outlet** — produkty w obniżonych cenach znajdziesz w kategorii „Outlet"\n\n💡 Włącz powiadomienia push, aby nie przegapić najlepszych ofert i akcji typu Black Friday!',
    category: 'Promocje',
  },

  // ═══ BEZPIECZEŃSTWO KONTA ═══
  {
    keywords: ['bezpieczeństwo', 'włamanie', 'podejrzane logowanie', 'hakerzy', 'zhakowane', 'ktoś się zalogował', 'bezpieczeństwo konta'],
    question: 'Jak zadbać o bezpieczeństwo konta?',
    answer: '🔐 **Zasady bezpiecznego konta:**\n\n1. Używaj **silnego hasła** — min. 8 znaków, duże i małe litery, cyfry, znaki specjalne\n2. **Nie udostępniaj** danych logowania nikomu\n3. Nigdy nie podawaj hasła przez e-mail ani telefon — nasz zespół nigdy o to nie prosi\n4. Regularnie **zmieniaj hasło** (Konto → Ustawienia → Zmień hasło)\n\n⚠️ **Podejrzewasz włamanie?**\n• Natychmiast zmień hasło\n• Sprawdź historię zamówień\n• Napisz do nas: bezpieczenstwo@wbtrade.pl\n\nZareagujemy w ciągu 24h i pomożemy zabezpieczyć konto!',
    category: 'Pomoc techniczna',
  },

  // ═══ GODZINY PRACY OBSŁUGI ═══
  {
    keywords: ['godziny pracy', 'kiedy odpowiecie', 'czas odpowiedzi', 'kiedy dzwonić', 'godziny obsługi', 'kontakt godziny'],
    question: 'Jakie są godziny pracy obsługi klienta?',
    answer: '🕐 **Godziny pracy zespołu wsparcia:**\n\n📞 **Telefon:** poniedziałek–piątek, 9:00–17:00\n📧 **E-mail:** odpowiadamy w ciągu 24h w dni robocze (kontakt@wbtrade.pl)\n🤖 **WuBuś (ja!):** dostępny **24/7** — zawsze chętnie pomogę!\n\nW weekendy i święta obsługa mailowa może działać z opóźnieniem — odpowiemy najszybciej jak to możliwe w najbliższy dzień roboczy.\n\n💡 Jeśli sprawa jest pilna, opisz ją jak najdokładniej w mailu — przyspieszy to rozwiązanie!',
    category: 'Obsługa klienta',
  },

  // ═══ WIELOKROTNE ADRESY DOSTAWY ═══
  {
    keywords: ['różne adresy', 'kilka adresów', 'inny adres', 'prezent', 'inny adres dostawy', 'dwa adresy'],
    question: 'Czy mogę wysłać zamówienie na różne adresy?',
    answer: 'Jedno zamówienie może zostać wysłane tylko na **jeden adres dostawy**.\n\n🎁 Jeśli chcesz wysłać produkty pod różne adresy (np. prezenty), złóż **osobne zamówienia** — każde z innym adresem dostawy.\n\n📋 **Jak dodać nowy adres?**\n1. Podczas składania zamówienia kliknij „Zmień adres"\n2. Wpisz nowy adres lub wybierz z zapisanych\n3. Możesz zapisać wiele adresów w Konto → Adresy\n\n💡 Dodaj adnotację „Prezent — nie dołączać paragonu" w uwagach do zamówienia, jeśli wysyłasz jako upominek!',
    category: 'Dostawa',
  },

  // ═══ PŁATNOŚĆ RATALNA ═══
  {
    keywords: ['raty', 'ratalna', 'na raty', 'kredyt', 'odroczona płatność', 'płatność odroczona', 'ratalne'],
    question: 'Czy mogę zapłacić na raty?',
    answer: 'Tak! Dla zamówień powyżej 300 zł oferujemy opcje płatności ratalnej:\n\n💳 **Raty PayU** — od 3 do 30 rat, decyzja w kilka minut\n🏦 **Odroczona płatność** — kup teraz, zapłać za 30 dni (PayPo / Twisto)\n\n📋 **Jak skorzystać?**\n1. Dodaj produkty do koszyka\n2. Przejdź do płatności\n3. Wybierz „Raty" lub „Zapłać później"\n4. Wypełnij krótki formularz — decyzja online\n\n⚠️ Dostępność rat zależy od weryfikacji kredytowej. Szczegóły warunków znajdziesz na stronie wybranego operatora.',
    category: 'Płatności',
  },

  // ═══ DOSTĘPNOŚĆ PRODUKTU ═══
  {
    keywords: ['niedostępny', 'brak', 'kiedy będzie', 'restock', 'brak w magazynie', 'wyczerpany', 'ponownie dostępny', 'dostępność'],
    question: 'Produkt jest niedostępny — kiedy wróci?',
    answer: 'Jeśli produkt jest chwilowo niedostępny, masz kilka opcji:\n\n🔔 **Powiadomienie o dostępności** — na stronie produktu kliknij „Powiadom mnie, gdy będzie dostępny". Wyślemy Ci wiadomość push lub e-mail, gdy produkt wróci do sprzedaży.\n\n📦 **Sprawdź warianty** — czasem inny kolor lub rozmiar jest dostępny od ręki\n\n⏳ **Czas oczekiwania** — zwykle produkty wracają w ciągu 1–3 tygodni, ale zależy to od producenta\n\n💡 Jeśli zależy Ci na konkretnym produkcie, napisz do nas (kontakt@wbtrade.pl) — sprawdzimy u dostawcy przewidywany termin dostawy!',
    category: 'Produkty',
  },

  // ═══ PREZENTY / PAKOWANIE ═══
  {
    keywords: ['prezent', 'pakowanie', 'zapakuj', 'opakowanie prezentowe', 'dedykacja', 'na prezent', 'zapakować', 'pakowanie na prezent', 'upominek'],
    question: 'Czy oferujecie pakowanie na prezent?',
    answer: '🎁 Obecnie nie oferujemy opcji pakowania prezentowego przy składaniu zamówienia.\n\n**Kilka wskazówek:**\n• Zamów produkt na adres obdarowanej osoby — w uwagach do zamówienia zaznacz „nie dołączać paragonu"\n• Paragon możesz pobrać elektronicznie z zakładki Konto → Zamówienia\n• Jeśli zależy Ci na anonimowej przesyłce, napisz w uwagach — postaramy się usunąć dane nadawcy z etykiety\n\n💡 Pracujemy nad opcją pakowania prezentowego — śledź nasze aktualizacje!',
    category: 'Dostawa',
  },

  // ═══ PORÓWNYWANIE PRODUKTÓW ═══
  {
    keywords: ['porównać', 'porównanie', 'który lepszy', 'różnica między', 'porównywarka', 'co wybrać', 'lepszy produkt'],
    question: 'Czy mogę porównać produkty?',
    answer: '🔍 Aplikacja WBTrade nie posiada jeszcze wbudowanej porównywarki produktów, ale możesz łatwo porównać oferty ręcznie:\n\n1. Dodaj interesujące produkty do **Ulubionych** (❤️) — znajdziesz je potem w jednym miejscu\n2. Porównaj **specyfikacje** na stronach produktów — parametry techniczne są wymienione pod opisem\n3. Sprawdź **opinie** innych klientów — oceny i recenzje pomogą w wyborze\n\n💡 Jeśli nie wiesz, co wybrać — napisz mi! Mogę wyszukać produkty w danej kategorii, a Ty porównasz ceny i oceny ⭐',
    category: 'Produkty',
  },

  // ═══ PROGRAMY LOJALNOŚCIOWE ═══
  {
    keywords: ['punkty', 'lojalność', 'program lojalnościowy', 'nagrody', 'poziomy', 'punkty lojalnościowe', 'zbieranie punktów'],
    question: 'Czy macie program lojalnościowy?',
    answer: '⭐ Program lojalnościowy WBTrade jest w przygotowaniu!\n\n**Co planujemy:**\n• 🪙 Punkty za każde zakupy — wymienialne na rabaty\n• 🎁 Nagrody i kupony za osiągnięcie progów\n• 🏆 Poziomy lojalności z dodatkowymi benefitami\n\n**A tymczasem — korzystaj z dostępnych zniżek:**\n• 📧 Kupon za zapis do newslettera\n• 📱 Kupon -10% za pobranie aplikacji\n• 🎟️ Kody rabatowe z okazji promocji sezonowych\n\n💡 Śledź nas w aplikacji i newsletterze — jako pierwszy dowiesz się o starcie programu!',
    category: 'Kupony i Rabaty',
  },

  // ═══ OPINIA BEZ ZAKUPU ═══
  {
    keywords: ['opinia bez zakupu', 'nie kupiłem', 'nie kupowałem', 'recenzja bez zamówienia', 'wystawić opinię', 'opinia', 'zostawić opinię'],
    question: 'Czy mogę zostawić opinię bez zakupu?',
    answer: '📝 Opinie w WBTrade mogą wystawiać **tylko klienci, którzy zakupili dany produkt**. Dzięki temu nasze recenzje są wiarygodne i pomocne dla innych.\n\n**Jak dodać opinię po zakupie:**\n1. Przejdź do Konto → Zamówienia\n2. Wybierz zrealizowane zamówienie\n3. Kliknij „Dodaj opinię" przy produkcie\n4. Oceń od 1 do 5 gwiazdek i opisz swoje doświadczenie\n\n💡 Po wystawieniu opinii możesz otrzymać dodatkowy kupon rabatowy — szczegóły w zakładce Kupony!',
    category: 'Opinie',
  },

  // ═══ DLACZEGO CENA SIĘ ZMIENIŁA ═══
  {
    keywords: ['cena się zmieniła', 'inna cena', 'drożej', 'taniej', 'zmiana ceny', 'cena wzrosła', 'cena spadła', 'dynamiczne ceny', 'dlaczego droższa'],
    question: 'Dlaczego cena produktu się zmieniła?',
    answer: '💰 Ceny w WBTrade mogą się zmieniać z kilku powodów:\n\n📊 **Ceny rynkowe** — dostosowujemy ceny do aktualnych warunków rynkowych i cen dostawców\n🏷️ **Promocje** — produkt mógł być wcześniej w promocji, która się zakończyła (lub właśnie się zaczęła!)\n📦 **Dostępność** — ograniczona dostępność może wpływać na cenę\n\n🔍 **Cena Omnibus** — przy każdym produkcie widoczna jest najniższa cena z ostatnich 30 dni, dzięki czemu wiesz, czy aktualna oferta jest korzystna.\n\n💡 Dodaj produkt do Ulubionych — otrzymasz powiadomienie, gdy cena spadnie!',
    category: 'Produkty',
  },

  // ═══ POLECENIE ZNAJOMEMU ═══
  {
    keywords: ['polecenie', 'polecić', 'kod polecający', 'znajomy', 'zaproś znajomego', 'program poleceń', 'referral', 'udostępnij'],
    question: 'Jak polecić WBTrade znajomemu?',
    answer: '👥 Cieszymy się, że chcesz polecić WBTrade!\n\nAktualnie pracujemy nad programem poleceń z dedykowanymi kodami rabatowymi. W przyszłości będziesz mógł:\n\n🔗 Wygenerować **unikalny link polecający**\n🎁 Otrzymać **kupon rabatowy**, gdy znajomy złoży pierwsze zamówienie\n👋 Znajomy również otrzyma **zniżkę na start**\n\n**A tymczasem** — możesz udostępnić link do aplikacji WBTrade bezpośrednio z telefonu (przycisk „Udostępnij" w ustawieniach aplikacji).\n\n💡 Śledź newslettera — poinformujemy o starcie programu poleceń!',
    category: 'Kupony i Rabaty',
  },
];
