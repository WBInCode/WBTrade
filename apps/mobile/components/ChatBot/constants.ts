import type { Message } from './types';

export const BOT_NAME = 'WuBuś';

export const WB_LOGO = require('../../assets/images/wb-trade-logo.png');

export const PRODUCT_SEARCH_KEYWORDS = [
  'szukam', 'szukasz', 'znajdź', 'znajdz', 'poszukaj', 'pokaż', 'pokaz',
  'chcę kupić', 'chce kupic', 'interesuje mnie', 'potrzebuję', 'potrzebuje',
  'szukasz produktu', 'szukam produktu', 'wyszukaj', 'polecasz', 'polecisz',
  'jaki produkt', 'jakie produkty', 'co polecasz', 'najlepszy', 'najlepsza', 'najlepsze',
];

export const QUICK_QUESTIONS = [
  '🔍 Szukasz produktu?',
  '📚 Przeglądaj tematy',
  'Kim jest WuBuś?',
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

export const FOLLOWUP_MESSAGES = [
  'Czy mogę Ci jeszcze w czymś pomóc? 😊',
  'Masz jeszcze jakieś pytanie? Chętnie pomogę! 💬',
  'Czy jest coś jeszcze, w czym mogę pomóc? 🙂',
  'Potrzebujesz pomocy z czymś innym? Pytaj śmiało!',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Dzień dobry! ☀️';
  if (hour >= 12 && hour < 18) return 'Cześć! 👋';
  if (hour >= 18 && hour < 22) return 'Dobry wieczór! 🌙';
  return 'Hej, jeszcze nie śpisz? 🦉';
}

export function createInitialMessage(): Message {
  return {
    id: '0',
    text: `${getGreeting()} Jestem ${BOT_NAME} — Twój wirtualny asystent WBTrade. Zadaj mi pytanie dotyczące zamówień, płatności, dostawy, zwrotów lub konta — chętnie pomogę!`,
    isBot: true,
    timestamp: new Date(),
  };
}

export const RELATED_QUESTIONS: Record<string, string[]> = {
  'Zamówienia': ['Jak sprawdzić status zamówienia?', 'Jak anulować zamówienie?', 'Jak otrzymać fakturę VAT?'],
  'Koszyk': ['Jak działa koszyk?', 'Jak wygląda proces składania zamówienia?'],
  'Płatności': ['Czy płatności są bezpieczne?', 'Jak sprawdzić status płatności?', 'Jak otrzymać zwrot pieniędzy?'],
  'Zwroty': ['Kto pokrywa koszty zwrotu?', 'Jak złożyć reklamację?', 'Ile trwa rozpatrzenie reklamacji?'],
  'Dostawa': ['Jak śledzić przesyłkę?', 'Ile kosztuje dostawa i kiedy jest darmowa?', 'Jak wybrać Paczkomat InPost?'],
  'Kupony i Rabaty': ['Jak użyć kodu rabatowego?', 'Jak dostać kupon za newsletter?', 'Czy macie program lojalnościowy?', 'Jak polecić WBTrade znajomemu?'],
  'Nawigacja': ['Jak szukać produktów?', 'Jak przeglądać kategorie produktów?', 'Co znajdę na stronie głównej?'],
  'Produkty': ['Co znajdę na stronie produktu?', 'Co to jest cena Omnibus?', 'Czy mogę porównać produkty?', 'Dlaczego cena produktu się zmieniła?'],
  'Ulubione': ['Jak dodać produkt do ulubionych?', 'Gdzie znajdę moje ulubione produkty?'],
  'Listy zakupowe': ['Jak korzystać z list zakupowych?', 'Jak dodać produkt do listy zakupowej?'],
  'Opinie': ['Jak dodać opinię o produkcie?', 'Gdzie znajdę swoje opinie?', 'Czy mogę zostawić opinię bez zakupu?'],
  'Konto': ['Jak zmienić hasło?', 'Jak zmienić dane osobowe?', 'Jak usunąć konto?'],
  'Kontakt': ['Jak się z nami skontaktować?', 'Gdzie jest Centrum Pomocy?', 'Gdzie znajdę regulamin?'],
  'Pomoc techniczna': ['Aplikacja nie działa poprawnie — co robić?', 'Jak odświeżyć dane w aplikacji?'],
  'Gwarancja': ['Jak działa gwarancja?', 'Jak złożyć reklamację?'],
  'Promocje': ['Gdzie znajdę promocje i wyprzedaże?', 'Jak dostać kupon za newsletter?'],
};

export const INITIAL_MESSAGE: Message = createInitialMessage();

/**
 * Hardcoded promo message – update manually when promotions change.
 * Set `enabled: false` to disable completely.
 */
export const PROMO_CONFIG = {
  enabled: true,
  text: '🔥 Aktualne promocje w WBTrade!\n\n🎉 Kupon -10% na pierwsze zakupy w aplikacji — odbierz go w zakładce „Kupony"!\n📦 Darmowa dostawa od 199 zł na wszystkie zamówienia.\n📬 Zapisz się do newslettera i zgarnij dodatkowy rabat!',
  actions: [
    {
      label: '🎟️ Moje kupony',
      icon: 'arrow-right' as const,
      type: 'navigate' as const,
      route: '/account/discounts',
    },
    {
      label: '📬 Newsletter',
      icon: 'arrow-right' as const,
      type: 'navigate' as const,
      route: '/account/profile',
    },
  ],
};
