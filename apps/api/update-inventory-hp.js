const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const BASELINKER_TOKEN = process.env.BASELINKER_API_TOKEN;
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const RATE_LIMIT_DELAY = 2500; // 2.5 sekundy między zapytaniami

const WAREHOUSE_CONFIG = {
  id: 22954,
  name: 'HP',
  prefix: 'hp-'
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callBaselinkerAPI(method, parameters = {}) {
  try {
    const response = await axios.post(
      BASELINKER_API_URL,
      new URLSearchParams({
        token: BASELINKER_TOKEN,
        method: method,
        parameters: JSON.stringify(parameters),
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.status === 'ERROR') {
      throw new Error(`Baselinker API Error: ${response.data.error_message}`);
    }

    return response.data;
  } catch (error) {
    console.error(`❌ Błąd API (${method}):`, error.message);
    throw error;
  }
}

async function getLocation() {
  const location = await prisma.location.findFirst({
    where: { code: 'MAIN' }
  });

  if (!location) {
    throw new Error('Nie znaleziono lokalizacji MAIN');
  }

  console.log(`📍 Używam lokalizacji: ${location.name} (${location.code})\n`);
  return location;
}

async function syncWarehouseInventory(warehouseId, warehouseName, prefix, location) {
  console.log(`📦 Synchronizacja magazynu: ${warehouseName} (ID: ${warehouseId})`);
  console.log('='.repeat(60));

  let allProductIds = [];
  let page = 0;

  // Pobierz listę wszystkich produktów (z paginacją)
  console.log('📋 Pobieranie listy produktów...');
  while (true) {
    await delay(RATE_LIMIT_DELAY);
    
    const response = await callBaselinkerAPI('getInventoryProductsList', {
      inventory_id: warehouseId,
      page: page
    });

    const productIds = Object.keys(response.products || {});
    allProductIds = allProductIds.concat(productIds);
    
    console.log(`   Strona ${page + 1}: ${productIds.length} produktów (razem: ${allProductIds.length})`);

    if (productIds.length < 1000) break;
    page++;
  }

  console.log(`✅ Znaleziono ${allProductIds.length} produktów\n`);

  if (allProductIds.length === 0) {
    console.log('⚠ Brak produktów do synchronizacji\n');
    return { updated: 0, notFound: 0, errors: 0 };
  }

  // Pobierz szczegóły produktów w partiach po 100
  console.log('📥 Pobieranie szczegółów stanów magazynowych...');
  const batchSize = 100;
  const batches = Math.ceil(allProductIds.length / batchSize);
  
  let allProducts = [];
  
  for (let i = 0; i < batches; i++) {
    const batchIds = allProductIds.slice(i * batchSize, (i + 1) * batchSize);
    
    await delay(RATE_LIMIT_DELAY);
    
    console.log(`   Batch ${i + 1}/${batches} (${batchIds.length} produktów)...`);
    
    const response = await callBaselinkerAPI('getInventoryProductsData', {
      inventory_id: warehouseId,
      products: batchIds
    });

    if (response.products) {
      const productsObj = response.products;
      
      // Konwertuj obiekt na tablicę z zachowaniem product_id
      const stockProducts = [];
      for (const [productId, productData] of Object.entries(productsObj)) {
        stockProducts.push({
          ...productData,
          product_id: productId
        });
      }
      
      allProducts = allProducts.concat(stockProducts);
    }
  }

  console.log(`✅ Pobrano szczegóły ${allProducts.length} produktów\n`);

  // DEBUG - pokaż przykładowy produkt
  if (allProducts.length > 0) {
    const sample = allProducts[0];
    console.log('🔍 DEBUG - przykładowy produkt:');
    console.log('   ID:', sample.product_id);
    console.log('   Stock:', sample.stock);
    console.log('   Klucze:', Object.keys(sample).join(', '));
  }

  // Aktualizuj stany w bazie danych
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const stockEntry of allProducts) {
    try {
      const baselinkerVariantId = prefix ? `${prefix}${stockEntry.product_id}` : stockEntry.product_id.toString();
      
      // Oblicz całkowity stan ze wszystkich magazynów
      const stockObj = stockEntry.stock || {};
      const totalStock = Object.values(stockObj).reduce((sum, qty) => {
        return sum + (parseInt(qty) || 0);
      }, 0);

      // Znajdź wariant po baselinkerVariantId
      const variant = await prisma.productVariant.findUnique({
        where: { baselinkerVariantId }
      });

      if (!variant) {
        if (notFound % 100 === 0 && notFound > 0) {
          console.log(`   ⚠ Nie znaleziono wariantu dla baselinkerVariantId: ${baselinkerVariantId}`);
        }
        notFound++;
        continue;
      }

      // Upsert inventory
      await prisma.inventory.upsert({
        where: {
          variantId_locationId: {
            variantId: variant.id,
            locationId: location.id
          }
        },
        update: {
          quantity: totalStock,
          updatedAt: new Date()
        },
        create: {
          variantId: variant.id,
          locationId: location.id,
          quantity: totalStock
        }
      });

      updated++;
      
      if (updated % 100 === 0) {
        console.log(`   ✓ Zaktualizowano ${updated} stanów...`);
      }

    } catch (error) {
      console.error(`   ❌ Błąd dla produktu ${stockEntry.product_id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Podsumowanie magazynu ${warehouseName}:`);
  console.log(`   ✓ Zaktualizowano: ${updated}`);
  console.log(`   ⚠ Nie znaleziono: ${notFound}`);
  console.log(`   ✗ Błędów: ${errors}\n`);

  return { updated, notFound, errors };
}

async function main() {
  console.log('🔄 Aktualizacja stanów magazynowych - HP');
  console.log('Rozpoczęto:', new Date().toLocaleString('pl-PL'));
  console.log('='.repeat(60));

  try {
    const location = await getLocation();
    
    const result = await syncWarehouseInventory(
      WAREHOUSE_CONFIG.id,
      WAREHOUSE_CONFIG.name,
      WAREHOUSE_CONFIG.prefix,
      location
    );

    console.log('✅ Synchronizacja HP zakończona pomyślnie!');
    console.log(`📊 Razem zaktualizowano: ${result.updated} stanów`);
    
  } catch (error) {
    console.error('❌ Błąd podczas synchronizacji:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
