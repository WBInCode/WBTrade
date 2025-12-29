#!/usr/bin/env node
/**
 * Skrypt do aktualizacji kategorii istniejących produktów
 * używając nowego systemu mapowania kategorii.
 * 
 * Użycie: node scripts/update-product-categories.js [--dry-run]
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const https = require('https');
const { CategoryMapper } = require('../src/services/category-mapper.service');

const prisma = new PrismaClient();
const categoryMapper = new CategoryMapper();

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 500;

// Mapa kategorii BaseLinker ID -> pełna ścieżka
let blCategoryPathMap = new Map();

// Cache kategorii sklepu slug -> id
let shopCategoryCache = new Map();

async function getBaselinkerToken() {
  const config = await prisma.baselinkerConfig.findFirst();
  if (!config) throw new Error('Brak konfiguracji BaseLinker');
  
  const keyBuffer = Buffer.from(process.env.BASELINKER_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(config.encryptionIv, 'hex'));
  decipher.setAuthTag(Buffer.from(config.authTag, 'hex'));
  return {
    token: decipher.update(config.apiTokenEncrypted, 'hex', 'utf8') + decipher.final('utf8'),
    inventoryId: config.inventoryId
  };
}

async function fetchBaselinkerCategories(token, inventoryId) {
  return new Promise((resolve, reject) => {
    const postData = 'method=getInventoryCategories&parameters=' + JSON.stringify({
      inventory_id: parseInt(inventoryId)
    });
    
    const req = https.request({
      hostname: 'api.baselinker.com',
      path: '/connector.php',
      method: 'POST',
      headers: { 'X-BLToken': token, 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.categories || []);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function loadShopCategories() {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true }
  });
  shopCategoryCache = new Map(categories.map(c => [c.slug, c.id]));
  console.log(`✅ Załadowano ${shopCategoryCache.size} kategorii sklepu`);
}

async function main() {
  console.log('\n🔄 AKTUALIZACJA KATEGORII PRODUKTÓW\n');
  console.log(DRY_RUN ? '⚠️  TRYB DRY-RUN - bez zapisywania zmian\n' : '');

  // 1. Pobierz token i kategorie z BaseLinker
  console.log('📥 Pobieranie kategorii z BaseLinker...');
  const { token, inventoryId } = await getBaselinkerToken();
  const blCategories = await fetchBaselinkerCategories(token, inventoryId);
  
  for (const cat of blCategories) {
    blCategoryPathMap.set(cat.category_id.toString(), cat.name);
  }
  console.log(`✅ Pobrano ${blCategoryPathMap.size} kategorii z BaseLinker`);

  // 2. Załaduj kategorie sklepu
  await loadShopCategories();

  // 3. Pobierz produkty które mają baselinkerProductId ale potrzebują aktualizacji kategorii
  const totalProducts = await prisma.product.count({
    where: { baselinkerProductId: { not: null } }
  });
  console.log(`\n📦 Do przetworzenia: ${totalProducts} produktów\n`);

  let processed = 0;
  let updated = 0;
  let noCategory = 0;
  let errors = 0;
  let categoryStats = {};

  // 4. Przetwarzaj w batchach
  const totalBatches = Math.ceil(totalProducts / BATCH_SIZE);
  
  for (let batch = 0; batch < totalBatches; batch++) {
    const products = await prisma.product.findMany({
      where: { baselinkerProductId: { not: null } },
      select: {
        id: true,
        name: true,
        baselinkerProductId: true,
        categoryId: true
      },
      skip: batch * BATCH_SIZE,
      take: BATCH_SIZE
    });

    // Potrzebujemy category_id z BaseLinker - pobierzmy dane produktów
    const productIds = products.map(p => parseInt(p.baselinkerProductId));
    
    // Pobierz dane produktów z BaseLinker (w mniejszych porcjach)
    const blProductData = await fetchProductData(token, inventoryId, productIds);

    for (const product of products) {
      processed++;
      
      const blProduct = blProductData[product.baselinkerProductId];
      if (!blProduct) {
        errors++;
        continue;
      }

      const blCategoryId = blProduct.category_id?.toString();
      const blCategoryPath = blCategoryId ? blCategoryPathMap.get(blCategoryId) : null;

      if (!blCategoryPath) {
        noCategory++;
        continue;
      }

      // Mapuj kategorię
      const mapping = categoryMapper.mapCategory(blCategoryPath, product.name);
      const categorySlug = mapping.subSlug 
        ? `${mapping.mainSlug}-${mapping.subSlug}` 
        : mapping.mainSlug;
      
      const newCategoryId = shopCategoryCache.get(categorySlug);

      // Statystyki
      const catName = mapping.subCategory 
        ? `${mapping.mainCategory} > ${mapping.subCategory}`
        : mapping.mainCategory;
      categoryStats[catName] = (categoryStats[catName] || 0) + 1;

      if (!DRY_RUN && newCategoryId) {
        try {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              categoryId: newCategoryId,
              baselinkerCategoryPath: blCategoryPath
            }
          });
          updated++;
        } catch (e) {
          errors++;
        }
      } else if (newCategoryId) {
        updated++;
      }
    }

    // Progress
    const pct = Math.round((processed / totalProducts) * 100);
    process.stdout.write(`\r  [${batch + 1}/${totalBatches}] ${processed}/${totalProducts} (${pct}%) - Zaktualizowano: ${updated}`);
  }

  console.log('\n\n📊 PODSUMOWANIE:\n');
  console.log(`  Przetworzono: ${processed}`);
  console.log(`  Zaktualizowano: ${updated}`);
  console.log(`  Bez kategorii BL: ${noCategory}`);
  console.log(`  Błędy: ${errors}`);

  console.log('\n📁 ROZKŁAD KATEGORII:\n');
  const sortedStats = Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  for (const [cat, count] of sortedStats) {
    console.log(`  ${count.toString().padStart(6)} - ${cat}`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  TRYB DRY-RUN - żadne zmiany nie zostały zapisane!');
    console.log('    Uruchom bez --dry-run aby zapisać zmiany.\n');
  }

  await prisma.$disconnect();
}

async function fetchProductData(token, inventoryId, productIds) {
  // BaseLinker przyjmuje max 1000 produktów na raz
  const result = {};
  const chunks = [];
  
  for (let i = 0; i < productIds.length; i += 100) {
    chunks.push(productIds.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const data = await new Promise((resolve, reject) => {
      const postData = 'method=getInventoryProductsData&parameters=' + JSON.stringify({
        inventory_id: parseInt(inventoryId),
        products: chunk
      });
      
      const req = https.request({
        hostname: 'api.baselinker.com',
        path: '/connector.php',
        method: 'POST',
        headers: { 'X-BLToken': token, 'Content-Type': 'application/x-www-form-urlencoded' }
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.products || {});
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    Object.assign(result, data);
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  return result;
}

main().catch(console.error);
