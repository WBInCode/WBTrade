/**
 * Category Tag Mapper Service
 * 
 * Mapuje kategorie na podstawie tagów z Baselinkera.
 * Każdy produkt ma dwa tagi: tag głównej kategorii i tag podkategorii.
 * 
 * Logika:
 * 1. Pobierz tagi produktu
 * 2. Znajdź tag głównej kategorii (jeden z 8 głównych)
 * 3. Znajdź tag podkategorii (jeśli istnieje)
 * 4. Przypisz produkt do podkategorii (lub głównej jeśli brak podkategorii)
 * 
 * WAŻNE: Produkty trafiają TYLKO do podkategorii. Główne kategorie są tylko kontenerami.
 */

const fs = require('fs');
const path = require('path');

class CategoryTagMapper {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '../../config/category-tags-mapping.json');
    this.config = null;
    this.mainCategoryTags = new Set();
    this.subcategoryToMain = new Map(); // subcategory tag -> main category tag
    this.tagNormalization = new Map(); // lowercase tag -> normalized tag
    this.loadConfig();
  }

  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      this.buildLookups();
      console.log(`[CategoryTagMapper] Załadowano ${this.mainCategoryTags.size} kategorii głównych, ${this.subcategoryToMain.size} podkategorii`);
    } catch (error) {
      console.error('[CategoryTagMapper] Błąd ładowania konfiguracji:', error.message);
      this.config = { 
        categoryTree: {}, 
        fallbackCategory: { name: 'Inne', slug: 'inne' },
        tagNormalization: { mappings: {} }
      };
    }
  }

  /**
   * Buduje struktury lookup dla szybkiego wyszukiwania
   */
  buildLookups() {
    // Załaduj główne kategorie i podkategorie
    for (const [mainTag, mainData] of Object.entries(this.config.categoryTree)) {
      this.mainCategoryTags.add(mainTag);
      
      // Mapuj podkategorie do głównych kategorii
      if (mainData.subcategories) {
        for (const subTag of Object.keys(mainData.subcategories)) {
          this.subcategoryToMain.set(subTag, mainTag);
        }
      }
    }
    
    // Załaduj normalizację tagów
    if (this.config.tagNormalization?.mappings) {
      for (const [variant, normalized] of Object.entries(this.config.tagNormalization.mappings)) {
        this.tagNormalization.set(variant.toLowerCase(), normalized);
      }
    }
  }

  /**
   * Normalizuje tag (obsługuje różne warianty pisowni)
   */
  normalizeTag(tag) {
    if (!tag) return null;
    const lowerTag = tag.trim().toLowerCase();
    return this.tagNormalization.get(lowerTag) || tag.trim();
  }

  /**
   * Sprawdza czy tag jest główną kategorią
   */
  isMainCategory(tag) {
    const normalized = this.normalizeTag(tag);
    return this.mainCategoryTags.has(normalized);
  }

  /**
   * Sprawdza czy tag jest podkategorią
   */
  isSubcategory(tag) {
    const normalized = this.normalizeTag(tag);
    return this.subcategoryToMain.has(normalized);
  }

  /**
   * Pobiera główną kategorię dla podkategorii
   */
  getMainCategoryForSubcategory(subcategoryTag) {
    const normalized = this.normalizeTag(subcategoryTag);
    return this.subcategoryToMain.get(normalized) || null;
  }

  /**
   * Mapuje tagi produktu na kategorię
   * @param {string[]} tags - Lista tagów produktu z Baselinkera
   * @returns {object} - { mainCategory, mainSlug, subCategory, subSlug, assignToSlug }
   */
  mapTags(tags) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return this.getFallback();
    }

    // Normalizuj wszystkie tagi
    const normalizedTags = tags.map(t => this.normalizeTag(t)).filter(Boolean);
    
    let mainCategoryTag = null;
    let subcategoryTag = null;
    
    // Szukaj tagu głównej kategorii i podkategorii
    for (const tag of normalizedTags) {
      if (this.isMainCategory(tag)) {
        mainCategoryTag = tag;
      } else if (this.isSubcategory(tag)) {
        subcategoryTag = tag;
        // Jeśli znaleziono podkategorię, możemy wywnioskować główną kategorię
        if (!mainCategoryTag) {
          mainCategoryTag = this.getMainCategoryForSubcategory(tag);
        }
      }
    }

    // Jeśli mamy tylko podkategorię bez głównej, przypisz główną
    if (subcategoryTag && !mainCategoryTag) {
      mainCategoryTag = this.getMainCategoryForSubcategory(subcategoryTag);
    }

    // Jeśli nie znaleziono żadnej kategorii
    if (!mainCategoryTag) {
      return this.getFallback();
    }

    const mainData = this.config.categoryTree[mainCategoryTag];
    if (!mainData) {
      return this.getFallback();
    }

    // Jeśli mamy podkategorię
    if (subcategoryTag && mainData.subcategories && mainData.subcategories[subcategoryTag]) {
      const subData = mainData.subcategories[subcategoryTag];
      return {
        mainCategory: mainCategoryTag,
        mainSlug: mainData.slug,
        subCategory: subcategoryTag,
        subSlug: subData.slug,
        // Produkt trafia do podkategorii
        assignToSlug: subData.slug,
        hasSubcategory: true
      };
    }

    // Mamy główną kategorię bez podkategorii w tagach
    // Produkt trafia bezpośrednio do głównej kategorii
    // (nawet jeśli główna kategoria ma zdefiniowane podkategorie)
    return {
      mainCategory: mainCategoryTag,
      mainSlug: mainData.slug,
      subCategory: null,
      subSlug: null,
      // Produkt trafia do głównej kategorii
      assignToSlug: mainData.slug,
      hasSubcategory: false,
      note: 'Produkt ma tylko tag głównej kategorii'
    };
  }

  getFallback() {
    return {
      mainCategory: null,
      mainSlug: null,
      subCategory: null,
      subSlug: null,
      assignToSlug: this.config.fallbackCategory?.slug || 'inne',
      hasSubcategory: false,
      isFallback: true
    };
  }

  /**
   * Pobiera pełną strukturę kategorii (do tworzenia w bazie danych)
   */
  getCategoryStructure() {
    const structure = [];
    
    for (const [mainTag, mainData] of Object.entries(this.config.categoryTree)) {
      const mainCat = {
        name: mainTag,
        slug: mainData.slug,
        order: mainData.order || 999,
        isContainer: true, // Główne kategorie to kontenery
        subcategories: []
      };
      
      if (mainData.subcategories) {
        for (const [subTag, subData] of Object.entries(mainData.subcategories)) {
          mainCat.subcategories.push({
            name: subTag,
            slug: subData.slug,
            order: 0,
            isContainer: false
          });
        }
      }
      
      structure.push(mainCat);
    }
    
    // Sortuj po order
    structure.sort((a, b) => a.order - b.order);
    
    return structure;
  }

  /**
   * Testuje mapowanie dla listy tagów
   */
  testMapping(tagsList) {
    console.log('\n=== TEST MAPOWANIA TAGÓW ===\n');
    
    for (const tags of tagsList) {
      const result = this.mapTags(tags);
      console.log(`Tagi: [${tags.join(', ')}]`);
      if (result.subCategory) {
        console.log(`  → ${result.mainCategory} > ${result.subCategory}`);
      } else if (result.mainCategory) {
        console.log(`  → ${result.mainCategory} (bez podkategorii)`);
      } else {
        console.log(`  → Inne (fallback)`);
      }
      console.log(`  Slug do przypisania: ${result.assignToSlug}`);
      console.log('');
    }
  }
}

