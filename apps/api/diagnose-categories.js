// Diagnose: Why do 470 BTP products have category in BL but not in our DB?
// Check if there are unmapped category_ids
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const BTP_INVENTORY_ID = 22953;

async function blRequest(token, method, params = {}) {
  const { default: fetch } = await import('node-fetch');
  const resp = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `token=${token}&method=${method}&parameters=${encodeURIComponent(JSON.stringify(params))}`,
  });
  const data = await resp.json();
  if (data.status === 'ERROR') throw new Error(`BL ${method}: ${data.error_message}`);
  return data;
}

async function getToken() {
  try {
    const config = await prisma.baselinkerConfig.findFirst();
    if (config) {
      const key = process.env.BASELINKER_ENCRYPTION_KEY;
      if (key) {
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(config.encryptionIv, 'hex'));
        decipher.setAuthTag(Buffer.from(config.authTag, 'hex'));
        let token = decipher.update(config.apiTokenEncrypted, 'hex', 'utf8');
        token += decipher.final('utf8');
        return token;
      }
    }
  } catch (e) {}
  return process.env.BASELINKER_API_TOKEN;
}

(async () => {
  const token = await getToken();

  // 1. Get our DB category map
  const dbCats = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { id: true, name: true, baselinkerCategoryId: true },
  });
  const categoryMap = new Map();
  for (const c of dbCats) {
    categoryMap.set(parseInt(c.baselinkerCategoryId), c.name);
  }
  console.log(`DB categories with BL id: ${categoryMap.size}`);

  // 2. Get product list from BL (first 3 pages = ~3000 products) to see category_id distribution
  console.log('\nPobieranie listy produktów z BL...');
  let allProducts = [];
  let page = 1;
  while (true) {
    const resp = await blRequest(token, 'getInventoryProductsList', {
      inventory_id: BTP_INVENTORY_ID,
      page,
    });
    const products = Object.entries(resp.products || {}).map(([id, p]) => ({ id: parseInt(id), ...p }));
    if (products.length === 0) break;
    allProducts = allProducts.concat(products);
    console.log(`  Strona ${page}: ${products.length} (razem: ${allProducts.length})`);
    page++;
  }
  console.log(`Łącznie w BL: ${allProducts.length}`);

  // 3. Check which category_ids are in BL product list
  const catIdCounts = {};
  let noCatCount = 0;
  let hasCatCount = 0;
  const unmappedCatIds = {};

  for (const p of allProducts) {
    const catId = p.category_id ? parseInt(p.category_id) : null;
    if (!catId || catId === 0) {
      noCatCount++;
    } else {
      hasCatCount++;
      catIdCounts[catId] = (catIdCounts[catId] || 0) + 1;
      if (!categoryMap.has(catId)) {
        unmappedCatIds[catId] = (unmappedCatIds[catId] || 0) + 1;
      }
    }
  }

  console.log(`\n=== ANALIZA CATEGORY_ID Z PRODUCT LIST ===`);
  console.log(`Produkty z category_id > 0:  ${hasCatCount}`);
  console.log(`Produkty bez category_id:    ${noCatCount}`);
  console.log(`Unikalne category_id w BL:   ${Object.keys(catIdCounts).length}`);
  console.log(`Zmapowane w DB:              ${categoryMap.size}`);

  const unmappedEntries = Object.entries(unmappedCatIds).sort((a, b) => b[1] - a[1]);
  if (unmappedEntries.length > 0) {
    console.log(`\n⚠️ NIEZMAPOWANE CATEGORY_ID (${unmappedEntries.length} kategorii, ${unmappedEntries.reduce((s, [, c]) => s + c, 0)} produktów):`);
    for (const [catId, count] of unmappedEntries) {
      console.log(`   BL cat_id=${catId}: ${count} produktów`);
    }
  } else {
    console.log('\n✅ Wszystkie category_id z BL są zmapowane w DB!');
  }

  // 4. Now check: Does getInventoryProductsData also return category_id?
  // Pick a sample product and verify
  const sampleIds = allProducts.slice(0, 5).map(p => p.id);
  console.log(`\nSprawdzam getInventoryProductsData (sample: ${sampleIds.join(', ')})...`);
  const detResp = await blRequest(token, 'getInventoryProductsData', {
    inventory_id: BTP_INVENTORY_ID,
    products: sampleIds,
  });
  for (const [id, prod] of Object.entries(detResp.products || {})) {
    console.log(`  id=${id} category_id=${prod.category_id} name=${(prod.text_fields?.name || '').slice(0, 40)}`);
  }

  // 5. Check: products in DB without category but with BL data that HAS category_id
  // Get 20 BTP products without category from DB
  const btpNoCat = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'btp-' }, categoryId: null },
    select: { baselinkerProductId: true, name: true },
    take: 20,
  });

  // Extract their BL IDs and check in the BL product list
  console.log(`\n=== SAMPLE: BTP produkty BEZ kategorii w DB ===`);
  for (const p of btpNoCat.slice(0, 10)) {
    const blId = parseInt(p.baselinkerProductId.replace('btp-', ''));
    const blProd = allProducts.find(pr => pr.id === blId);
    const catId = blProd?.category_id || 'N/A';
    const mapped = catId !== 'N/A' && categoryMap.has(parseInt(catId)) ? '✅ zmapowana' : '❌ brak w DB';
    console.log(`  ${p.baselinkerProductId} | BL cat_id=${catId} ${mapped} | ${p.name?.slice(0, 50)}`);
  }

  await prisma.$disconnect();
})();
