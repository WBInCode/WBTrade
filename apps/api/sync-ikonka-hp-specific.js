/**
 * Synchronizacja tagów dla konkretnych produktów Ikonka i HP
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const MIN_DELAY = 2500;
let lastRequest = 0;

// Produkty Ikonka (numeryczne ID)
const IKONKA_IDS = [
  '212537773',
  '212537774',
  '212537926',
  '212537927',
  '212538938',
  '212538940',
  '212539971',
  '212539972',
  '212539974',
  '212540116',
  '212540118',
  '212541908',
];

// Produkt HP
const HP_IDS = ['212571223'];

const IKONKA_INVENTORY_ID = 22951;
const HP_INVENTORY_ID = 22954;

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

async function syncProducts(apiToken, productIds, inventoryId, warehouseName, prefix) {
  console.log(`\n=== ${warehouseName} (${productIds.length} produktów) ===\n`);
  
  let updated = 0, unchanged = 0, notFound = 0, errors = 0;

  const resp = await blRequest(apiToken, 'getInventoryProductsData', {
    inventory_id: inventoryId,
    products: productIds,
  });

  for (const productId of productIds) {
    try {
      const blProduct = resp.products?.[productId];
      
      if (!blProduct) {
        console.log(`  ⚠️ ID ${productId}: Nie znaleziono w BaseLinker`);
        notFound++;
        continue;
      }

      // Szukaj w bazie - dla Ikonka to numeryczne ID, dla HP to hp-XXXXXX
      const baselinkerProductId = prefix ? `${prefix}${productId}` : productId;
      const dbProduct = await prisma.product.findUnique({
        where: { baselinkerProductId },
        select: { id: true, name: true, tags: true }
      });
      
      if (!dbProduct) {
        console.log(`  ⚠️ ID ${productId}: Nie znaleziono w bazie (szukano: ${baselinkerProductId})`);
        notFound++;
        continue;
      }

      const newTags = getProductTags(blProduct);
      const currentTags = dbProduct.tags || [];
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

  return { updated, unchanged, notFound, errors };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  SYNCHRONIZACJA TAGÓW: IKONKA + HP - WYBRANE PRODUKTY      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const apiToken = process.env.BASELINKER_API_TOKEN;

  if (!apiToken) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  let totalUpdated = 0, totalUnchanged = 0, totalNotFound = 0, totalErrors = 0;

  // Sync Ikonka
  const ikonkaResult = await syncProducts(apiToken, IKONKA_IDS, IKONKA_INVENTORY_ID, 'IKONKA', '');
  totalUpdated += ikonkaResult.updated;
  totalUnchanged += ikonkaResult.unchanged;
  totalNotFound += ikonkaResult.notFound;
  totalErrors += ikonkaResult.errors;

  // Sync HP
  const hpResult = await syncProducts(apiToken, HP_IDS, HP_INVENTORY_ID, 'HP', 'hp-');
  totalUpdated += hpResult.updated;
  totalUnchanged += hpResult.unchanged;
  totalNotFound += hpResult.notFound;
  totalErrors += hpResult.errors;

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      PODSUMOWANIE                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  📊 Przetworzono:    ${IKONKA_IDS.length + HP_IDS.length}`);
  console.log(`  ✅ Zaktualizowano:  ${totalUpdated}`);
  console.log(`  ⏭️  Bez zmian:       ${totalUnchanged}`);
  console.log(`  ⚠️  Nie znaleziono:  ${totalNotFound}`);
  console.log(`  ❌ Błędy:           ${totalErrors}`);
  console.log(`  ⏱️  Czas:            ${elapsed}s`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
