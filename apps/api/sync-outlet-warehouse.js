/**
 * ============================================
 * SYNCHRONIZACJA MAGAZYNU ZWROTÓW (OUTLET)
 * ============================================
 * 
 * Ten skrypt synchronizuje produkty z magazynu zwrotów z Baselinkera.
 * Wszystkie produkty trafiają do kategorii "Outlet".
 * 
 * Magazyn zwrotów:
 * - ID: 23662
 * - Prefix: outlet-
 * - Wszystkie produkty → kategoria Outlet
 * 
 * Uruchom: node sync-outlet-warehouse.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

// ============================================
// KONFIGURACJA MAGAZYNU OUTLET
// ============================================

const OUTLET_INVENTORY_ID = '23662';
const OUTLET_INVENTORY_NAME = 'magazyn zwrotów';
const OUTLET_PREFIX = 'outlet-';  // Prefix dla baselinkerProductId
const OUTLET_CATEGORY_SLUG = 'outlet';

// Timeout między requestami (ms)
const MIN_DELAY = 2500;

// ============================================
// HELPER FUNCTIONS
// ============================================

function getApiToken() {
  const token = process.env.BASELINKER_API_TOKEN;
  if (!token) {
    throw new Error('Brak BASELINKER_API_TOKEN w .env!');
  }
  return token;
}

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

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

function getProductPrice(blProduct) {
  const prices = blProduct.prices || {};
  const firstPriceKey = Object.keys(prices)[0];
  if (firstPriceKey && prices[firstPriceKey]) {
    return parseFloat(prices[firstPriceKey]) || 0;
  }
  return parseFloat(blProduct.price_brutto) || 0;
}

function getProductName(blProduct) {
  const textFields = blProduct.text_fields || {};
  return textFields.name || blProduct.name || `Product ${blProduct.id}`;
}

function getProductDescription(blProduct) {
  const textFields = blProduct.text_fields || {};
  return textFields.description || textFields.description_extra1 || '';
}

function getProductEan(blProduct) {
  return blProduct.ean || blProduct.text_fields?.ean || null;
}

/**
 * Pobieranie tagów z produktu Baselinker
 */
function getProductTags(blProduct) {
  let tags = [];
  
  if (Array.isArray(blProduct.tags)) {
    tags = blProduct.tags.map(t => String(t).trim()).filter(Boolean);
  }
  
  // Dodaj tag "Outlet" do każdego produktu z tego magazynu
  if (!tags.includes('Outlet')) {
    tags.push('Outlet');
  }
  
  return tags;
}

// ============================================
// GŁÓWNA LOGIKA SYNCHRONIZACJI
// ============================================

async function ensureOutletCategory() {
  console.log('📁 Sprawdzanie kategorii Outlet...');
  
  let outletCategory = await prisma.category.findUnique({
    where: { slug: OUTLET_CATEGORY_SLUG }
  });
  
  if (!outletCategory) {
    outletCategory = await prisma.category.create({
      data: {
        name: 'Outlet',
        slug: OUTLET_CATEGORY_SLUG,
        parentId: null,
        isActive: true,
        order: 100,  // Na końcu listy kategorii
        baselinkerCategoryId: '2839162'  // ID kategorii Outlet w Baselinkerze
      }
    });
    console.log('   ✓ Utworzono kategorię Outlet');
  } else {
    console.log('   ✓ Kategoria Outlet już istnieje');
  }
  
  return outletCategory;
}

async function ensureDefaultLocation() {
  let defaultLocation = await prisma.location.findFirst({
    where: { code: 'MAIN' }
  });
  
  if (!defaultLocation) {
    defaultLocation = await prisma.location.create({
      data: {
        name: 'Magazyn główny',
        code: 'MAIN',
        type: 'WAREHOUSE'
      }
    });
  }
  
  return defaultLocation;
}

