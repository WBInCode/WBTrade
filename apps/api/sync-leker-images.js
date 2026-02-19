/**
 * Skrypt do aktualizacji URLi zdjęć dla produktów z magazynu LEKER.
 * Pobiera aktualne zdjęcia z Baselinker API i aktualizuje ProductImage w bazie.
 *
 * Użycie: cd apps/api && node sync-leker-images.js [--dry-run]
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function decryptToken(ciphertext, iv, authTag) {
  const key = Buffer.from(process.env.BASELINKER_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function baselinkerRequest(token, method, params = {}) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(params));

  const response = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'X-BLToken': token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const data = await response.json();
  if (data.status !== 'SUCCESS') {
    throw new Error(`Baselinker error: ${JSON.stringify(data)}`);
  }
  return data;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`\n🔄 Sync zdjęć LEKER ${DRY_RUN ? '(DRY RUN - bez zmian w bazie)' : ''}\n`);

  // 1. Get Baselinker token (from DB config or env fallback)
  let token;
  let inventoryId;

  const config = await prisma.baselinkerConfig.findFirst();
  if (config) {
    token = await decryptToken(
      config.apiTokenEncrypted,
      config.encryptionIv,
      config.authTag
    );
    inventoryId = config.inventoryId;
    console.log(`✅ Token z bazy, inventoryId: ${inventoryId}`);
  } else if (process.env.BASELINKER_API_TOKEN) {
    token = process.env.BASELINKER_API_TOKEN;
    console.log('✅ Token z env BASELINKER_API_TOKEN');

    // Auto-detect inventoryId — find the 'Leker' warehouse
    const invResp = await baselinkerRequest(token, 'getInventories');
    const inventories = invResp.inventories || [];
    console.log('📦 Magazyny:', inventories.map((i) => `${i.name} (${i.inventory_id})`).join(', '));

    const lekerWarehouse = inventories.find(
      (i) => i.name.toLowerCase().includes('leker') && !i.name.toLowerCase().includes('empik')
    );
    if (lekerWarehouse) {
      inventoryId = lekerWarehouse.inventory_id.toString();
      console.log(`   ✅ Magazyn Leker: ${lekerWarehouse.name} (${inventoryId})`);
    } else if (inventories.length > 0) {
      inventoryId = inventories[0].inventory_id.toString();
      console.log(`   ⚠️  Nie znaleziono magazynu Leker, używam: ${inventories[0].name} (${inventoryId})`);
    } else {
      console.error('❌ Brak magazynów w Baselinker');
      return;
    }
  } else {
    console.error('❌ Brak konfiguracji Baselinker (ani w bazie, ani w env)');
    return;
  }

  console.log(`🔑 inventoryId: ${inventoryId}`);

  // 2. Find all LEKER products with baselinkerProductId
  const lekerProducts = await prisma.product.findMany({
    where: {
      sku: { startsWith: 'LEKER-' },
      baselinkerProductId: { not: null },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      baselinkerProductId: true,
      images: { select: { id: true, url: true, order: true } },
    },
  });

  console.log(`📦 Znaleziono ${lekerProducts.length} produktów LEKER z baselinkerProductId\n`);

  if (lekerProducts.length === 0) {
    console.log('Brak produktów do przetworzenia.');
    return;
  }

  // 3. Prepare Baselinker product IDs (strip 'leker-' prefix)
  const productIds = lekerProducts
    .map((p) => {
      const raw = p.baselinkerProductId;
      // baselinkerProductId is like 'leker-212545583' — extract numeric part
      const numStr = raw.replace(/^[a-zA-Z]+-/, '');
      return parseInt(numStr, 10);
    })
    .filter((id) => !isNaN(id));

  console.log(`🔗 Baselinker product IDs: ${productIds.length}`);

  // 4. Fetch product data from Baselinker in chunks of 500
  const chunks = chunkArray(productIds, 500);
  const blProductMap = new Map();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`📡 Pobieranie chunk ${i + 1}/${chunks.length} (${chunk.length} produktów)...`);

    const data = await baselinkerRequest(token, 'getInventoryProductsData', {
      inventory_id: parseInt(inventoryId, 10),
      products: chunk,
    });

    if (data.products) {
      for (const [id, product] of Object.entries(data.products)) {
        blProductMap.set(id.toString(), product);
      }
    }

    if (i < chunks.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`\n✅ Pobrano dane ${blProductMap.size} produktów z Baselinkera\n`);

  // 5. Compare and update images
  let updated = 0;
  let skipped = 0;
  let notFoundInBl = 0;
  let noImagesInBl = 0;
  let errors = 0;

  for (const product of lekerProducts) {
    const blId = product.baselinkerProductId;
    const numericId = blId.replace(/^[a-zA-Z]+-/, '');
    const blProduct = blProductMap.get(numericId);

    if (!blProduct) {
      notFoundInBl++;
      continue;
    }

    const blImages = blProduct.images || {};
    const blImageEntries = Object.entries(blImages)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .filter(([, url]) => {
        // Filter out broken URLs (e.g. CDN folder paths without filename)
        if (typeof url !== 'string' || !url) return false;
        // Reject URLs ending with / (just folder, no file)
        if (url.endsWith('/')) return false;
        return true;
      });

    if (blImageEntries.length === 0) {
      noImagesInBl++;
      continue;
    }

    // Check if images differ
    const currentUrls = product.images
      .sort((a, b) => a.order - b.order)
      .map((img) => img.url);
    const newUrls = blImageEntries.map(([, url]) => url);

    const imagesChanged =
      currentUrls.length !== newUrls.length ||
      currentUrls.some((url, idx) => url !== newUrls[idx]);

    if (!imagesChanged) {
      skipped++;
      continue;
    }

    console.log(`  🖼️  ${product.sku} | ${product.name.substring(0, 50)}`);
    console.log(`      Stare: ${currentUrls.length} zdjęć${currentUrls[0] ? ' → ' + currentUrls[0].substring(0, 70) : ''}`);
    console.log(`      Nowe:  ${newUrls.length} zdjęć${newUrls[0] ? ' → ' + newUrls[0].substring(0, 70) : ''}`);

    if (!DRY_RUN) {
      try {
        // Delete existing images
        await prisma.productImage.deleteMany({
          where: { productId: product.id },
        });

        // Create new images
        for (let idx = 0; idx < blImageEntries.length; idx++) {
          const [, url] = blImageEntries[idx];
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: url,
              order: idx,
            },
          });
        }
        updated++;
      } catch (err) {
        console.error(`      ❌ Błąd: ${err.message}`);
        errors++;
      }
    } else {
      updated++;
    }
  }

  // 6. Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 PODSUMOWANIE:');
  console.log('='.repeat(50));
  console.log(`  Produktów LEKER:              ${lekerProducts.length}`);
  console.log(`  Zaktualizowanych:             ${updated}`);
  console.log(`  Bez zmian:                    ${skipped}`);
  console.log(`  Nie znaleziono w BL:          ${notFoundInBl}`);
  console.log(`  Brak zdjęć w Baselinker:      ${noImagesInBl}`);
  console.log(`  Błędy:                        ${errors}`);
  if (DRY_RUN) {
    console.log('\n  ℹ️  DRY RUN - żadne zmiany nie zostały zapisane');
    console.log('  Uruchom bez --dry-run aby zapisać zmiany');
  }
  console.log('');
}

main()
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