// Export
module.exports = { CategoryTagMapper };

// Jeśli uruchomiony bezpośrednio - test
if (require.main === module) {
  const mapper = new CategoryTagMapper();
  
  const testTagsList = [
    ['Elektronika', 'Akcesoria Komputerowe'],
    ['Elektronika', 'Smartfony i telefony'],
    ['Dom i ogród', 'Akcesoria domowe'],
    ['Sport', 'Rekreacja'],
    ['Zdrowie i uroda'], // Bez podkategorii
    ['Biurowe i papiernicze'], // Bez podkategorii
    ['Gastronomiczne', 'naczynia i zastawa'],
    ['Dziecko', 'Zabawki'],
    ['Motoryzacja', 'Folie samochodowe'],
    ['Nieznana kategoria'], // Fallback
    [], // Puste tagi
    ['Akcesoria domowe'], // Tylko podkategoria, bez głównej
    ['turystyka', 'Sport'], // Odwrócona kolejność
  ];

  mapper.testMapping(testTagsList);
  
  console.log('\n=== STRUKTURA KATEGORII ===\n');
  const structure = mapper.getCategoryStructure();
  for (const cat of structure) {
    console.log(`${cat.name} (${cat.slug}) - order: ${cat.order}`);
    for (const sub of cat.subcategories) {
      console.log(`  └─ ${sub.name} (${sub.slug})`);
    }
  }
}