async function getAllProductsFromOutlet(apiToken) {
  console.log(`\n📋 Pobieranie listy produktów z magazynu zwrotów (ID: ${OUTLET_INVENTORY_ID})...`);
  
  let allProducts = [];
  let page = 1;
  
  while (true) {
    const response = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: parseInt(OUTLET_INVENTORY_ID),
      page
    });
    
    const products = Object.values(response.products || {});
    if (products.length === 0) break;
    
    allProducts = allProducts.concat(products);
    console.log(`   Strona ${page}: pobrano ${products.length} produktów (razem: ${allProducts.length})`);
    page++;
  }
  
  return allProducts;
}

async function getProductDetails(apiToken, productIds) {
  const response = await blRequest(apiToken, 'getInventoryProductsData', {
    inventory_id: parseInt(OUTLET_INVENTORY_ID),
    products: productIds
  });
  
  return response.products || {};
}

async function syncOutletProducts(apiToken, outletCategory, existingMap) {
  const productList = await getAllProductsFromOutlet(apiToken);
  
  if (productList.length === 0) {
    console.log('   ⚠️ Brak produktów w magazynie zwrotów');
    return { processed: 0, created: 0, updated: 0, errors: 0 };
  }
  
  let processed = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < productList.length; i += BATCH_SIZE) {
    const batchIds = productList.slice(i, i + BATCH_SIZE).map(p => p.id);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(productList.length / BATCH_SIZE);
    
    console.log(`   📥 Batch ${batchNum}/${totalBatches} (${batchIds.length} produktów)...`);
    
    const productsData = await getProductDetails(apiToken, batchIds);
    
    for (const [productId, blProduct] of Object.entries(productsData)) {
      try {
        if (!blProduct || typeof blProduct !== 'object') {
          errors++;
          continue;
        }
        
        const baselinkerProductId = OUTLET_PREFIX + productId;
        const existingProduct = existingMap.get(baselinkerProductId);
        
        const name = getProductName(blProduct) || `Product ${productId}`;
        // Dodaj prefix OUTLET- do SKU żeby uniknąć duplikatów z innymi magazynami
        const originalSku = blProduct.sku || `OUTLET-${productId}`;
        const sku = originalSku.startsWith('OUTLET-') ? originalSku : `OUTLET-${originalSku}`;
        const slug = slugify(name) + '-outlet-' + productId;
        const price = getProductPrice(blProduct);
        const description = getProductDescription(blProduct);
        const ean = getProductEan(blProduct);
        const images = Object.values(blProduct.images || {});
        const tags = getProductTags(blProduct);
        
        if (existingProduct) {
          // Aktualizuj istniejący produkt
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name,
              description,
              sku,
              barcode: ean,
              price,
              tags,
              categoryId: outletCategory.id,  // Zawsze przypisz do Outlet
              status: 'ACTIVE'
            }
          });
          updated++;
        } else {
          // Utwórz nowy produkt
          await prisma.product.create({
            data: {
              name,
              slug,
              description,
              sku,
              barcode: ean,
              price,
              status: 'ACTIVE',
              baselinkerProductId,
              tags,
              categoryId: outletCategory.id,
              images: images.length > 0 ? {
                create: images.map((url, idx) => ({
                  url,
                  alt: name,
                  order: idx
                }))
              } : undefined,
              variants: {
                create: {
                  name: 'Domyślny',
                  sku: sku,
                  price,
                  attributes: {},
                  baselinkerVariantId: baselinkerProductId
                }
              }
            }
          });
          created++;
        }
        
        processed++;
        
      } catch (err) {
        errors++;
        if (errors <= 10) {
          console.error(`   ✗ Błąd dla produktu ${productId}: ${err.message}`);
        }
      }
    }
  }
  
  return { processed, created, updated, errors };
}

