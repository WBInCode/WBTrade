/**
 * Synchronizacja tagów dla produktów HP - V2
 * Większość SKU w bazie to "hp-XXXXXX" (nie numeryczne)
 * Dopasowanie przez baselinkerProductId
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const MIN_DELAY = 2500;
let lastRequest = 0;

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

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SYNCHRONIZACJA TAGÓW: HP (V2 - po baselinkerProductId) ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const apiToken = process.env.BASELINKER_API_TOKEN;

  if (!apiToken) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  // Pobierz wszystkie produkty HP z bazy
  console.log('📥 Ładowanie produktów HP z bazy danych...');
  const hpProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'hp-' } },
    select: { id: true, sku: true, tags: true, baselinkerProductId: true },
  });
  
  // Zbuduj mapę: baselinkerProductId -> produkt
  // baselinkerProductId format: "hp-212560801"
  // BaseLinker product ID: 212560801
  const blIdMap = new Map();
  for (const p of hpProducts) {
    if (p.baselinkerProductId) {
      // Wyciągnij numer z "hp-212560801" -> "212560801"
      const numericId = p.baselinkerProductId.replace('hp-', '');
      blIdMap.set(numericId, p);
    }
  }
  console.log(`✅ Załadowano ${hpProducts.length} produktów HP\n`);

  // Pobierz listę produktów z BaseLinker
  console.log('📋 Pobieranie listy produktów z BaseLinker...');
  let allProducts = [];
  let page = 1;

  while (true) {
    const resp = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: HP_INVENTORY_ID,
      page,
    });
    const products = Object.values(resp.products || {});
    if (products.length === 0) break;
    allProducts = allProducts.concat(products);
    console.log(`  Strona ${page}: ${products.length} produktów (razem: ${allProducts.length})`);
    page++;
  }

  console.log(`\n📊 Produkty w BaseLinker: ${allProducts.length}`);

  let matched = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  const BATCH_SIZE = 100;
  const productIds = allProducts.map(p => p.id);

  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batchIds = productIds.slice(i, i + BATCH_SIZE);

    // Pobierz szczegóły produktów
    const resp = await blRequest(apiToken, 'getInventoryProductsData', {
      inventory_id: HP_INVENTORY_ID,
      products: batchIds,
    });

    for (const [productId, blProduct] of Object.entries(resp.products || {})) {
      try {
        // Szukaj po productId (numerycznym) w naszej mapie
        const dbProduct = blIdMap.get(productId);

        if (!dbProduct) continue;
        matched++;

        // Pobierz tagi z BaseLinker
        const newTags = getProductTags(blProduct);
        const currentTags = dbProduct.tags || [];

        // Sprawdź czy się różnią
        const currentSorted = [...currentTags].sort().join(',');
        const newSorted = [...newTags].sort().join(',');

        if (currentSorted !== newSorted) {
          await prisma.product.update({
            where: { id: dbProduct.id },
            data: { tags: newTags },
          });
          updated++;
          if (updated <= 10) {
            console.log(`  ✏️ ${dbProduct.sku}: ${JSON.stringify(currentTags)} → ${JSON.stringify(newTags)}`);
          }
        } else {
          unchanged++;
        }
      } catch (e) {
        errors++;
        if (errors <= 3) console.log(`  ❌ Błąd: ${e.message}`);
      }
    }

    const progress = Math.min(i + BATCH_SIZE, productIds.length);
    if (progress % 1000 === 0 || progress === productIds.length) {
      console.log(`  Progress: ${progress}/${productIds.length} | matched: ${matched} | updated: ${updated}`);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 PODSUMOWANIE');
  console.log('═'.repeat(60));
  console.log(`⏱️  Czas: ${elapsed}s`);
  console.log(`🔗 Dopasowanych produktów: ${matched}`);
  console.log(`✏️  Zaktualizowanych tagów: ${updated}`);
  console.log(`✅ Bez zmian: ${unchanged}`);
  console.log(`❌ Błędów: ${errors}`);

  await prisma.$disconnect();
}

main().catch(console.error);
