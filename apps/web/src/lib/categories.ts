// Centralna konfiguracja kategorii - jedno źródło prawdy

export interface Category {
  name: string;
  slug: string;
  children?: Category[];
}

// Główne kategorie (wyświetlane w Header)
export const mainCategories: Category[] = [
  {
    name: 'Elektronika',
    slug: 'elektronika',
    children: [
      {
        name: 'Laptopy',
        slug: 'laptopy',
        children: [
          { name: 'Laptopy gamingowe', slug: 'laptopy-gamingowe' },
          { name: 'Ultrabooki', slug: 'ultrabooki' },
          { name: 'Laptopy 2w1', slug: 'laptopy-2w1' },
          { name: 'Laptopy biznesowe', slug: 'laptopy-biznesowe' },
        ]
      },
      {
        name: 'Smartfony',
        slug: 'smartfony',
        children: [
          { name: 'iPhone', slug: 'iphone' },
          { name: 'Samsung', slug: 'samsung' },
          { name: 'Xiaomi', slug: 'xiaomi' },
        ]
      },
      {
        name: 'Telewizory',
        slug: 'telewizory',
      },
      {
        name: 'Słuchawki',
        slug: 'sluchawki',
      },
    ]
  },
  {
    name: 'Moda',
    slug: 'moda',
    children: [
      { name: 'Odzież damska', slug: 'odziez-damska' },
      { name: 'Odzież męska', slug: 'odziez-meska' },
      { name: 'Buty', slug: 'buty' },
      { name: 'Akcesoria', slug: 'akcesoria-moda' },
    ]
  },
  {
    name: 'Dom i Ogród',
    slug: 'dom-i-ogrod',
    children: [
      { name: 'Meble', slug: 'meble' },
      { name: 'Dekoracje', slug: 'dekoracje' },
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
      { name: 'Części samochodowe', slug: 'czesci-samochodowe' },
      { name: 'Akcesoria', slug: 'akcesoria-moto' },
      { name: 'Opony', slug: 'opony' },
    ]
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
