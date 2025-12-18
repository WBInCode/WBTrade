import { MeiliSearch, Index } from 'meilisearch';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || 'wbtrade_meili_key_change_in_production';

export const meiliClient = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY,
});

export const PRODUCTS_INDEX = 'products';

/**
 * Polish synonyms for better search results
 */
const POLISH_SYNONYMS: Record<string, string[]> = {
  // Electronics
  'telefon': ['smartfon', 'komórka', 'smartphone', 'mobile'],
  'smartfon': ['telefon', 'komórka', 'smartphone', 'mobile'],
  'laptop': ['notebook', 'komputer przenośny', 'ultrabook'],
  'notebook': ['laptop', 'komputer przenośny', 'ultrabook'],
  'komputer': ['pc', 'pecet', 'desktop'],
  'słuchawki': ['headphones', 'słuchaweczki', 'earbuds', 'earphones'],
  'telewizor': ['tv', 'telewizja', 'ekran'],
  'tv': ['telewizor', 'telewizja'],
  'tablet': ['ipad', 'tablecik'],
  'klawiatura': ['keyboard', 'klaw'],
  'myszka': ['mysz', 'mouse'],
  'monitor': ['ekran', 'display'],
  'aparat': ['kamera', 'aparat fotograficzny', 'camera'],
  'kamera': ['aparat', 'camera'],
  'ładowarka': ['charger', 'zasilacz'],
  'powerbank': ['power bank', 'bateria zewnętrzna'],
  
  // Fashion
  'buty': ['obuwie', 'trzewiki', 'adidasy', 'tenisówki'],
  'kurtka': ['płaszcz', 'jacket', 'bluza'],
  'spodnie': ['jeansy', 'dżinsy', 'pants', 'spodenki'],
  'koszulka': ['t-shirt', 'tshirt', 'podkoszulek', 'bluzka'],
  'bluza': ['sweter', 'hoodie', 'polar'],
  'sukienka': ['dress', 'suknia'],
  'czapka': ['kapelusz', 'hat', 'beanie'],
  
  // Home
  'sofa': ['kanapa', 'wersalka', 'couch'],
  'kanapa': ['sofa', 'wersalka', 'couch'],
  'krzesło': ['fotel', 'chair', 'taboret'],
  'stół': ['stolik', 'biurko', 'table'],
  'łóżko': ['bed', 'tapczan'],
  'szafa': ['garderoba', 'wardrobe', 'szafka'],
  'lampa': ['oświetlenie', 'żyrandol', 'lampka'],
  
  // Colors
  'biały': ['white', 'śnieżny', 'kremowy'],
  'czarny': ['black', 'ciemny'],
  'czerwony': ['red', 'bordowy', 'karmazynowy'],
  'niebieski': ['blue', 'granatowy', 'błękitny'],
  'zielony': ['green', 'khaki', 'oliwkowy'],
  'żółty': ['yellow', 'złoty'],
  'różowy': ['pink', 'magenta', 'fuksja'],
  'szary': ['grey', 'gray', 'srebrny'],
  
  // Sizes
  'mały': ['small', 's', 'xs', 'mini'],
  'średni': ['medium', 'm', 'mid'],
  'duży': ['large', 'l', 'big', 'xl'],
  
  // General
  'nowy': ['new', 'nowość', 'świeży'],
  'tani': ['cheap', 'promocja', 'okazja', 'rabat'],
  'promocja': ['sale', 'wyprzedaż', 'rabat', 'okazja'],
  'darmowa dostawa': ['free shipping', 'dostawa gratis', 'bezpłatna dostawa'],
};

/**
 * Polish stop words to ignore in search
 */
