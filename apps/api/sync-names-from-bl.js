/**
 * Sync product names from Baselinker to database
 * Usage: node sync-names-from-bl.js [--dry-run]
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const token = process.env.BASELINKER_API_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

// Inventory mapping based on BL ID prefix
const INVENTORY_MAP = {
  'hp-': 22954,
  'btp-': 22953,
  'leker-': 22952,
  'ikonka-': 22951,
  'outlet-': 11235,
};

function stripPrefix(blId) {
  return blId.replace(/^(outlet-|hp-|btp-|leker-|ikonka-)/, '');
}

function getInventoryId(blId) {
  for (const [prefix, invId] of Object.entries(INVENTORY_MAP)) {
    if (blId.startsWith(prefix)) return invId;
  }
  return 11235; // default: Główny
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s-]/g, '')        // remove non-word chars
    .replace(/[\s_]+/g, '-')         // spaces/underscores to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');        // trim hyphens
}

async function blCall(method, params = {}) {
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'token=' + token + '&method=' + method + '&parameters=' + JSON.stringify(params)
  });
  return await res.json();
}

async function ensureUniqueSlug(baseSlug, blProductId) {
  let slug = baseSlug;
  let counter = 1;
  while (counter < 1000) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.baselinkerProductId === blProductId) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return `${baseSlug}-${Date.now()}`;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== LIVE MODE - UPDATING DATABASE ===');
  console.log('');

  // 1. Get all products from database with baselinkerProductId
  const dbProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { not: null } },
    select: { id: true, name: true, slug: true, baselinkerProductId: true },
  });
  console.log(`Found ${dbProducts.length} products in database with BL IDs\n`);

  // 2. Group by inventory
  const groups = {};
  for (const p of dbProducts) {
    const invId = getInventoryId(p.baselinkerProductId);
    if (!groups[invId]) groups[invId] = [];
    groups[invId].push(p);
  }

  for (const [invId, prods] of Object.entries(groups)) {
    console.log(`Inventory ${invId}: ${prods.length} products`);
  }

  // 3. Process each inventory group
  let totalUpdated = 0, totalSkipped = 0, totalNotFound = 0, totalErrors = 0;

  for (const [invId, prods] of Object.entries(groups)) {
    console.log(`\n--- Processing inventory ${invId} (${prods.length} products) ---`);

    // Process in batches of 100 (BL API limit)
    const batchSize = 100;
    for (let i = 0; i < prods.length; i += batchSize) {
      const batch = prods.slice(i, i + batchSize);
      const numericIds = batch.map(p => Number(stripPrefix(p.baselinkerProductId)));

      // Fetch from Baselinker
      const blData = await blCall('getInventoryProductsData', {
        inventory_id: Number(invId),
        products: numericIds
      });

      if (blData.status !== 'SUCCESS' || !blData.products) {
        console.log(`  Batch ${Math.floor(i/batchSize)+1}: BL error - ${blData.error_message || 'unknown'}`);
        totalErrors += batch.length;
        continue;
      }

      // Compare and update
      for (const dbProd of batch) {
        const numId = stripPrefix(dbProd.baselinkerProductId);
        const blProd = blData.products[numId];

        if (!blProd) {
          totalNotFound++;
          continue;
        }

        const blName = blProd.text_fields?.name || blProd.text_fields?.pl?.name || '';
        if (!blName) {
          totalSkipped++;
          continue;
        }

        if (blName === dbProd.name) {
          totalSkipped++;
          continue;
        }

        // Name differs - update!
        const newSlug = slugify(blName) || `product-${dbProd.baselinkerProductId}`;

        if (DRY_RUN) {
          console.log(`  [WOULD UPDATE] ${dbProd.baselinkerProductId}`);
          console.log(`    OLD: ${dbProd.name}`);
          console.log(`    NEW: ${blName}`);
          totalUpdated++;
        } else {
          try {
            const uniqueSlug = await ensureUniqueSlug(newSlug, dbProd.baselinkerProductId);
            await prisma.product.update({
              where: { id: dbProd.id },
              data: { name: blName, slug: uniqueSlug },
            });
            totalUpdated++;
          } catch (err) {
            console.log(`  [ERROR] ${dbProd.baselinkerProductId}: ${err.message}`);
            totalErrors++;
          }
        }
      }

      // Rate limit - BL allows ~100 req/min
      if (i + batchSize < prods.length) {
        await new Promise(r => setTimeout(r, 1000));
      }

      const batchNum = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(prods.length / batchSize);
      if (batchNum % 5 === 0 || batchNum === totalBatches) {
        console.log(`  Batch ${batchNum}/${totalBatches} done...`);
      }
    }
  }

  console.log('\n========== RESULTS ==========');
  console.log(`Updated:   ${totalUpdated}`);
  console.log(`Skipped:   ${totalSkipped} (name already matches)`);
  console.log(`Not found: ${totalNotFound} (not in BL inventory)`);
  console.log(`Errors:    ${totalErrors}`);
  
  if (DRY_RUN) {
    console.log('\nThis was a DRY RUN. Run without --dry-run to apply changes.');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
