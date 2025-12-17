import { MeiliSearch, Index } from 'meilisearch';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || 'wbtrade_meili_key_change_in_production';

export const meiliClient = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY,
});

export const PRODUCTS_INDEX = 'products';

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
    ]);

    // Configure filterable attributes
    await meiliClient.index(PRODUCTS_INDEX).updateFilterableAttributes([
      'categoryId',
      'categoryName',
      'price',
      'status',
    ]);

    // Configure sortable attributes
    await meiliClient.index(PRODUCTS_INDEX).updateSortableAttributes([
      'price',
      'name',
      'createdAt',
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
