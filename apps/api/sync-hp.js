/**
 * Fast Baselinker Sync Script - HP
 * Pobiera WSZYSTKIE produkty z magazynu HP (ID: 22954)
 * 
 * Uruchom: node sync-hp.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const INVENTORY_ID = '22954'; // HP

// Token API bezpośrednio z ENV
function getApiToken() {
  const token = process.env.BASELINKER_API_TOKEN;
  if (!token) {
    throw new Error('Brak BASELINKER_API_TOKEN w .env!');
  }
  return token;
}

// Rate limiter
let lastRequest = 0;
const MIN_DELAY = 2500; // 2.5s między requestami (safe)

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

async function main() {
  console.log('🚀 Fast Baselinker Sync - HP (WSZYSTKIE produkty)');
  console.log('==================================================\n');
  
  const startTime = Date.now();
  
  // Get API token
  console.log('🔑 Pobieranie tokenu API...');
  const apiToken = getApiToken();
  console.log('✅ Token OK\n');
  
  // Sync categories first
  console.log('📂 Synchronizacja kategorii z magazynu HP...');
  const catResponse = await blRequest(apiToken, 'getInventoryCategories', {
    inventory_id: parseInt(INVENTORY_ID)
  });
  
  const blCategories = catResponse.categories || [];
  console.log(`   Znaleziono ${blCategories.length} kategorii w Baselinker HP`);
  
  // Helper function to get display name from path
  function getDisplayName(name) {
    if (!name) return 'Kategoria';
    const parts = name.split('/');
    return parts[parts.length - 1].trim() || name;
  }
  
  // Create categories with HP prefix
  for (const blCat of blCategories) {
    const blCatId = 'hp-' + blCat.category_id.toString();
    const displayName = '[HP] ' + getDisplayName(blCat.name);
    const slug = 'hp-' + slugify(getDisplayName(blCat.name)) + '-' + blCat.category_id;
    
    await prisma.category.upsert({
      where: { baselinkerCategoryId: blCatId },
      update: {
        name: displayName,
        slug
      },
      create: {
        name: displayName,
        slug,
        baselinkerCategoryId: blCatId
      }
    });
  }
  console.log(`✅ Zsynchronizowano ${blCategories.length} kategorii\n`);
  
  // Get product list (lightweight) - ALL PRODUCTS with pagination
  console.log('📋 Pobieranie listy produktów...');
  let allProducts = [];
  let currentPage = 1;
  let hasMorePages = true;
  
  while (hasMorePages) {
    const response = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: parseInt(INVENTORY_ID),
      page: currentPage
    });
    
    const products = Object.values(response.products || {});
    
    if (products.length === 0) {
      hasMorePages = false;
    } else {
      allProducts = allProducts.concat(products);
      console.log(`   Strona ${currentPage}: ${products.length} produktów (razem: ${allProducts.length})`);
      currentPage++;
      
      // Rate limiting between pages
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }
  
  console.log(`✅ Znaleziono ${allProducts.length} produktów ze wszystkich stron\n`);
  
  // Get existing products from HP
  const existing = await prisma.product.findMany({
    where: { 
      baselinkerProductId: { 
        startsWith: 'hp-'
      } 
    },
    select: { baselinkerProductId: true }
  });
  const existingIds = new Set(existing.map(p => p.baselinkerProductId));
  
  // Filter new products
  const newProducts = allProducts.filter(p => !existingIds.has('hp-' + p.id.toString()));
  console.log(`📦 Nowych produktów do pobrania: ${newProducts.length}\n`);
  
  if (newProducts.length === 0) {
    console.log('✅ Wszystkie produkty z HP są już zsynchronizowane!');
    await prisma.$disconnect();
    return;
  }
  
  // Fetch product details in batches
  const BATCH_SIZE = 100; // Baselinker limit
  let processed = 0;
  let errors = 0;
  
  for (let i = 0; i < newProducts.length; i += BATCH_SIZE) {
    const batchIds = newProducts.slice(i, i + BATCH_SIZE).map(p => p.id);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newProducts.length / BATCH_SIZE);
    
    console.log(`📥 Pobieranie szczegółów batch ${batchNum}/${totalBatches} (${batchIds.length} produktów)...`);
    
    const response = await blRequest(apiToken, 'getInventoryProductsData', {
      inventory_id: parseInt(INVENTORY_ID),
      products: batchIds
    });
    
    // Products are returned as object { productId: data }
    const productsObj = response.products || {};
    
    // Save to database
    for (const [productId, blProduct] of Object.entries(productsObj)) {
      try {
        if (!blProduct || typeof blProduct !== 'object') {
          console.error(`   ✗ Pusty produkt ID: ${productId}`);
          errors++;
          continue;
        }
        
        const baselinkerProductId = 'hp-' + productId;
        const name = getProductName(blProduct) || `Product ${productId}`;
        const baseSku = blProduct.sku || productId.toString();
        const sku = 'hp-' + baseSku; // UNIQUE per warehouse
        const slug = 'hp-' + slugify(name) + '-' + productId;
        const price = getProductPrice(blProduct);
        const description = getProductDescription(blProduct);
        const ean = getProductEan(blProduct);
        const images = Object.values(blProduct.images || {});
        
        // Pobierz tagi z blProduct.tags (tablica) lub z text_fields.extra_field_2 jako fallback
        let tags = ['hp']; // Dodaj tag "hp" do wszystkich produktów
        if (Array.isArray(blProduct.tags)) {
          tags.push(...blProduct.tags.map(t => String(t).trim()).filter(Boolean));
        } else if (blProduct.text_fields?.extra_field_2) {
          tags.push(...blProduct.text_fields.extra_field_2.split(',').map(t => t.trim()).filter(Boolean));
        }
        
        // Znajdź kategorię po baselinkerCategoryId z prefiksem hp
        let categoryId = null;
        if (blProduct.category_id) {
          const category = await prisma.category.findUnique({
            where: { baselinkerCategoryId: 'hp-' + blProduct.category_id.toString() }
          });
          if (category) {
            categoryId = category.id;
          }
        }
        
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
        
        processed++;
        
        if (processed % 20 === 0) {
          console.log(`   ✓ Zapisano ${processed}/${newProducts.length} produktów`);
        }
      } catch (err) {
        errors++;
        console.error(`   ✗ Błąd dla produktu ${productId}: ${err.message}`);
      }
    }
  }
  
  // Sync stock
  console.log('\n📊 Synchronizacja stanów magazynowych...');
  
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
    console.log('   Utworzono domyślną lokalizację');
  }
  
  const stockResponse = await blRequest(apiToken, 'getInventoryProductsStock', {
    inventory_id: parseInt(INVENTORY_ID)
  });
  
  const stockProducts = Object.values(stockResponse.products || {});
  let stockUpdated = 0;
  
  for (const stockEntry of stockProducts) {
    const blId = 'hp-' + stockEntry.product_id.toString();
    const totalStock = Object.values(stockEntry.stock || {}).reduce((sum, qty) => sum + qty, 0);
    
    // Find variant and update inventory
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
  
  console.log(`✅ Zaktualizowano stan dla ${stockUpdated} wariantów\n`);
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('==================================================');
  console.log(`🎉 Zakończono w ${elapsed}s`);
  console.log(`   ✓ Utworzono: ${processed} produktów z magazynu HP`);
  console.log(`   ✗ Błędów: ${errors}`);
  console.log(`   📊 Stany: ${stockUpdated}`);
  console.log(`   📦 Razem produktów HP w bazie: ${processed + existing.length}`);
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
