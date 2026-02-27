// Quick check: sample BTP products without category in DB - what category_id does BL return?
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

  // Get 100 BTP products without category from DB
  const btpNoCat = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'btp-' }, categoryId: null },
    select: { baselinkerProductId: true },
    take: 100,
  });

  const blIds = btpNoCat.map(p => parseInt(p.baselinkerProductId.replace('btp-', '')));
  
  // Check in BL what category_id they have
  let withCat = 0;
  let withoutCat = 0;
  const unmappedCatIds = {};
  
  // Load our category map
  const dbCats = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { id: true, name: true, baselinkerCategoryId: true },
  });
  const categoryMap = new Map();
  for (const c of dbCats) categoryMap.set(parseInt(c.baselinkerCategoryId), c.name);

  // Fetch in chunks of 50
  for (let i = 0; i < blIds.length; i += 50) {
    const chunk = blIds.slice(i, i + 50);
    const resp = await blRequest(token, 'getInventoryProductsData', {
      inventory_id: BTP_INVENTORY_ID,
      products: chunk,
    });
    for (const [id, prod] of Object.entries(resp.products || {})) {
      const catId = prod.category_id ? parseInt(prod.category_id) : 0;
      if (catId > 0) {
        withCat++;
        const mapped = categoryMap.has(catId) ? `✅ ${categoryMap.get(catId)}` : '❌ BRAK W DB';
        if (!categoryMap.has(catId)) {
          unmappedCatIds[catId] = (unmappedCatIds[catId] || 0) + 1;
        }
        console.log(`  id=${id} cat_id=${catId} ${mapped} | ${(prod.text_fields?.name || '').slice(0, 50)}`);
      } else {
        withoutCat++;
      }
    }
  }
  
  console.log(`\n=== Z 100 produktów BEZ kategorii w DB ===`);
  console.log(`W BL MAJĄ category_id > 0:    ${withCat}`);
  console.log(`W BL też BEZ category_id:      ${withoutCat}`);
  
  if (Object.keys(unmappedCatIds).length > 0) {
    console.log(`\n⚠️ Niezmapowane category_id:`);
    for (const [id, count] of Object.entries(unmappedCatIds)) {
      console.log(`   cat_id=${id}: ${count} produktów`);
    }
  }

  await prisma.$disconnect();
})();
