/**
 * Synchronizacja stanów magazynowych z magazynu zwrotów (outlet)
 * Porównuje stany w BL z bazą i aktualizuje różnice.
 * 
 * Uruchom: node sync-outlet-stock.js [--dry-run]
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

const OUTLET_INVENTORY_ID = '23662';
const OUTLET_PREFIX = 'outlet-';
const MIN_DELAY = 2500;
const DRY_RUN = process.argv.includes('--dry-run');

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

async function main() {
  const apiToken = process.env.BASELINKER_API_TOKEN;
  if (!apiToken) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env!');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('  SYNCHRONIZACJA STANÓW MAGAZYNOWYCH — OUTLET');
  console.log('  Magazyn: magazyn zwrotów (ID: ' + OUTLET_INVENTORY_ID + ')');
  console.log('  Tryb: ' + (DRY_RUN ? '⚠️  DRY RUN (bez zapisu)' : '🟢 LIVE (zapis do bazy)'));
  console.log('='.repeat(60));

  // 1. Pobierz stany z BL
  console.log('\n📊 Pobieranie stanów magazynowych z Baselinker...');
  let allStock = [];
  let page = 1;
  while (true) {
    const res = await blRequest(apiToken, 'getInventoryProductsStock', {
      inventory_id: parseInt(OUTLET_INVENTORY_ID),
      page,
    });
    const entries = Object.entries(res.products || {}).map(([id, data]) => ({
      product_id: parseInt(id),
      stock: data.stock || {},
    }));
    if (entries.length === 0) break;
    allStock = allStock.concat(entries);
    page++;
  }

  const blStockMap = new Map();
  for (const entry of allStock) {
    const total = Object.values(entry.stock).reduce((sum, qty) => sum + qty, 0);
    blStockMap.set(entry.product_id, total);
  }
  console.log(`   Pobrano stany dla ${blStockMap.size} produktów z BL`);

  // 2. Pobierz warianty outlet z bazy + ich stany w inventory
  console.log('\n🔍 Pobieranie danych z bazy...');

  // Znajdź lokalizację MAIN
  let mainLocation = await prisma.location.findFirst({
    where: { code: 'MAIN', type: 'WAREHOUSE', isActive: true },
  });
  if (!mainLocation) {
    console.error('❌ Brak lokalizacji MAIN w bazie!');
    process.exit(1);
  }

  // Pobierz warianty powiązane z produktami outlet
  const outletVariants = await prisma.productVariant.findMany({
    where: {
      product: { baselinkerProductId: { startsWith: OUTLET_PREFIX } },
    },
    select: {
      id: true,
      sku: true,
      baselinkerVariantId: true,
      product: { select: { baselinkerProductId: true, name: true } },
    },
  });

  console.log(`   Znaleziono ${outletVariants.length} wariantów outlet w bazie`);

  // Pobierz obecne stany inventory
  const variantIds = outletVariants.map(v => v.id);
  const existingInventories = await prisma.inventory.findMany({
    where: {
      variantId: { in: variantIds },
      locationId: mainLocation.id,
    },
    select: { variantId: true, quantity: true },
  });

  const dbStockMap = new Map();
  for (const inv of existingInventories) {
    dbStockMap.set(inv.variantId, inv.quantity);
  }

  // 3. Porównaj i znajdź różnice
  const changes = [];
  const noChanges = [];
  const notFoundInBl = [];

  for (const variant of outletVariants) {
    const blProductId = variant.product?.baselinkerProductId;
    if (!blProductId) continue;

    // Wyciągnij numeryczne ID (np. "outlet-12345" → 12345)
    const numericId = parseInt(blProductId.replace(OUTLET_PREFIX, ''));
    if (isNaN(numericId)) continue;

    const blStock = blStockMap.get(numericId);
    const dbStock = dbStockMap.get(variant.id) ?? 0;

    if (blStock === undefined) {
      notFoundInBl.push({
        variantId: variant.id,
        sku: variant.sku,
        name: variant.product?.name || '?',
        dbStock,
      });
      continue;
    }

    if (blStock !== dbStock) {
      changes.push({
        variantId: variant.id,
        sku: variant.sku,
        name: variant.product?.name || '?',
        oldQty: dbStock,
        newQty: blStock,
        diff: blStock - dbStock,
      });
    } else {
      noChanges.push({ sku: variant.sku });
    }
  }

  // 4. Raport
  console.log('\n' + '='.repeat(60));
  console.log('  📊 RAPORT SYNCHRONIZACJI STANÓW');
  console.log('='.repeat(60));
  console.log(`\n  Wariantów outlet w bazie:     ${outletVariants.length}`);
  console.log(`  Produktów z BL stock data:    ${blStockMap.size}`);
  console.log(`  Bez zmian:                    ${noChanges.length}`);
  console.log(`  Nie znaleziono w BL:          ${notFoundInBl.length}`);
  console.log(`  ✅ DO AKTUALIZACJI:            ${changes.length}`);

  if (changes.length > 0) {
    console.log('\n  📋 Zmiany stanów:');
    console.log('  ' + '-'.repeat(56));
    for (const c of changes) {
      const arrow = c.diff > 0 ? `📈 +${c.diff}` : `📉 ${c.diff}`;
      console.log(`  ${(c.sku || '').padEnd(25)} | ${String(c.oldQty).padStart(4)} → ${String(c.newQty).padStart(4)} | ${arrow} | ${c.name.substring(0, 35)}`);
    }
  }

  if (notFoundInBl.length > 0 && notFoundInBl.length <= 20) {
    console.log('\n  ⚠️  Nie znaleziono w BL (produkty usunięte z outlet?):');
    for (const p of notFoundInBl) {
      console.log(`    ${(p.sku || '').padEnd(25)} | stan w bazie: ${p.dbStock} | ${p.name.substring(0, 40)}`);
    }
  }

  // 5. Zapisz zmiany (jeśli nie dry-run)
  if (!DRY_RUN && changes.length > 0) {
    console.log('\n💾 Zapisywanie zmian do bazy...');
    let updated = 0;

    for (const c of changes) {
      await prisma.inventory.upsert({
        where: {
          variantId_locationId: {
            variantId: c.variantId,
            locationId: mainLocation.id,
          },
        },
        update: { quantity: c.newQty },
        create: {
          variantId: c.variantId,
          locationId: mainLocation.id,
          quantity: c.newQty,
          reserved: 0,
        },
      });
      updated++;
    }

    console.log(`   ✅ Zaktualizowano ${updated} wariantów`);
  } else if (DRY_RUN && changes.length > 0) {
    console.log('\n  ⚠️  DRY RUN — nic nie zapisano. Uruchom bez --dry-run aby zapisać.');
  } else {
    console.log('\n  ✅ Wszystkie stany są aktualne!');
  }

  console.log('\n' + '='.repeat(60));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
