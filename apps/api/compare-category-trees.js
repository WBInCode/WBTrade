// Pełna diagnoza: porównanie drzewka kategorii BL vs DB + sprawdzenie produktów bez kategorii
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
        let t = decipher.update(config.apiTokenEncrypted, 'hex', 'utf8');
        t += decipher.final('utf8');
        return t;
      }
    }
  } catch (e) {}
  return process.env.BASELINKER_API_TOKEN;
}

(async () => {
  const token = await getToken();

  // ========================================
  // 1. Pobierz drzewko kategorii z BL
  // ========================================
  console.log('📂 Pobieranie drzewka kategorii z Baselinkera...');
  const catResp = await blRequest(token, 'getInventoryCategories', {
    inventory_id: BTP_INVENTORY_ID,
  });
  const blCategories = catResp.categories || [];
  console.log(`   BL kategorie: ${blCategories.length}`);

  // Mapa BL: id -> { name, parent_id }
  const blCatMap = new Map();
  for (const c of blCategories) {
    blCatMap.set(c.category_id, { name: c.name, parent_id: c.parent_id });
  }

  // ========================================
  // 2. Pobierz kategorie z naszej DB
  // ========================================
  console.log('📂 Pobieranie kategorii z bazy danych...');
  const dbCategories = await prisma.category.findMany({
    select: { id: true, name: true, baselinkerCategoryId: true, parentId: true },
  });
  console.log(`   DB kategorie: ${dbCategories.length} (z BL id: ${dbCategories.filter(c => c.baselinkerCategoryId).length})`);

  // DB mapa: baselinkerCategoryId -> category
  const dbByBlId = new Map();
  for (const c of dbCategories) {
    if (c.baselinkerCategoryId) {
      dbByBlId.set(parseInt(c.baselinkerCategoryId), c);
    }
  }

  // ========================================
  // 3. Porównanie: BL vs DB
  // ========================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  PORÓWNANIE DRZEWKA KATEGORII BL vs DB');
  console.log('═══════════════════════════════════════════\n');

  const missingInDb = [];
  const matched = [];
  const nameMismatch = [];

  for (const [blId, blCat] of blCatMap) {
    const dbCat = dbByBlId.get(blId);
    if (!dbCat) {
      missingInDb.push({ blId, name: blCat.name, parent_id: blCat.parent_id });
    } else {
      matched.push({ blId, blName: blCat.name, dbName: dbCat.name, dbId: dbCat.id });
      if (blCat.name.trim() !== dbCat.name.trim()) {
        nameMismatch.push({ blId, blName: blCat.name, dbName: dbCat.name });
      }
    }
  }

  // DB categories not in BL
  const extraInDb = [];
  for (const c of dbCategories) {
    if (c.baselinkerCategoryId && !blCatMap.has(parseInt(c.baselinkerCategoryId))) {
      extraInDb.push({ dbId: c.id, blId: c.baselinkerCategoryId, name: c.name });
    }
  }

  console.log(`✅ Zmapowane:          ${matched.length}`);
  console.log(`❌ W BL, brak w DB:    ${missingInDb.length}`);
  console.log(`⚠️  Nazwy się różnią:   ${nameMismatch.length}`);
  console.log(`🗑️  W DB, brak w BL:    ${extraInDb.length}`);

  if (missingInDb.length > 0) {
    console.log('\n--- KATEGORIE W BL, BRAK W DB ---');
    for (const c of missingInDb) {
      const parentName = blCatMap.get(c.parent_id)?.name || 'ROOT';
      console.log(`   BL id=${c.blId} | "${c.name}" (parent: "${parentName}")`);
    }
  }

  if (nameMismatch.length > 0) {
    console.log('\n--- RÓŻNICE W NAZWACH ---');
    for (const c of nameMismatch) {
      console.log(`   BL id=${c.blId} | BL: "${c.blName}" vs DB: "${c.dbName}"`);
    }
  }

  if (extraInDb.length > 0) {
    console.log('\n--- KATEGORIE W DB, BRAK W BL ---');
    for (const c of extraInDb) {
      console.log(`   DB id=${c.dbId} | BL id=${c.blId} | "${c.name}"`);
    }
  }

  // ========================================
  // 4. Sprawdź produkty BEZ kategorii w DB
  //    ale Z category_id w BL
  // ========================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  PRODUKTY BEZ KATEGORII - ANALIZA BL');
  console.log('═══════════════════════════════════════════\n');

  // Pobierz WSZYSTKIE BTP produkty bez kategorii z DB
  const btpNoCat = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'btp-' }, categoryId: null },
    select: { baselinkerProductId: true, name: true },
  });
  console.log(`BTP produkty bez kategorii w DB: ${btpNoCat.length}`);

  // Sprawdź ich category_id w BL (batch po 100)
  const blIds = btpNoCat.map(p => parseInt(p.baselinkerProductId.replace('btp-', '')));
  
  let withCatInBl = 0;
  let withoutCatInBl = 0;
  let notFoundInBl = 0;
  const unmappedCatCounts = {};
  const missingCatProducts = []; // products that have cat in BL but not in DB

  for (let i = 0; i < blIds.length; i += 100) {
    const chunk = blIds.slice(i, i + 100);
    const resp = await blRequest(token, 'getInventoryProductsData', {
      inventory_id: BTP_INVENTORY_ID,
      products: chunk,
    });
    
    const returned = new Set();
    for (const [id, prod] of Object.entries(resp.products || {})) {
      returned.add(parseInt(id));
      const catId = prod.category_id ? parseInt(prod.category_id) : 0;
      if (catId > 0) {
        withCatInBl++;
        unmappedCatCounts[catId] = (unmappedCatCounts[catId] || 0) + 1;
        if (missingCatProducts.length < 20) {
          const catName = blCatMap.get(catId)?.name || 'UNKNOWN';
          const inDb = dbByBlId.has(catId) ? '✅ w DB' : '❌ BRAK w DB';
          missingCatProducts.push({ id, catId, catName, inDb, name: (prod.text_fields?.name || '').slice(0, 50) });
        }
      } else {
        withoutCatInBl++;
      }
    }
    
    // Products not found in BL at all
    for (const blId of chunk) {
      if (!returned.has(blId)) notFoundInBl++;
    }
    
    if ((i + 100) % 500 === 0 || i + 100 >= blIds.length) {
      console.log(`   Sprawdzono ${Math.min(i + 100, blIds.length)}/${blIds.length}...`);
    }
  }

  console.log(`\n=== WYNIK ===`);
  console.log(`Produkty bez kategorii w DB:     ${btpNoCat.length}`);
  console.log(`  → mają category_id w BL:       ${withCatInBl} ← TE POWINNY MIEĆ KATEGORIĘ!`);
  console.log(`  → nie mają category_id w BL:   ${withoutCatInBl}`);
  console.log(`  → nie istnieją w BL:           ${notFoundInBl} (duchy)`);

  if (withCatInBl > 0) {
    console.log(`\n--- CATEGORY_ID które mają w BL ale brak w DB ---`);
    const sorted = Object.entries(unmappedCatCounts).sort((a, b) => b[1] - a[1]);
    for (const [catId, count] of sorted) {
      const blName = blCatMap.get(parseInt(catId))?.name || 'UNKNOWN';
      const inDb = dbByBlId.has(parseInt(catId)) ? '✅ zmapowana' : '❌ BRAK W DB';
      console.log(`   cat_id=${catId} (${blName}) → ${count} produktów ${inDb}`);
    }

    console.log(`\n--- SAMPLE PRODUKTÓW (do 20) ---`);
    for (const p of missingCatProducts) {
      console.log(`   btp-${p.id} | BL cat=${p.catId} "${p.catName}" ${p.inDb} | ${p.name}`);
    }
  }

  await prisma.$disconnect();
})();
