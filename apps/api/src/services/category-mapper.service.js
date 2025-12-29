/**
 * Category Mapping Service
 * 
 * Mapuje kategorie z BaseLinker (różne hurtownie) na zunifikowane kategorie sklepu.
 * Analizuje pełną ścieżkę kategorii i szuka słów kluczowych.
 */

const fs = require('fs');
const path = require('path');

class CategoryMapper {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '../../config/category-mapping.json');
    this.config = null;
    this.flatCategories = []; // Spłaszczona lista kategorii z keywords
    this.loadConfig();
  }

  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      this.flattenCategories();
      console.log(`[CategoryMapper] Załadowano ${this.flatCategories.length} reguł mapowania`);
    } catch (error) {
      console.error('[CategoryMapper] Błąd ładowania konfiguracji:', error.message);
      this.config = { mainCategories: [], fallbackCategory: { name: 'Inne', slug: 'inne' } };
    }
  }

  /**
   * Spłaszcza hierarchię kategorii do listy z pełnymi ścieżkami
   */
  flattenCategories() {
    this.flatCategories = [];

    for (const mainCat of this.config.mainCategories) {
      // Dodaj główną kategorię
      if (mainCat.keywords) {
        this.flatCategories.push({
          mainCategory: mainCat.name,
          mainSlug: mainCat.slug,
          subCategory: null,
          subSlug: null,
          keywords: mainCat.keywords.map(k => k.toLowerCase()),
          excludeKeywords: (mainCat.excludeKeywords || []).map(k => k.toLowerCase()),
          priority: mainCat.priority || 0
        });
      }

      // Dodaj podkategorie
      if (mainCat.subcategories) {
        for (const subCat of mainCat.subcategories) {
          this.flatCategories.push({
            mainCategory: mainCat.name,
            mainSlug: mainCat.slug,
            subCategory: subCat.name,
            subSlug: subCat.slug,
            keywords: (subCat.keywords || []).map(k => k.toLowerCase()),
            excludeKeywords: (subCat.excludeKeywords || []).map(k => k.toLowerCase()),
            priority: subCat.priority || 0
          });
        }
      }
    }

    // Sortuj po priorytecie (wyższy = pierwszy)
    this.flatCategories.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Mapuje ścieżkę kategorii z BaseLinker na kategorię sklepu
   * @param {string} blCategoryPath - Pełna ścieżka kategorii z BaseLinker np. "elektronika/komputery i laptopy/laptopy/laptop gamingowy"
   * @param {string} productName - Nazwa produktu (opcjonalnie, dla dodatkowego kontekstu)
   * @returns {object} - { mainCategory, mainSlug, subCategory, subSlug, confidence }
   */
  mapCategory(blCategoryPath, productName = '') {
    if (!blCategoryPath && !productName) {
      return this.getFallback();
    }

    // Normalizuj tekst do wyszukiwania
    const searchText = `${blCategoryPath || ''} ${productName}`.toLowerCase();
    
    let bestMatch = null;
    let bestScore = 0;

    for (const rule of this.flatCategories) {
      // Sprawdź czy nie ma wykluczeń
      const hasExclusion = rule.excludeKeywords.some(ex => searchText.includes(ex));
      if (hasExclusion) continue;

      // Policz dopasowane słowa kluczowe
      let score = 0;
      let matchedKeywords = [];

      for (const keyword of rule.keywords) {
        if (searchText.includes(keyword)) {
          score += keyword.length; // Dłuższe słowa kluczowe = wyższy score
          matchedKeywords.push(keyword);
        }
      }

      // Dodaj bonus za priorytet
      score += rule.priority * 10;

      if (score > bestScore && matchedKeywords.length > 0) {
        bestScore = score;
        bestMatch = {
          ...rule,
          matchedKeywords,
          confidence: Math.min(100, Math.round(score / 2))
        };
      }
    }

    if (bestMatch) {
      return {
        mainCategory: bestMatch.mainCategory,
        mainSlug: bestMatch.mainSlug,
        subCategory: bestMatch.subCategory,
        subSlug: bestMatch.subSlug,
        confidence: bestMatch.confidence,
        matchedKeywords: bestMatch.matchedKeywords
      };
    }

    return this.getFallback();
  }

  getFallback() {
    return {
      mainCategory: this.config.fallbackCategory?.name || 'Inne',
      mainSlug: this.config.fallbackCategory?.slug || 'inne',
      subCategory: null,
      subSlug: null,
      confidence: 0,
      matchedKeywords: []
    };
  }

  /**
   * Testuje mapowanie dla listy ścieżek kategorii
   */
  testMapping(paths) {
    console.log('\n=== TEST MAPOWANIA KATEGORII ===\n');
    
    for (const path of paths) {
      const result = this.mapCategory(path);
      console.log(`Ścieżka: ${path}`);
      console.log(`  → ${result.mainCategory}${result.subCategory ? ' > ' + result.subCategory : ''}`);
      console.log(`  Pewność: ${result.confidence}%, Słowa: ${result.matchedKeywords.join(', ')}`);
      console.log('');
    }
  }
}

// Export
module.exports = { CategoryMapper };

// Jeśli uruchomiony bezpośrednio - test
if (require.main === module) {
  const mapper = new CategoryMapper();
  
  const testPaths = [
    'elektronika/komputery i laptopy/laptopy/laptop gamingowy',
    'telefony i akcesoria/etui i pokrowce/etui do iphone',
    'agd/małe agd/frytownice wolnostojące',
    'gastronomia/urządzenia/frytownice nastawne',
    'narzędzia/spawarki/spawarka mig mag',
    'dom/meble/krzesła biurowe',
    'inne/różne',
    'hurtownia xyz/elektronika/smartfony/samsung galaxy'
  ];

  mapper.testMapping(testPaths);
}
