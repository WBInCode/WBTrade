// Centralna konfiguracja kategorii - jedno źródło prawdy
// Uwaga: główne kategorie są teraz pobierane dynamicznie z API (categoriesApi.getMain())
// Ten plik zawiera definicje typów i helper functions

export interface Category {
  name: string;
  slug: string;
  children?: Category[];
}

// Główne kategorie (zsynchronizowane z bazą danych)
export const mainCategories: Category[] = [
  {
    name: 'Elektronika',
    slug: 'elektronika',
    children: [
      { name: 'Laptopy i komputery', slug: 'elektronika-laptopy-i-komputery' },
      { name: 'Smartfony i telefony', slug: 'elektronika-smartfony-i-telefony' },
      { name: 'Etui i akcesoria GSM', slug: 'elektronika-etui-i-akcesoria-gsm' },
      { name: 'Ładowarki i kable', slug: 'elektronika-ladowarki-i-kable' },
      { name: 'Słuchawki i audio', slug: 'elektronika-sluchawki-i-audio' },
      { name: 'Smartwatche i wearables', slug: 'elektronika-smartwatche-i-wearables' },
      { name: 'Tablety', slug: 'elektronika-tablety' },
      { name: 'Telewizory', slug: 'elektronika-telewizory' },
      { name: 'Konsole i gaming', slug: 'elektronika-konsole-i-gaming' },
      { name: 'Aparaty i kamery', slug: 'elektronika-aparaty-i-kamery' },
      { name: 'Akcesoria komputerowe', slug: 'elektronika-akcesoria-komputerowe' },
      { name: 'Narzędzia elektroniczne', slug: 'elektronika-narzedzia-elektroniczne' },
    ]
  },
  {
    name: 'Moda',
    slug: 'moda',
    children: [
      { name: 'Odzież damska', slug: 'moda-odziez-damska' },
      { name: 'Odzież męska', slug: 'moda-odziez-meska' },
      { name: 'Odzież dziecięca', slug: 'moda-odziez-dziecieca' },
      { name: 'Buty', slug: 'moda-buty' },
      { name: 'Akcesoria modowe', slug: 'moda-akcesoria-modowe' },
    ]
  },
  {
    name: 'Dom i Ogród',
    slug: 'dom-i-ogrod',
    children: [
      { name: 'Meble', slug: 'dom-i-ogrod-meble' },
      { name: 'Dekoracje', slug: 'dom-i-ogrod-dekoracje' },
      { name: 'Ogród', slug: 'ogrod' },
      { name: 'Narzędzia', slug: 'narzedzia' },
    ]
  },
  {
    name: 'Supermarket',
    slug: 'supermarket',
    children: [
      { name: 'Żywność', slug: 'zywnosc' },
      { name: 'Napoje', slug: 'napoje' },
      { name: 'Chemia domowa', slug: 'chemia-domowa' },
    ]
  },
  {
    name: 'Dziecko',
    slug: 'dziecko',
    children: [
      { name: 'Artykuły dziecięce', slug: 'dziecko-artykuly-dzieciece' },
      { name: 'Zabawki', slug: 'zabawki' },
      { name: 'Ubranka', slug: 'ubranka' },
      { name: 'Wózki', slug: 'wozki' },
    ]
  },
  {
    name: 'Uroda',
    slug: 'uroda',
    children: [
      { name: 'Pielęgnacja', slug: 'pielegnacja' },
      { name: 'Makijaż', slug: 'makijaz' },
      { name: 'Perfumy', slug: 'perfumy' },
    ]
  },
  {
    name: 'Motoryzacja',
    slug: 'motoryzacja',
    children: [
      { name: 'Części samochodowe', slug: 'motoryzacja-czesci-samochodowe' },
      { name: 'Akcesoria samochodowe', slug: 'akcesoria-moto' },
      { name: 'Opony', slug: 'opony' },
    ]
  },
  {
    name: 'AGD',
    slug: 'agd',
    children: [
      { name: 'Małe AGD kuchenne', slug: 'agd-male-agd-kuchenne' },
      { name: 'Duże AGD', slug: 'agd-duze-agd' },
      { name: 'Sprzątanie', slug: 'agd-sprzatanie' },
      { name: 'Klimatyzacja', slug: 'agd-klimatyzacja' },
    ]
  },
  {
    name: 'Gastronomia',
    slug: 'gastronomia',
    children: [
      { name: 'Urządzenia gastronomiczne', slug: 'gastronomia-urzadzenia-gastronomiczne' },
      { name: 'Wyposażenie kuchni', slug: 'gastronomia-wyposazenie-kuchni' },
      { name: 'Naczynia i sztućce', slug: 'gastronomia-naczynia-i-sztucce' },
      { name: 'Maszyny do mięsa', slug: 'gastronomia-maszyny-do-miesa' },
      { name: 'Chłodnictwo', slug: 'gastronomia-chlodnictwo-gastronomiczne' },
      { name: 'Pakowanie', slug: 'gastronomia-pakowanie-gastronomia' },
      { name: 'Roboty kuchenne', slug: 'gastronomia-roboty-kuchenne' },
    ]
  },
  {
    name: 'Sport',
    slug: 'sport',
    children: [
      { name: 'Fitness', slug: 'sport-fitness' },
      { name: 'Rowery', slug: 'sport-rowery' },
      { name: 'Turystyka', slug: 'sport-turystyka' },
    ]
  },
  {
    name: 'Zdrowie i Uroda',
    slug: 'zdrowie-i-uroda',
    children: [
      { name: 'Kosmetyki', slug: 'zdrowie-i-uroda-kosmetyki' },
      { name: 'Higiena', slug: 'zdrowie-i-uroda-higiena' },
    ]
  },
  {
    name: 'Zwierzęta',
    slug: 'zwierzeta',
    children: [
      { name: 'Dla psa', slug: 'zwierzeta-dla-psa' },
      { name: 'Dla kota', slug: 'zwierzeta-dla-kota' },
      { name: 'Akwaria', slug: 'zwierzeta-akwaria' },
    ]
  },
  {
    name: 'Inne',
    slug: 'inne',
    children: []
  },
];