async function syncOutletStock(apiToken, defaultLocation) {
  console.log(`\n📊 Synchronizacja stanów magazynowych outlet...`);
  
  const stockResponse = await blRequest(apiToken, 'getInventoryProductsStock', {
    inventory_id: parseInt(OUTLET_INVENTORY_ID)
  });
  
  const stockProducts = Object.values(stockResponse.products || {});
  let stockUpdated = 0;
  
  for (const stockEntry of stockProducts) {
    const blId = OUTLET_PREFIX + stockEntry.product_id.toString();
    const totalStock = Object.values(stockEntry.stock || {}).reduce((sum, qty) => sum + qty, 0);
    
    const variant = await prisma.productVariant.findFirst({
      where: { baselinkerVariantId: blId }
    });
    
    if (variant) {
      await prisma.inventory.upsert({
        where: {
          variantId_locationId: {
            variantId: variant.id,
            locationId: defaultLocation.id
          }
        },
        create: {
          variantId: variant.id,
          locationId: defaultLocation.id,
          quantity: totalStock,
          reserved: 0
        },
        update: {
          quantity: totalStock
        }
      });
      stockUpdated++;
    }
  }
  
  console.log(`   ✅ Zaktualizowano ${stockUpdated} stanów magazynowych`);
  return stockUpdated;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        SYNCHRONIZACJA MAGAZYNU ZWROTÓW (OUTLET)            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  
  const apiToken = getApiToken();
  console.log('✅ Token API OK\n');
  
  // Upewnij się że kategoria Outlet istnieje
  const outletCategory = await ensureOutletCategory();
  
  // Upewnij się że lokalizacja domyślna istnieje
  const defaultLocation = await ensureDefaultLocation();
  
  // Pobierz istniejące produkty outlet z bazy
  console.log('\n📚 Pobieranie istniejących produktów outlet z bazy...');
  const existingProducts = await prisma.product.findMany({
    where: { 
      baselinkerProductId: { 
        startsWith: OUTLET_PREFIX 
      } 
    },
    select: { 
      id: true, 
      baselinkerProductId: true, 
      name: true, 
      tags: true 
    }
  });
  const existingMap = new Map(
    existingProducts.map(p => [p.baselinkerProductId, p])
  );
  console.log(`   Znaleziono ${existingProducts.length} produktów outlet w bazie\n`);
  
  // Synchronizuj produkty
  console.log('\n============================================');
  console.log(`📦 MAGAZYN ZWROTÓW (OUTLET)`);
  console.log('============================================');
  
  const result = await syncOutletProducts(apiToken, outletCategory, existingMap);
  
  // Synchronizuj stany magazynowe
  const stockCount = await syncOutletStock(apiToken, defaultLocation);
  
  // Reindeksuj Meilisearch
  console.log('\n🔍 Reindeksacja Meilisearch...');
  try {
    const { MeiliSearch } = require('meilisearch');
    const meiliClient = new MeiliSearch({
      host: process.env.MEILI_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILI_MASTER_KEY || 'wbtrade_meili_key_change_in_production'
    });
    
    const products = await prisma.product.findMany({
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: true,
      },
    });
    
    const documents = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      sku: product.sku,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      categoryId: product.categoryId || '',
      categoryName: product.category?.name || '',
      image: product.images[0]?.url || null,
      status: product.status,
      createdAt: product.createdAt.getTime(),
      hasBaselinkerCategory: !!product.category?.baselinkerCategoryId,
    }));
    
    const index = meiliClient.index('products');
    await index.addDocuments(documents);
    console.log(`   ✅ Zindeksowano ${documents.length} produktów`);
  } catch (err) {
    console.log('   ⚠️ Nie udało się zindeksować (Meilisearch offline?):', err.message);
  }
  
  // Podsumowanie
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    PODSUMOWANIE                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`⏱️  Czas wykonania: ${elapsed}s`);
  console.log(`✅ Produktów przetworzonych: ${result.processed}`);
  console.log(`🆕 Nowych produktów: ${result.created}`);
  console.log(`🔄 Zaktualizowanych: ${result.updated}`);
  console.log(`📊 Stanów magazynowych: ${stockCount}`);
  console.log(`❌ Błędów: ${result.errors}`);
  
  console.log('\n\n🎉 SYNCHRONIZACJA OUTLET ZAKOŃCZONA!\n');
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd krytyczny:', err);
  await prisma.$disconnect();
  process.exit(1);
});
