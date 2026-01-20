/**
 * ============================================
 * SYNCHRONIZACJA TYLKO TAGÓW Z BASELINKER
 * ============================================
 * 
 * Ten skrypt aktualizuje TYLKO tagi produktów
 * bez zmiany innych danych (nazwa, cena, kategoria)
 * 
 * Użyj gdy wiesz, że tagi zostały zmienione w Baselinker
 * i chcesz je szybko zsynchronizować.
 * 
 * Uruchom: node sync-tags-only.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const MIN_DELAY = 2500;

function getApiToken() {
  const token = process.env.BASELINKER_API_TOKEN;
  if (!token) {
    throw new Error('Brak BASELINKER_API_TOKEN w .env!');
  }
  return token;
}

let lastRequest = 0;

async function blRequest(apiToken, method, parameters = {}) {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < MIN_DELAY) {
    await new Promise(r => setTimeout(r, MIN_DELAY - elapsed));
  }
  lastRequest = Date.now();
  
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));
  
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(BASELINKER_API_URL, {
      method: 'POST',
      headers: {
        'X-BLToken': apiToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    const data = await response.json();
    
    if (data.status === 'ERROR') {
      if (data.error_message?.includes('Query limit') || data.error_message?.includes('token blocked')) {
        console.log('⏳ Rate limit, czekam 60s...');
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }
      throw new Error(`Baselinker error: ${data.error_message}`);
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
    tags = blProduct.text_fields.extra_field_2
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  }
  
  return tags;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          SYNCHRONIZACJA TAGÓW Z BASELINKER                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  const apiToken = getApiToken();
  console.log('✅ Token API OK\n');
  
  // Pobierz magazyny
  console.log('📦 Pobieranie listy magazynów...');
  const invResponse = await blRequest(apiToken, 'getInventories');
  const inventories = invResponse.inventories || [];
  console.log(`   Znaleziono ${inventories.length} magazynów\n`);
  
  // Pobierz produkty z bazy
  console.log('📚 Pobieranie produktów z bazy...');
  const existingProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { not: null } },
    select: { 
      id: true, 
      baselinkerProductId: true, 
      tags: true 
    }
  });
  const existingMap = new Map(
    existingProducts.map(p => [p.baselinkerProductId, p])
  );
  console.log(`   Znaleziono ${existingProducts.length} produktów\n`);
  
  let totalUpdated = 0;
  let totalUnchanged = 0;
  let totalErrors = 0;
  
  for (const inventory of inventories) {
    console.log(`\n📦 Przetwarzam: ${inventory.name} (ID: ${inventory.inventory_id})`);
    
    // Pobierz listę produktów
    let page = 1;
    let allProductIds = [];
    
    while (true) {
      const response = await blRequest(apiToken, 'getInventoryProductsList', {
        inventory_id: parseInt(inventory.inventory_id),
        page
      });
      
      const products = Object.values(response.products || {});
      if (products.length === 0) break;
      
      allProductIds = allProductIds.concat(products.map(p => p.id));
      page++;
    }
    
    console.log(`   📋 Znaleziono ${allProductIds.length} produktów`);
    
    // Filtruj tylko produkty które mamy w bazie
    const relevantIds = allProductIds.filter(id => existingMap.has(id.toString()));
    console.log(`   🔗 Powiązanych z bazą: ${relevantIds.length}`);
    
    // Pobierz szczegóły w batchach
    const BATCH_SIZE = 100;
    let updated = 0;
    let unchanged = 0;
    
    for (let i = 0; i < relevantIds.length; i += BATCH_SIZE) {
      const batchIds = relevantIds.slice(i, i + BATCH_SIZE);
      
      const response = await blRequest(apiToken, 'getInventoryProductsData', {
        inventory_id: parseInt(inventory.inventory_id),
        products: batchIds
      });
      
      const productsData = response.products || {};
      
      for (const [productId, blProduct] of Object.entries(productsData)) {
        try {
          const existingProduct = existingMap.get(productId);
          if (!existingProduct) continue;
          
          // Pobierz nowe tagi z Baselinker
          const newTags = getProductTags(blProduct);
          
          // Porównaj tagi
          const currentTags = existingProduct.tags || [];
          const tagsChanged = JSON.stringify([...currentTags].sort()) !== JSON.stringify([...newTags].sort());
          
          if (tagsChanged) {
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: { tags: newTags }
            });
            updated++;
            
            // Pokaż przykłady zmian
            if (updated <= 5) {
              console.log(`   🏷️  ID ${productId}: ${JSON.stringify(currentTags)} → ${JSON.stringify(newTags)}`);
            }
          } else {
            unchanged++;
          }
          
        } catch (err) {
          totalErrors++;
        }
      }
      
      // Progress
      if ((i + BATCH_SIZE) % 500 === 0) {
        console.log(`   ⏳ Przetworzono ${Math.min(i + BATCH_SIZE, relevantIds.length)}/${relevantIds.length}`);
      }
    }
    
    console.log(`   ✅ Zaktualizowano: ${updated}, bez zmian: ${unchanged}`);
    totalUpdated += updated;
    totalUnchanged += unchanged;
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    PODSUMOWANIE                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`⏱️  Czas: ${elapsed}s`);
  console.log(`🏷️  Tagów zaktualizowanych: ${totalUpdated}`);
  console.log(`✓ Bez zmian: ${totalUnchanged}`);
  console.log(`❌ Błędów: ${totalErrors}`);
  
  console.log('\n🎉 GOTOWE!\n');
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