// Helper: znajdź kategorię po slug
export function findCategoryBySlug(slug: string, categories: Category[] = mainCategories): Category | null {
  for (const cat of categories) {
    if (cat.slug === slug) return cat;
    if (cat.children) {
      const found = findCategoryBySlug(slug, cat.children);
      if (found) return found;
    }
  }
  return null;
}

// Helper: znajdź ścieżkę do kategorii (breadcrumb)
export function getCategoryPath(slug: string, categories: Category[] = mainCategories, path: Category[] = []): Category[] | null {
  for (const cat of categories) {
    const newPath = [...path, cat];
    if (cat.slug === slug) return newPath;
    if (cat.children) {
      const found = getCategoryPath(slug, cat.children, newPath);
      if (found) return found;
    }
  }
  return null;
}

// Helper: sprawdź czy slug jest główną kategorią
export function isMainCategory(slug: string): boolean {
  return mainCategories.some(cat => cat.slug === slug);
}

// Helper: znajdź główną kategorię dla podkategorii
export function getMainCategoryFor(slug: string): Category | null {
  for (const mainCat of mainCategories) {
    if (mainCat.slug === slug) return mainCat;
    if (mainCat.children) {
      const found = findCategoryBySlug(slug, mainCat.children);
      if (found) return mainCat;
    }
  }
  return null;
}

// Helper: pobierz listę nazw głównych kategorii (do wyświetlenia w Header)
export function getMainCategoryNames(): string[] {
  return mainCategories.map(cat => cat.name);
}

// Helper: pobierz slug dla nazwy kategorii
export function getSlugByName(name: string, categories: Category[] = mainCategories): string | null {
  for (const cat of categories) {
    if (cat.name === name) return cat.slug;
    if (cat.children) {
      const found = getSlugByName(name, cat.children);
      if (found) return found;
    }
  }
  return null;
}

// Helper: pobierz nazwę dla slug kategorii
export function getNameBySlug(slug: string): string | null {
  const cat = findCategoryBySlug(slug);
  return cat ? cat.name : null;
}
