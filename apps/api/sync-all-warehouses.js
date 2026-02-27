/**
 * ============================================
 * PEŁNA SYNCHRONIZACJA WSZYSTKICH HURTOWNI
 * ============================================
 * 
 * Ten skrypt:
 * 1. Pobiera listę wszystkich magazynów (hurtowni) z Baselinker
 * 2. Synchronizuje produkty ze WSZYSTKICH hurtowni (z tagami!)
 * 3. Uruchamia mapowanie kategorii NA PODSTAWIE TAGÓW (reassign-categories-by-tags.js)
 * 
 * NOWA LOGIKA KATEGORII (od 01/2026):
 * - Produkty mają 2 tagi w Baselinker: główna kategoria + podkategoria
 * - Kategorie główne: Elektronika, Sport, Zdrowie i uroda, Dom i ogród, Motoryzacja, Dziecko, Biurowe i papiernicze, Gastronomiczne
 * - Produkty trafiają TYLKO do podkategorii (główne są kontenerami)
 * - Produkty bez tagów kategorii trafiają do "Inne"
 * 
 * Szczególna uwaga na TAGI - są zawsze nadpisywane z Baselinker!
 * 
 * Uruchom: node sync-all-warehouses.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const path = require('path');
const { loadPriceRules, applyPriceMultiplier, getWarehouseKey } = require('./lib/price-rules');

const prisma = new PrismaClient();

// Price rules loaded from Settings table
let priceRules = {};

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

// ============================================
// KONFIGURACJA
// ============================================

// Tryby synchronizacji:
// - 'all' = synchronizuj wszystkie produkty (domyślne)
// - 'tags-only' = aktualizuj TYLKO tagi dla istniejących produktów
// - 'new-only' = tylko nowe produkty
const SYNC_MODE = process.env.SYNC_MODE || 'all';

// Czy uruchomić mapowanie kategorii po synchronizacji?
const RUN_CATEGORY_MAPPING = process.env.RUN_CATEGORY_MAPPING !== 'false';

// Timeout między requestami (ms) - bezpieczny dla API
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

function getProductPrice(blProduct, warehouseKey) {
  const prices = blProduct.prices || {};
  const firstPriceKey = Object.keys(prices)[0];
  let raw = 0;
  if (firstPriceKey && prices[firstPriceKey]) {
    raw = parseFloat(prices[firstPriceKey]) || 0;
  } else {
    raw = parseFloat(blProduct.price_brutto) || 0;
  }
  // Apply price multiplier rules if warehouse key is known
  if (warehouseKey) {
    raw = applyPriceMultiplier(raw, warehouseKey, priceRules);
  }
  // Round to .99
  return raw <= 0 ? 0 : Math.floor(raw) + 0.99;
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
 * KLUCZOWA FUNKCJA: Pobieranie tagów z produktu Baselinker
 */
function getProductTags(blProduct) {
  let tags = [];
  
  // Główne źródło: tablica blProduct.tags
  if (Array.isArray(blProduct.tags)) {
    tags = blProduct.tags.map(t => String(t).trim()).filter(Boolean);
  }
  
  // Fallback: text_fields.extra_field_2 (niektóre hurtownie używają tego pola)
  if (tags.length === 0 && blProduct.text_fields?.extra_field_2) {
    tags = blProduct.text_fields.extra_field_2
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  }
  
  return tags;
}

// ============================================
// GŁÓWNA LOGIKA SYNCHRONIZACJI
// ============================================

async function getAllInventories(apiToken) {
  console.log('📦 Pobieranie listy magazynów (hurtowni)...');
  const response = await blRequest(apiToken, 'getInventories');
  
  const inventories = response.inventories || [];
  console.log(`   Znaleziono ${inventories.length} magazynów:\n`);
  
  for (const inv of inventories) {
    console.log(`   📦 ${inv.name} (ID: ${inv.inventory_id})`);
  }
  console.log('');
  
  return inventories;
}

