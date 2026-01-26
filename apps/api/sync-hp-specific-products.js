/**
 * Synchronizacja tagów dla KONKRETNYCH produktów HP
 * Lista produktów podana przez użytkownika
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const MIN_DELAY = 2500;
let lastRequest = 0;

const HP_INVENTORY_ID = 22954;

// Lista produktów do synchronizacji (ID z BaseLinker)
const PRODUCT_IDS = [
  '212579691',
  '212581260',
  '212581274',
  '212582362',
  '212583318',
  '212583319',
  '212585754',
  '212589648',
  '212596438',
  '212596443',
  '212596449',
  '212596455',
  '212596460',
  '212596467',
  '212596968',
  '212596973',
  '212596980',
  '212596985',
  '212596992',
  '212596999',
  '212597004',
  '212597011',
  '212599191',
  '212599493',
  '212623518',
  '212623695',
  '212624069',
  '212624132',
  '212624154',
  '212624211',
  '212624261',
  '212624287',
  '212624305',
  '212624322',
  '212624408',
  '212624446',
  '212624449',
  '212624558',
  '212624840',
  '212624847',
  '212625103',
  '212625107',
  '212631492',
  '212631497',
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
    try {
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
        if (data.error_message?.includes('Query limit')) {
          console.log('⏳ Rate limit, czekam 60s...');
          await new Promise(r => setTimeout(r, 60000));
          continue;
        }
        throw new Error(data.error_message);
      }
      return data;
    } catch (e) {
      if (attempt < 4) {
        console.log(`⚠️ Błąd, ponawiam (${attempt + 1}/5)...`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw e;
      }
    }
  }
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

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  SYNCHRONIZACJA TAGÓW: HP - WYBRANE PRODUKTY (44 szt.)     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const apiToken = process.env.BASELINKER_API_TOKEN;

  if (!apiToken) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  console.log(`📋 Produktów do synchronizacji: ${PRODUCT_IDS.length}\n`);

  // Pobierz produkty HP z bazy które pasują do naszej listy
  console.log('📥 Ładowanie produktów HP z bazy danych...');
  
  // Budujemy listę baselinkerProductId do wyszukania (format: hp-XXXXXX)
  const blProductIds = PRODUCT_IDS.map(id => `hp-${id}`);
  
  const hpProducts = await prisma.product.findMany({
    where: { 
      baselinkerProductId: { in: blProductIds }
    },
    select: { id: true, sku: true, tags: true, baselinkerProductId: true, name: true },
  });
  
  console.log(`✅ Znaleziono ${hpProducts.length} produktów w bazie\n`);
  
  // Zbuduj mapę: numericId -> produkt
  const blIdMap = new Map();
  for (const p of hpProducts) {
    if (p.baselinkerProductId) {
      const numericId = p.baselinkerProductId.replace('hp-', '');
      blIdMap.set(numericId, p);
    }
  }

  // Pobierz szczegóły produktów z BaseLinker
  console.log('🔄 Pobieranie tagów z BaseLinker...\n');
  
  let updated = 0;
  let unchanged = 0;
  let notFound = 0;
  let errors = 0;

  const BATCH_SIZE = 100;

  for (let i = 0; i < PRODUCT_IDS.length; i += BATCH_SIZE) {
    const batchIds = PRODUCT_IDS.slice(i, i + BATCH_SIZE);

    const resp = await blRequest(apiToken, 'getInventoryProductsData', {
      inventory_id: HP_INVENTORY_ID,
      products: batchIds,
    });

    for (const productId of batchIds) {
      try {
        const blProduct = resp.products?.[productId];
        
        if (!blProduct) {
          console.log(`  ⚠️ ID ${productId}: Nie znaleziono w BaseLinker`);
          notFound++;
          continue;
        }

        const dbProduct = blIdMap.get(productId);
        
        if (!dbProduct) {
          console.log(`  ⚠️ ID ${productId}: Nie znaleziono w bazie danych`);
          notFound++;
          continue;
        }

        // Pobierz tagi z BaseLinker
        const newTags = getProductTags(blProduct);
        const currentTags = dbProduct.tags || [];

        // Sprawdź czy się różnią
        const currentSorted = [...currentTags].sort().join(',');
        const newSorted = [...newTags].sort().join(',');

        const productName = (blProduct.text_fields?.name || dbProduct.name || '').substring(0, 50);

        if (currentSorted !== newSorted) {
          await prisma.product.update({
            where: { id: dbProduct.id },
            data: { tags: newTags },
          });
          updated++;
          console.log(`  ✅ ${productId}: "${productName}..."`);
          console.log(`     Stare: ${JSON.stringify(currentTags)}`);
          console.log(`     Nowe:  ${JSON.stringify(newTags)}\n`);
        } else {
          unchanged++;
          console.log(`  ⏭️  ${productId}: bez zmian (${JSON.stringify(currentTags)})`);
        }
      } catch (e) {
        errors++;
        console.log(`  ❌ ${productId}: Błąd - ${e.message}`);
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      PODSUMOWANIE                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  📊 Przetworzono:    ${PRODUCT_IDS.length}`);
  console.log(`  ✅ Zaktualizowano:  ${updated}`);
  console.log(`  ⏭️  Bez zmian:       ${unchanged}`);
  console.log(`  ⚠️  Nie znaleziono:  ${notFound}`);
  console.log(`  ❌ Błędy:           ${errors}`);
  console.log(`  ⏱️  Czas:            ${elapsed}s`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
