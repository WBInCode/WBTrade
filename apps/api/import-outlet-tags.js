/**
 * Import tagów z Baselinkera dla produktów outlet (magazyn zwrotów)
 * i zaktualizuj tagi w bazie danych, zachowując 'outlet' i 'zwrot'.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const OUTLET_INVENTORY_ID = 23662;
const MIN_DELAY = 2500;
let lastRequest = 0;

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

async function main() {
  const apiToken = process.env.BASELINKER_API_TOKEN;
  if (!apiToken) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════');
  console.log('  IMPORT TAGÓW OUTLET Z BASELINKERA');
  console.log('═══════════════════════════════════════════\n');

  // 1. Pobierz listę produktów z outlet inventory
  console.log('📋 Pobieranie listy produktów z magazynu zwrotów...');
  const allProductIds = [];
  let page = 1;
  while (true) {
    const resp = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: OUTLET_INVENTORY_ID,
      page: page,
    });
    if (!resp.products || Object.keys(resp.products).length === 0) break;
    allProductIds.push(...Object.keys(resp.products));
    console.log(`   Strona ${page}: ${Object.keys(resp.products).length} produktów`);
    page++;
  }
  console.log(`   Łącznie: ${allProductIds.length} produktów\n`);

  // 2. Pobierz szczegóły produktów (w partach po 100)
  console.log('📥 Pobieranie szczegółów produktów (tagi)...');
  const productsData = {};
  const BATCH_SIZE = 100;
  for (let i = 0; i < allProductIds.length; i += BATCH_SIZE) {
    const batch = allProductIds.slice(i, i + BATCH_SIZE);
    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allProductIds.length / BATCH_SIZE)}...`);
    const resp = await blRequest(apiToken, 'getInventoryProductsData', {
      inventory_id: OUTLET_INVENTORY_ID,
      products: batch.map(Number),
    });
    if (resp.products) {
      Object.assign(productsData, resp.products);
    }
  }
  console.log(`   Pobrano szczegóły ${Object.keys(productsData).length} produktów\n`);

  // 3. Aktualizuj tagi w bazie danych
  console.log('🔄 Aktualizacja tagów w bazie danych...');
  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (const [blProductId, blProduct] of Object.entries(productsData)) {
    const baselinkerProductId = `outlet-${blProductId}`;
    
    try {
      const product = await prisma.product.findUnique({
        where: { baselinkerProductId },
        select: { id: true, name: true, tags: true },
      });

      if (!product) {
        notFound++;
        continue;
      }

      // Tagi z Baselinkera
      const blTags = (blProduct.tags || []).map(t => t.trim()).filter(Boolean);
      
      // Połącz: zachowaj 'outlet' i 'zwrot', dodaj tagi z BL
      const mergedTags = ['outlet', 'zwrot'];
      for (const tag of blTags) {
        if (!mergedTags.includes(tag)) {
          mergedTags.push(tag);
        }
      }

      // Sprawdź czy się zmieniło
      const currentTags = product.tags || [];
      const tagsChanged = JSON.stringify(currentTags.sort()) !== JSON.stringify(mergedTags.sort());

      if (tagsChanged) {
        await prisma.product.update({
          where: { id: product.id },
          data: { tags: mergedTags },
        });
        updated++;
        console.log(`  ✅ ${product.name.substring(0, 50)}... → [${mergedTags.join(', ')}]`);
      } else {
        skipped++;
      }
    } catch (e) {
      errors++;
      console.error(`  ❌ ${baselinkerProductId}: ${e.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`  WYNIKI:`);
  console.log(`  Zaktualizowano: ${updated}`);
  console.log(`  Bez zmian: ${skipped}`);
  console.log(`  Nie znaleziono w BD: ${notFound}`);
  console.log(`  Błędy: ${errors}`);
  console.log('═══════════════════════════════════════════\n');

  // Weryfikacja - pokaż kilka przykładów
  const sample = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'outlet-' } },
    select: { name: true, tags: true },
    take: 5,
  });
  console.log('Przykłady:');
  for (const p of sample) {
    console.log(`  ${p.name.substring(0, 40)}... → [${p.tags.join(', ')}]`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
