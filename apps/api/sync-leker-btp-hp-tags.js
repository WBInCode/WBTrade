/**
 * Synchronizacja tagów dla produktów z hurtowni Leker, BTP i HP
 * Dopasowanie po SKU (z prefiksem w bazie danych)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const MIN_DELAY = 2500;
let lastRequest = 0;

// Hurtownie do synchronizacji
const WAREHOUSES = [
  { id: 22952, name: 'Leker', skuPrefix: 'LEKER-' },
  { id: 22953, name: 'BTP', skuPrefix: 'BTP-' },
  { id: 22954, name: 'HP', skuPrefix: 'HP-' },
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

async function syncWarehouseTags(warehouse, apiToken, skuMap) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📦 HURTOWNIA: ${warehouse.name} (ID: ${warehouse.id})`);
  console.log(`${'='.repeat(50)}\n`);

  // Pobierz listę produktów z BaseLinker
  console.log('📋 Pobieranie listy produktów z BaseLinker...');
  let allProducts = [];
  let page = 1;

  while (true) {
    const resp = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: warehouse.id,
      page,
    });
    const products = Object.values(resp.products || {});
    if (products.length === 0) break;
    allProducts = allProducts.concat(products);
    console.log(`  Strona ${page}: ${products.length} produktów (razem: ${allProducts.length})`);
    page++;
  }

  console.log(`\n📊 Produkty w BaseLinker: ${allProducts.length}`);

  // Dopasuj do bazy po SKU
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
      inventory_id: warehouse.id,
      products: batchIds,
    });

    for (const [productId, blProduct] of Object.entries(resp.products || {})) {
      try {
        // Pobierz SKU z BaseLinker
        const blSku = blProduct.sku || blProduct.text_fields?.sku;
        if (!blSku) continue;

        // Szukaj w bazie z prefiksem
        const dbSku = warehouse.skuPrefix + blSku;
        const dbProduct = skuMap.get(dbSku);

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
          if (updated <= 5) {
            console.log(`  ✏️ ${dbSku}: ${JSON.stringify(currentTags)} → ${JSON.stringify(newTags)}`);
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
    if (progress % 500 === 0 || progress === productIds.length) {
      console.log(`  Progress: ${progress}/${productIds.length} | matched: ${matched} | updated: ${updated}`);
    }
  }

  return { matched, updated, unchanged, errors };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SYNCHRONIZACJA TAGÓW: LEKER, BTP, HP                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const apiToken = process.env.BASELINKER_API_TOKEN;

  if (!apiToken) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  // Pobierz wszystkie produkty z bazy i zbuduj mapę po SKU
  console.log('📥 Ładowanie produktów z bazy danych...');
  const allProducts = await prisma.product.findMany({
    select: { id: true, sku: true, tags: true },
  });
  
  const skuMap = new Map();
  for (const p of allProducts) {
    if (p.sku) skuMap.set(p.sku, p);
  }
  console.log(`✅ Załadowano ${allProducts.length} produktów (${skuMap.size} z SKU)\n`);

  // Statystyki
  let totalMatched = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;
  let totalErrors = 0;

  // Synchronizuj każdą hurtownię
  for (const warehouse of WAREHOUSES) {
    const result = await syncWarehouseTags(warehouse, apiToken, skuMap);
    totalMatched += result.matched;
    totalUpdated += result.updated;
    totalUnchanged += result.unchanged;
    totalErrors += result.errors;

    console.log(`\n📈 ${warehouse.name}: matched=${result.matched}, updated=${result.updated}, unchanged=${result.unchanged}, errors=${result.errors}`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 PODSUMOWANIE KOŃCOWE');
  console.log('═'.repeat(60));
  console.log(`⏱️  Czas: ${elapsed}s`);
  console.log(`🔗 Dopasowanych produktów: ${totalMatched}`);
  console.log(`✏️  Zaktualizowanych tagów: ${totalUpdated}`);
  console.log(`✅ Bez zmian: ${totalUnchanged}`);
  console.log(`❌ Błędów: ${totalErrors}`);

  await prisma.$disconnect();
}

main().catch(console.error);