const POLISH_STOP_WORDS: string[] = [
  // Polish
  'a', 'aby', 'ach', 'acz', 'ale', 'albo', 'ani', 'aż',
  'bo', 'być', 'była', 'były', 'był', 'będą', 'będzie',
  'co', 'czy', 'czyli',
  'dla', 'do',
  'gdy', 'gdzie', 'go',
  'i', 'ich', 'ile', 'im', 'inna', 'inne', 'inny', 'iż',
  'ja', 'jak', 'jakaś', 'jakiś', 'jako', 'jakże', 'je', 'jeden', 'jednak', 'jej', 'jego', 'jest', 'jestem', 'jeszcze', 'jeśli', 'już',
  'każdy', 'kiedy', 'kto', 'która', 'które', 'który', 'ku',
  'lub',
  'ma', 'mam', 'mi', 'mimo', 'może', 'można', 'mu', 'musi', 'my',
  'na', 'nad', 'nam', 'nas', 'nawet', 'nic', 'nich', 'nie', 'niej', 'nim', 'niż', 'no',
  'o', 'od', 'ok', 'on', 'ona', 'one', 'oni', 'ono', 'oraz', 'oto', 'owszem',
  'pan', 'po', 'pod', 'ponad', 'ponieważ', 'poza', 'przed', 'przede', 'przez', 'przy',
  'sam', 'się', 'skąd', 'są', 'sobie',
  'ta', 'tak', 'także', 'tam', 'te', 'tego', 'tej', 'ten', 'też', 'to', 'tobie', 'tu', 'tutaj', 'twój', 'ty', 'tylko', 'tym',
  'u',
  'w', 'we', 'więc', 'wszystko', 'wtedy', 'wy',
  'z', 'za', 'zaś', 'zawsze', 'ze', 'że', 'żeby',
  
  // English (common in Polish e-commerce)
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'it', 'as', 'be', 'was', 'are', 'been', 'being',
  'this', 'that', 'these', 'those',
  'from', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
];

/**
 * Initialize Meilisearch indexes with proper settings
 */
export async function initializeMeilisearch(): Promise<void> {
  try {
    // Create or get products index
    const index = await meiliClient.getIndex(PRODUCTS_INDEX).catch(async () => {
      console.log('Creating products index...');
      return await meiliClient.createIndex(PRODUCTS_INDEX, { primaryKey: 'id' });
    });

    // Configure searchable attributes
    await meiliClient.index(PRODUCTS_INDEX).updateSearchableAttributes([
      'name',
      'description',
      'sku',
      'categoryName',
      'brand',
      'tags',
    ]);

    // Configure filterable attributes (facets)
    await meiliClient.index(PRODUCTS_INDEX).updateFilterableAttributes([
      'categoryId',
      'categoryName',
      'price',
      'status',
      'brand',
      'color',
      'size',
      'material',
      'inStock',
      'hasDiscount',
      'tags',
    ]);

    // Configure sortable attributes
    await meiliClient.index(PRODUCTS_INDEX).updateSortableAttributes([
      'price',
      'name',
      'createdAt',
      'popularity',
      'rating',
    ]);

    // Configure ranking rules
    await meiliClient.index(PRODUCTS_INDEX).updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ]);

    // Configure typo tolerance for better search results
    await meiliClient.index(PRODUCTS_INDEX).updateTypoTolerance({
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 3,
        twoTypos: 6,
      },
    });

    // Configure Polish synonyms
    await meiliClient.index(PRODUCTS_INDEX).updateSynonyms(POLISH_SYNONYMS);
    console.log('✓ Polish synonyms configured');

    // Configure stop words
    await meiliClient.index(PRODUCTS_INDEX).updateStopWords(POLISH_STOP_WORDS);
    console.log('✓ Polish stop words configured');

    // Configure faceting
    await meiliClient.index(PRODUCTS_INDEX).updateFaceting({
      maxValuesPerFacet: 100,
    });

    // Configure pagination
    await meiliClient.index(PRODUCTS_INDEX).updatePagination({
      maxTotalHits: 10000,
    });

    console.log('✓ Meilisearch initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Meilisearch:', error);
  }
}

/**
 * Get the products index
 */
export function getProductsIndex(): Index {
  return meiliClient.index(PRODUCTS_INDEX);
}
