// Centralna konfiguracja kategorii - jedno źródło prawdy
// Uwaga: główne kategorie są teraz pobierane dynamicznie z API (categoriesApi.getMain())
// Ten plik zawiera definicje typów i helper functions
//
// NOWA LOGIKA KATEGORII (01/2026):
// - Kategorie są mapowane na podstawie TAGÓW z Baselinkera
// - Każdy produkt ma 2 tagi: główna kategoria + podkategoria
// - Główne kategorie to KONTENERY - nie wyświetlają produktów bezpośrednio
// - Produkty wyświetlają się TYLKO w podkategoriach

/**
 * Usuwa prefiksy [BTP], [HP] itp. z nazwy kategorii
 * Te prefiksy są używane wewnętrznie do identyfikacji źródła kategorii,
 * ale nie powinny być widoczne dla użytkowników
 */
export function cleanCategoryName(name: string): string {
  // Usuwa prefiksy w formacie [XXX] na początku nazwy
  return name.replace(/^\[[A-Z]+\]\s*/g, '').trim();
}

export interface Category {
  name: string;
  slug: string;
  children?: Category[];
}

// Główne kategorie (zsynchronizowane z tagami Baselinker)
// UWAGA: Te kategorie to KONTENERY - produkty wyświetlają się tylko w podkategoriach
export const mainCategories: Category[] = [
  {
    name: 'Elektronika',
    slug: 'elektronika',
    children: [
      { name: 'Akcesoria Komputerowe', slug: 'akcesoria-komputerowe' },
      { name: 'Etui i akcesoria GSM', slug: 'etui-i-akcesoria-gsm' },
      { name: 'Smartfony i telefony', slug: 'smartfony-i-telefony' },
      { name: 'Smartwatche', slug: 'smartwatche' },
      { name: 'Słuchawki', slug: 'sluchawki' },
    ]
  },
  {
    name: 'Sport',
    slug: 'sport',
    children: [
      { name: 'Akcesoria sportowe', slug: 'akcesoria-sportowe' },
      { name: 'Rekreacja', slug: 'rekreacja' },
      { name: 'Turystyka', slug: 'turystyka' },
    ]
  },
  {
    name: 'Zdrowie i uroda',
    slug: 'zdrowie-i-uroda',
    children: []  // Brak podkategorii - produkty trafiają bezpośrednio tutaj
  },
  {
    name: 'Dom i ogród',
    slug: 'dom-i-ogrod',
    children: [
      { name: 'Akcesoria dla zwierząt', slug: 'akcesoria-dla-zwierzat' },
      { name: 'Akcesoria domowe', slug: 'akcesoria-domowe' },
      { name: 'Domowe AGD', slug: 'domowe-agd' },
      { name: 'Ogród', slug: 'ogrod' },
      { name: 'Oświetlenie', slug: 'oswietlenie' },
      { name: 'Wyposażenie wnętrz', slug: 'wyposazenie-wnetrz' },
    ]
  },
  {
    name: 'Motoryzacja',
    slug: 'motoryzacja',
    children: [
      { name: 'Akcesoria samochodowe', slug: 'akcesoria-samochodowe' },
      { name: 'Folie samochodowe', slug: 'folie-samochodowe' },
    ]
  },
  {
    name: 'Dziecko',
    slug: 'dziecko',
    children: [
      { name: 'Kostiumy i przebrania', slug: 'kostiumy-i-przebrania' },
      { name: 'Zabawki', slug: 'zabawki' },
      { name: 'Pojazdy dla dzieci', slug: 'pojazdy-dla-dzieci' },
      { name: 'Artykuły dla dzieci', slug: 'artykuly-dla-dzieci' },
      { name: 'Artykuły plastyczne', slug: 'artykuly-plastyczne' },
      { name: 'Artykuły szkolne', slug: 'artykuly-szkolne' },
    ]
  },
  {
    name: 'Biurowe i papiernicze',
    slug: 'biurowe-i-papiernicze',
    children: []  // Brak podkategorii - produkty trafiają bezpośrednio tutaj
  },
  {
    name: 'Gastronomiczne',
    slug: 'gastronomiczne',
    children: [
      { name: 'Naczynia i zastawa', slug: 'naczynia-i-zastawa' },
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

// Helper: sprawdź czy kategoria jest kontenerem (ma podkategorie z produktami)
// Kontenery nie wyświetlają produktów bezpośrednio - tylko ich podkategorie
export function isCategoryContainer(slug: string): boolean {
  const cat = findCategoryBySlug(slug, mainCategories);
  if (!cat) return false;
  
  // Główna kategoria z podkategoriami to kontener
  if (isMainCategory(slug) && cat.children && cat.children.length > 0) {
    return true;
  }
  
  return false;
}

// Helper: sprawdź czy produkty mogą być wyświetlane bezpośrednio w tej kategorii
export function canShowProductsDirectly(slug: string): boolean {
  // Jeśli to podkategoria - zawsze może wyświetlać produkty
  if (!isMainCategory(slug)) {
    return true;
  }
  
  // Jeśli to główna kategoria bez podkategorii (np. "Zdrowie i uroda", "Biurowe i papiernicze")
  // - produkty trafiają bezpośrednio tutaj
  const cat = findCategoryBySlug(slug, mainCategories);
  if (cat && (!cat.children || cat.children.length === 0)) {
    return true;
  }
  
  // Główna kategoria z podkategoriami - nie wyświetla produktów bezpośrednio
  return false;
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
