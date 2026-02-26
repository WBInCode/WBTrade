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

export const INITIAL_MESSAGE: Message = createInitialMessage();
