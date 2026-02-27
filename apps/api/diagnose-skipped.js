// Diagnoza: dlaczego 642 produkty są pomijane? Sprawdź co mają w BL
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

  // 1. Pobierz wszystkie produkty BTP z listy
  console.log('Pobieranie listy produktów BTP...');
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
    page++;
  }
  console.log(`Łącznie w BL: ${allProducts.length}`);

  // 2. Pobierz istniejące w DB
  const existing = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'btp-' } },
    select: { baselinkerProductId: true },
  });
  const existingSet = new Set(existing.map(p => p.baselinkerProductId));
  console.log(`W naszej DB: ${existingSet.size}`);

  // 3. Znajdź produkty z BL, które NIE są w naszej DB
  const notInDb = allProducts.filter(p => !existingSet.has(`btp-${p.id}`));
  console.log(`W BL ale NIE w DB: ${notInDb.length}`);

  // 4. Produkty w DB, które NIE są w BL
  const blIdSet = new Set(allProducts.map(p => `btp-${p.id}`));
  const notInBl = existing.filter(p => !blIdSet.has(p.baselinkerProductId));
  console.log(`W DB ale NIE w BL (duchy): ${notInBl.length}`);

  // 5. Sprawdź szczegóły tych pominiętych
  const missingIds = notInDb.map(p => p.id);
  console.log(`\n=== Analiza ${missingIds.length} produktów POMINIĘTYCH ===`);
  
  let noName = 0;
  let hasName = 0;
  let hasCat = 0;
  let hasPrice = 0;
  let samples = [];

  // Pobierz ceny dla tych produktów
  console.log('Pobieranie cen...');
  const priceMap = new Map();
  let ppage = 1;
  while (true) {
    const resp = await blRequest(token, 'getInventoryProductsPrices', {
      inventory_id: BTP_INVENTORY_ID,
      page: ppage,
    });
    const products = resp.products || {};
    const entries = Object.entries(products);
    for (const [id, priceData] of entries) {
      const prices = priceData.prices || priceData;
      const pln = parseFloat(prices['10034']) || 0;
      if (pln > 0) priceMap.set(id, pln);
      else {
        for (const v of Object.values(prices)) {
          if (typeof v === 'number' && v > 0) { priceMap.set(id, v); break; }
        }
      }
    }
    if (entries.length < 1000) break;
    ppage++;
  }
  console.log(`Ceny pobrane: ${priceMap.size}`);

  // Sprawdź dane szczegółowe batch po 100
  for (let i = 0; i < missingIds.length; i += 100) {
    const chunk = missingIds.slice(i, i + 100);
    const resp = await blRequest(token, 'getInventoryProductsData', {
      inventory_id: BTP_INVENTORY_ID,
      products: chunk,
    });
    
    for (const [id, prod] of Object.entries(resp.products || {})) {
      const tf = prod.text_fields || {};
      const name = tf.name || prod.name || '';
      const catId = prod.category_id ? parseInt(prod.category_id) : 0;
      const price = priceMap.get(id) || 0;
      
      if (name) hasName++;
      else noName++;
      if (catId > 0) hasCat++;
      if (price > 0) hasPrice++;
      
      if (samples.length < 30) {
        samples.push({
          id,
          name: name ? name.slice(0, 50) : '(BRAK NAZWY)',
          catId,
          price: price.toFixed(2),
          allTextFields: Object.keys(tf).join(', '),
          // Check if name exists in other fields
          nameInExtra: tf.name2 || tf.extra_field_0 || tf.extra_field_1 || '',
        });
      }
    }
  }

  console.log(`\n=== WYNIK: Pominiętych ${missingIds.length} produktów ===`);
  console.log(`Bez nazwy (name=''):   ${noName}`);
  console.log(`Z nazwą:               ${hasName}`);
  console.log(`Z kategorią (cat>0):   ${hasCat}`);
  console.log(`Z ceną > 0:            ${hasPrice}`);
  
  console.log(`\n--- SAMPLE (${samples.length}) ---`);
  for (const s of samples) {
    console.log(`  id=${s.id} | name="${s.name}" | cat=${s.catId} | price=${s.price} | fields: ${s.allTextFields}`);
  }

  await prisma.$disconnect();
})();
