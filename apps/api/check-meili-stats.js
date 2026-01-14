// Quick script to check MeiliSearch stats
const { MeiliSearch } = require('meilisearch');
require('dotenv').config();

const MEILISEARCH_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILI_MASTER_KEY || 'wbtrade_meili_key_change_in_production';

const client = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY,
});

async function checkStats() {
  try {
    console.log('🔍 Checking MeiliSearch stats...');
    console.log('Host:', MEILISEARCH_HOST);
    
    const index = client.index('products');
    const stats = await index.getStats();
    
    console.log('\n📊 Products Index Stats:');
    console.log('  Total documents:', stats.numberOfDocuments);
    console.log('  Is indexing:', stats.isIndexing);
    console.log('  Field distribution:', JSON.stringify(stats.fieldDistribution, null, 2));
    
    // Test a simple search
    const searchResult = await index.search('', {
      limit: 1,
      offset: 0,
    });
    
    console.log('\n🔎 Search test:');
    console.log('  estimatedTotalHits:', searchResult.estimatedTotalHits);
    console.log('  totalHits:', searchResult.totalHits);
    console.log('  hits.length:', searchResult.hits.length);
    
    // Test category search
    const categoryResult = await index.search('', {
      limit: 1,
      offset: 0,
      filter: 'categoryName = "Telefony i akcesoria"',
    });
    
    console.log('\n📱 Category "Telefony i akcesoria" test:');
    console.log('  estimatedTotalHits:', categoryResult.estimatedTotalHits);
    console.log('  totalHits:', categoryResult.totalHits);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
  }
}

checkStats();