async function getAllProductsFromInventory(apiToken, inventoryId, inventoryName) {
  console.log(`\n📋 Pobieranie listy produktów z "${inventoryName}" (ID: ${inventoryId})...`);
  
  let allProducts = [];
  let page = 1;
  
  while (true) {
    const response = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: parseInt(inventoryId),
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

async function getProductDetails(apiToken, inventoryId, productIds) {
  const response = await blRequest(apiToken, 'getInventoryProductsData', {
    inventory_id: parseInt(inventoryId),
    products: productIds
  });
  
  return response.products || {};
}

// Mapowanie nazwy magazynu na prefix używany w baselinkerProductId
function getInventoryPrefix(inventoryName) {
  const prefixMap = {
    'leker': 'leker-',
    'btp': 'btp-',
    'hp': 'hp-',
    'ikonka': '', // bez prefiksu
    'główny': ''
  };
  const lower = inventoryName.toLowerCase();
  return prefixMap[lower] || '';
}

async function syncProductsFromInventory(apiToken, inventory, existingMap) {
  const inventoryId = inventory.inventory_id;
  const inventoryName = inventory.name;
  const inventoryPrefix = getInventoryPrefix(inventoryName);
  const whKey = getWarehouseKey(inventoryName);
  
  // Pobierz listę produktów
  const productList = await getAllProductsFromInventory(apiToken, inventoryId, inventoryName);
  
  if (productList.length === 0) {
    console.log(`   ⚠️ Brak produktów w magazynie "${inventoryName}"`);
    return { processed: 0, errors: 0, tagsUpdated: 0 };
  }
  
  let processed = 0;
  let errors = 0;
  let tagsUpdated = 0;
  
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < productList.length; i += BATCH_SIZE) {
    const batchIds = productList.slice(i, i + BATCH_SIZE).map(p => p.id);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(productList.length / BATCH_SIZE);
    
    console.log(`   📥 Batch ${batchNum}/${totalBatches} (${batchIds.length} produktów)...`);
    
    const productsData = await getProductDetails(apiToken, inventoryId, batchIds);
    
    for (const [productId, blProduct] of Object.entries(productsData)) {
      try {
        if (!blProduct || typeof blProduct !== 'object') {
          errors++;
          continue;
        }
        
        // Tworzenie baselinkerProductId z prefiksem magazynu (jeśli potrzebny)
        const baselinkerProductId = inventoryPrefix + productId;
        const existingProduct = existingMap.get(baselinkerProductId);
        
        // Pobierz tagi z Baselinker (KLUCZOWE!)
        const newTags = getProductTags(blProduct);
        
        // TRYB: tags-only - aktualizuj tylko tagi
        if (SYNC_MODE === 'tags-only') {
          if (existingProduct) {
            // Sprawdź czy tagi się zmieniły
            const currentTags = existingProduct.tags || [];
            const tagsChanged = JSON.stringify(currentTags.sort()) !== JSON.stringify(newTags.sort());
            
            if (tagsChanged) {
              await prisma.product.update({
                where: { id: existingProduct.id },
                data: { tags: newTags }
              });
              tagsUpdated++;
            }
          }
          continue;
        }
        
        // TRYB: new-only - pomiń istniejące
        if (SYNC_MODE === 'new-only' && existingProduct) {
          continue;
        }
        
        // Pełna synchronizacja (TRYB: all)
        const name = getProductName(blProduct) || `Product ${productId}`;
        const sku = blProduct.sku || `BL-${productId}`;
        const slug = slugify(name) + '-' + productId;
        const price = getProductPrice(blProduct, whKey);
        const description = getProductDescription(blProduct);
        const ean = getProductEan(blProduct);
        const images = Object.values(blProduct.images || {});
        
        // Znajdź kategorię
        let categoryId = null;
        if (blProduct.category_id) {
          const category = await prisma.category.findUnique({
            where: { baselinkerCategoryId: blProduct.category_id.toString() }
          });
          if (category) categoryId = category.id;
        }
        
        if (existingProduct) {
          // Aktualizuj istniejący produkt (z tagami!)
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name,
              description,
              sku,
              barcode: ean,
              price,
              tags: newTags, // ← TAGI ZAWSZE NADPISYWANE!
              // categoryId NIE nadpisujemy - zostanie ustawione przez reassign-all-categories
            }
          });
          
          // Sprawdź czy tagi się zmieniły
          const currentTags = existingProduct.tags || [];
          if (JSON.stringify(currentTags.sort()) !== JSON.stringify(newTags.sort())) {
            tagsUpdated++;
          }
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
              tags: newTags,
              categoryId,
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
  
  return { processed, errors, tagsUpdated };
}

async function syncStock(apiToken, inventoryId, inventoryName) {
  console.log(`\n📊 Synchronizacja stanów "${inventoryName}"...`);
  
  // Create default location if not exists
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
  
  const stockResponse = await blRequest(apiToken, 'getInventoryProductsStock', {
    inventory_id: parseInt(inventoryId)
  });
  
  const stockProducts = Object.values(stockResponse.products || {});
  let stockUpdated = 0;
  
  for (const stockEntry of stockProducts) {
    const blId = stockEntry.product_id.toString();
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

async function runCategoryMapping() {
  console.log('\n\n🏷️  URUCHAMIAM MAPOWANIE KATEGORII NA PODSTAWIE TAGÓW...\n');
  console.log('============================================\n');
  
  try {
    // Uruchom nowy skrypt mapowania na podstawie tagów z Baselinkera
    const scriptPath = path.join(__dirname, 'reassign-categories-by-tags.js');
    execSync(`node "${scriptPath}"`, { 
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('\n✅ Mapowanie kategorii na podstawie tagów zakończone!');
  } catch (error) {
    console.error('❌ Błąd mapowania kategorii:', error.message);
    // Fallback do starego skryptu jeśli nowy nie zadziała
    console.log('⚠️  Próbuję uruchomić stary skrypt mapowania...');
    try {
      const fallbackPath = path.join(__dirname, 'reassign-all-categories.js');
      execSync(`node "${fallbackPath}"`, { 
        stdio: 'inherit',
        cwd: __dirname
      });
    } catch (e) {
      console.error('❌ Fallback również nie zadziałał:', e.message);
    }
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SYNCHRONIZACJA WSZYSTKICH HURTOWNI Z BASELINKER        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📋 Tryb synchronizacji: ${SYNC_MODE}`);
  console.log(`📂 Mapowanie kategorii: ${RUN_CATEGORY_MAPPING ? 'TAK' : 'NIE'}\n`);
  
  const startTime = Date.now();
  
  // Pobierz token API
  const apiToken = getApiToken();
  console.log('✅ Token API OK\n');

  // Załaduj reguły cenowe z bazy
  priceRules = await loadPriceRules(prisma);
  for (const wh of ['leker', 'btp', 'hp']) {
    const count = priceRules[wh] ? priceRules[wh].length : 0;
    console.log(`  📊 Reguły cenowe ${wh}: ${count} ${count > 0 ? '(aktywne)' : '(brak)'}`);
  }
  console.log('');
  
  // Pobierz listę magazynów
  const allInventories = await getAllInventories(apiToken);
  
  // WAŻNE: Synchronizujemy TYLKO HP
  const ALLOWED_INVENTORY_IDS = ['22954']; // HP
  const inventories = allInventories.filter(inv => ALLOWED_INVENTORY_IDS.includes(inv.inventory_id.toString()));
  
  console.log(`\n📦 Synchronizuję ${inventories.length} magazynów: ${inventories.map(i => i.name).join(', ')}\n`);
  
  if (inventories.length === 0) {
    console.log('⚠️ Brak magazynów do synchronizacji!');
    await prisma.$disconnect();
    return;
  }
  
  // Pobierz istniejące produkty z bazy
  console.log('\n📚 Pobieranie istniejących produktów z bazy...');
  const existingProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { not: null } },
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
  console.log(`   Znaleziono ${existingProducts.length} produktów w bazie\n`);
  
  // Synchronizuj każdy magazyn
  let totalProcessed = 0;
  let totalErrors = 0;
  let totalTagsUpdated = 0;
  let totalStock = 0;
  
  for (const inventory of inventories) {
    console.log('\n============================================');
    console.log(`📦 HURTOWNIA: ${inventory.name} (ID: ${inventory.inventory_id})`);
    console.log('============================================');
    
    const result = await syncProductsFromInventory(apiToken, inventory, existingMap);
    totalProcessed += result.processed;
    totalErrors += result.errors;
    totalTagsUpdated += result.tagsUpdated;
    
    // Synchronizuj stany magazynowe
    if (SYNC_MODE !== 'tags-only') {
      const stockCount = await syncStock(apiToken, inventory.inventory_id, inventory.name);
      totalStock += stockCount;
    }
    
    console.log(`\n   📊 Podsumowanie "${inventory.name}":`);
    console.log(`      ✓ Przetworzono: ${result.processed}`);
    console.log(`      🏷️  Tagów zaktualizowanych: ${result.tagsUpdated}`);
    console.log(`      ✗ Błędów: ${result.errors}`);
  }
  
  // Podsumowanie końcowe
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    PODSUMOWANIE                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`⏱️  Czas wykonania: ${elapsed}s`);
  console.log(`📦 Hurtowni zsynchronizowanych: ${inventories.length}`);
  console.log(`✅ Produktów przetworzonych: ${totalProcessed}`);
  console.log(`🏷️  Tagów zaktualizowanych: ${totalTagsUpdated}`);
  console.log(`📊 Stanów magazynowych: ${totalStock}`);
  console.log(`❌ Błędów: ${totalErrors}`);
  
  // Uruchom mapowanie kategorii
  if (RUN_CATEGORY_MAPPING) {
    await runCategoryMapping();
  }
  
  console.log('\n\n🎉 SYNCHRONIZACJA ZAKOŃCZONA!\n');
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd krytyczny:', err);
  await prisma.$disconnect();
  process.exit(1);
});
