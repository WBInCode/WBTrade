/**
 * DRY RUN: Import nowych produktów z magazynu zwrotów (outlet)
 * Sprawdza co zostanie dodane BEZ zapisywania do bazy danych.
 * 
 * Uruchom: node dry-run-outlet.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

const OUTLET_INVENTORY_ID = '23662';
const OUTLET_PREFIX = 'outlet-';
const MIN_DELAY = 2500;

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

function getProductName(blProduct) {
  const tf = blProduct.text_fields || {};
  return tf.name || blProduct.name || `Product ${blProduct.id}`;
}

function getProductPrice(blProduct) {
  const prices = blProduct.prices || {};
  const firstKey = Object.keys(prices)[0];
  let raw = 0;
  if (firstKey && prices[firstKey]) {
    raw = parseFloat(prices[firstKey]) || 0;
  } else {
    raw = parseFloat(blProduct.price_brutto) || 0;
  }
  return raw <= 0 ? 0 : Math.floor(raw) + 0.99;
}

async function main() {
  const apiToken = process.env.BASELINKER_API_TOKEN;
  if (!apiToken) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env!');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('  DRY RUN: Import nowych produktów z magazynu zwrotów');
  console.log('  Magazyn: outlet (ID: ' + OUTLET_INVENTORY_ID + ')');
  console.log('  Prefix: ' + OUTLET_PREFIX);
  console.log('  ⚠️  BEZ ZAPISYWANIA DO BAZY - TYLKO PODGLĄD');
  console.log('='.repeat(60));

  // 1. Pobierz listę produktów z BL
  console.log('\n📋 Pobieranie listy produktów z Baselinker...');
  let allProducts = [];
  let page = 1;
  while (true) {
    const res = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: parseInt(OUTLET_INVENTORY_ID),
      page,
    });
    const products = Object.entries(res.products || {}).map(([id, p]) => ({ ...p, id: parseInt(id) }));
    if (products.length === 0) break;
    allProducts = allProducts.concat(products);
    console.log(`   Strona ${page}: ${products.length} produktów (razem: ${allProducts.length})`);
    page++;
  }
  console.log(`\n📦 Łączna liczba produktów w BL: ${allProducts.length}`);

  // 2. Pobierz stany magazynowe
  console.log('\n📊 Pobieranie stanów magazynowych...');
  let allStock = [];
  page = 1;
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

  const stockMap = new Map();
  for (const entry of allStock) {
    const total = Object.values(entry.stock).reduce((sum, qty) => sum + qty, 0);
    stockMap.set(entry.product_id, total);
  }
  console.log(`   Stany magazynowe dla ${stockMap.size} produktów`);

  // 3. Sprawdź co już jest w bazie
  console.log('\n🔍 Sprawdzanie istniejących produktów w bazie...');
  const existingProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: OUTLET_PREFIX } },
    select: { baselinkerProductId: true, name: true, sku: true },
  });
  const existingSet = new Set(existingProducts.map(p => p.baselinkerProductId));
  console.log(`   Istniejące produkty outlet w bazie: ${existingProducts.length}`);

  // 4. Analizuj
  const newProducts = [];
  const existingSkipped = [];
  const zeroStockSkipped = [];
  const noStockDataSkipped = [];

  for (const blProduct of allProducts) {
    const prefixedId = `${OUTLET_PREFIX}${blProduct.id}`;
    const stock = stockMap.get(blProduct.id);

    if (existingSet.has(prefixedId)) {
      existingSkipped.push({ id: blProduct.id, name: blProduct.name || `ID:${blProduct.id}` });
      continue;
    }

    if (stock === undefined) {
      noStockDataSkipped.push({ id: blProduct.id, name: blProduct.name || `ID:${blProduct.id}` });
      continue;
    }

    if (stock <= 0) {
      zeroStockSkipped.push({ id: blProduct.id, name: blProduct.name || `ID:${blProduct.id}`, stock });
      continue;
    }

    newProducts.push({ id: blProduct.id, name: blProduct.name || `ID:${blProduct.id}`, stock, price: blProduct.price_brutto });
  }

  // 5. Pobierz szczegóły nowych produktów (max 20 na podgląd)
  let detailedNew = [];
  if (newProducts.length > 0) {
    const idsToFetch = newProducts.slice(0, 20).map(p => p.id);
    console.log(`\n📥 Pobieranie szczegółów ${idsToFetch.length} nowych produktów...`);
    const res = await blRequest(apiToken, 'getInventoryProductsData', {
      inventory_id: parseInt(OUTLET_INVENTORY_ID),
      products: idsToFetch,
    });
    const productsData = res.products || {};
    for (const [id, data] of Object.entries(productsData)) {
      detailedNew.push({
        id: parseInt(id),
        name: getProductName(data),
        price: getProductPrice(data),
        stock: stockMap.get(parseInt(id)) || 0,
        ean: data.ean || data.text_fields?.ean || '-',
        images: data.images ? Object.keys(data.images).length : 0,
        variants: data.variants ? data.variants.length : 0,
        tags: (data.tags || []).join(', ') || '-',
      });
    }
  }

  // 6. RAPORT
  console.log('\n' + '='.repeat(60));
  console.log('  📊 RAPORT DRY RUN');
  console.log('='.repeat(60));
  console.log(`\n  Łącznie produktów w BL:          ${allProducts.length}`);
  console.log(`  Już istnieje w bazie:            ${existingSkipped.length}`);
  console.log(`  Pominięte (zerowy stan):         ${zeroStockSkipped.length}`);
  console.log(`  Pominięte (brak danych stanu):   ${noStockDataSkipped.length}`);
  console.log(`  ✅ NOWE DO DODANIA:               ${newProducts.length}`);

  if (detailedNew.length > 0) {
    console.log('\n  📋 Podgląd nowych produktów (max 20):');
    console.log('  ' + '-'.repeat(56));
    for (const p of detailedNew) {
      console.log(`  ${OUTLET_PREFIX}${p.id} | ${p.name.substring(0, 40).padEnd(40)} | ${String(p.price).padStart(8)} zł | stok: ${p.stock} | img: ${p.images} | var: ${p.variants}`);
      if (p.tags !== '-') console.log(`    tagi: ${p.tags}`);
    }
    if (newProducts.length > 20) {
      console.log(`\n  ... i ${newProducts.length - 20} więcej`);
    }
  }

  if (zeroStockSkipped.length > 0 && zeroStockSkipped.length <= 20) {
    console.log('\n  ⚠️  Pominięte z zerowym stanem:');
    for (const p of zeroStockSkipped) {
      console.log(`    ${OUTLET_PREFIX}${p.id} | ${p.name.substring(0, 50)}`);
    }
  } else if (zeroStockSkipped.length > 20) {
    console.log(`\n  ⚠️  Pominięte z zerowym stanem: ${zeroStockSkipped.length} produktów (zbyt dużo żeby wyświetlić)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('  ⚠️  To był DRY RUN — nic nie zostało zapisane do bazy.');
  console.log('  Aby faktycznie zaimportować, użyj panelu admina.');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
