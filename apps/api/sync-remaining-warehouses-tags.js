/**
 * Sync tagów dla WSZYSTKICH pozostałych hurtowni (Leker, BTP, HP)
 * Uruchom: node sync-remaining-warehouses-tags.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const MIN_DELAY = 2500;
let lastRequest = 0;

// Hurtownie do synchronizacji (bez Ikonka bo już zrobiona)
const WAREHOUSES = [
  { id: '22952', name: 'Leker' },
  { id: '22953', name: 'BTP' },
  { id: '22954', name: 'HP' },
];

async function blRequest(apiToken, method, parameters = {}) {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < MIN_DELAY) await new Promise(r => setTimeout(r, MIN_DELAY - elapsed));
  lastRequest = Date.now();
  
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));
  
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(BASELINKER_API_URL, {
      method: 'POST',
      headers: { 'X-BLToken': apiToken, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    const data = await response.json();
    if (data.status === 'ERROR') {
      if (data.error_message?.includes('Query limit')) {
        console.log('⏳ Rate limit, czekam 60s...');
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }
      throw new Error(data.error_message);
    }
    return data;
  }
  throw new Error('Max retries exceeded');
}

function getProductTags(blProduct) {
  let tags = [];
  if (Array.isArray(blProduct.tags)) {
    tags = blProduct.tags.map(t => String(t).trim()).filter(Boolean);
  }
  if (tags.length === 0 && blProduct.text_fields?.extra_field_2) {
    tags = blProduct.text_fields.extra_field_2.split(',').map(t => t.trim()).filter(Boolean);
  }
  return tags;
}

async function syncWarehouse(apiToken, warehouse, existingMap) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 HURTOWNIA: ${warehouse.name} (ID: ${warehouse.id})`);
  console.log('='.repeat(60));
  
  // Pobierz listę produktów
  console.log('📋 Pobieranie listy produktów...');
  let allProductIds = [];
  let page = 1;
  
  while (true) {
    const resp = await blRequest(apiToken, 'getInventoryProductsList', { 
      inventory_id: parseInt(warehouse.id), 
      page 
    });
    const products = Object.values(resp.products || {});
    if (products.length === 0) break;
    allProductIds = allProductIds.concat(products.map(p => p.id));
    console.log(`   Strona ${page}: ${products.length} (razem: ${allProductIds.length})`);
    page++;
  }
  
  // Filtruj tylko te które są w bazie
  const relevantIds = allProductIds.filter(id => existingMap.has(id.toString()));
  console.log(`\n   Produkty w Baselinker: ${allProductIds.length}`);
  console.log(`   Powiązanych z bazą: ${relevantIds.length}`);
  
  if (relevantIds.length === 0) {
    console.log('   ⚠️ Brak produktów do synchronizacji');
    return { updated: 0, unchanged: 0, errors: 0 };
  }
  
  let updated = 0, unchanged = 0, errors = 0;
  const BATCH_SIZE = 100;
  
  console.log('\n🔄 Synchronizacja tagów...');
  
  for (let i = 0; i < relevantIds.length; i += BATCH_SIZE) {
    const batchIds = relevantIds.slice(i, i + BATCH_SIZE);
    const resp = await blRequest(apiToken, 'getInventoryProductsData', { 
      inventory_id: parseInt(warehouse.id), 
      products: batchIds 
    });
    
    for (const [productId, blProduct] of Object.entries(resp.products || {})) {
      try {
        const existing = existingMap.get(productId);
        if (!existing) continue;
        
        const newTags = getProductTags(blProduct);
        const currentTags = existing.tags || [];
        const changed = JSON.stringify([...currentTags].sort()) !== JSON.stringify([...newTags].sort());
        
        if (changed) {
          await prisma.product.update({ 
            where: { id: existing.id }, 
            data: { tags: newTags } 
          });
          updated++;
          
          // Pokaż pierwsze 5 aktualizacji
          if (updated <= 5) {
            console.log(`   🏷️  ${productId}: ${JSON.stringify(currentTags)} → ${JSON.stringify(newTags)}`);
          }
        } else {
          unchanged++;
        }
      } catch (e) { 
        errors++; 
      }
    }
    
    // Progress co 500 produktów
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= relevantIds.length) {
      console.log(`   Progress: ${Math.min(i + BATCH_SIZE, relevantIds.length)}/${relevantIds.length} (updated: ${updated})`);
    }
  }
  
  console.log(`\n   ✅ Zaktualizowano: ${updated}`);
  console.log(`   ✓ Bez zmian: ${unchanged}`);
  console.log(`   ❌ Błędów: ${errors}`);
  
  return { updated, unchanged, errors };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   SYNCHRONIZACJA TAGÓW: LEKER, BTP, HP                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  const apiToken = process.env.BASELINKER_API_TOKEN;
  
  if (!apiToken) {
    console.log('❌ Brak BASELINKER_API_TOKEN w .env!');
    return;
  }
  
  // Pobierz wszystkie produkty z bazy
  console.log('📚 Pobieranie produktów z bazy...');
  const existingProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { not: null } },
    select: { id: true, baselinkerProductId: true, tags: true }
  });
  const existingMap = new Map(existingProducts.map(p => [p.baselinkerProductId, p]));
  console.log(`   Znaleziono ${existingProducts.length} produktów`);
  
  // Synchronizuj każdą hurtownię
  let totalUpdated = 0, totalUnchanged = 0, totalErrors = 0;
  
  for (const warehouse of WAREHOUSES) {
    const result = await syncWarehouse(apiToken, warehouse, existingMap);
    totalUpdated += result.updated;
    totalUnchanged += result.unchanged;
    totalErrors += result.errors;
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    PODSUMOWANIE                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`⏱️  Czas: ${elapsed}s`);
  console.log(`🏷️  Zaktualizowano tagów: ${totalUpdated}`);
  console.log(`✓  Bez zmian: ${totalUnchanged}`);
  console.log(`❌ Błędów: ${totalErrors}`);
  
  console.log('\n🎉 GOTOWE!\n');
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
