/**
 * Update Inventory Script
 * Aktualizuje stany magazynowe wszystkich produktów z Baselinker
 * 
 * Uruchom: node update-inventory.js
 * 
 * Wspierane magazyny:
 * - Ikonka (ID: 22951)
 * - Leker (ID: 22952)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

// Magazyny do synchronizacji
const WAREHOUSES = [
  { id: '22951', name: 'Ikonka', prefix: '' },
  { id: '22952', name: 'Leker', prefix: 'leker-' },
  { id: '22953', name: 'BTP', prefix: 'btp-' },
  { id: '22954', name: 'HP', prefix: 'hp-' }
];

function getApiToken() {
  const token = process.env.BASELINKER_API_TOKEN;
  if (!token) {
    throw new Error('Brak BASELINKER_API_TOKEN w .env!');
  }
  return token;
}

// Rate limiter
let lastRequest = 0;
const MIN_DELAY = 2500; // 2.5s między requestami

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

async function updateInventoryForWarehouse(apiToken, warehouse, defaultLocation) {
  console.log(`\n📦 Synchronizacja magazynu: ${warehouse.name} (ID: ${warehouse.id})`);
  console.log('='.repeat(60));
  
  // Pobierz listę wszystkich produktów z paginacją
  console.log('📋 Pobieranie listy produktów...');
  let allProducts = [];
  let currentPage = 1;
  let hasMorePages = true;
  
  while (hasMorePages) {
    const response = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: parseInt(warehouse.id),
      page: currentPage
    });
    
    const products = Object.values(response.products || {});
    
    if (products.length === 0) {
      hasMorePages = false;
    } else {
      allProducts = allProducts.concat(products);
      console.log(`   Strona ${currentPage}: ${products.length} produktów (razem: ${allProducts.length})`);
      currentPage++;
    }
  }
  
  console.log(`✅ Znaleziono ${allProducts.length} produktów\n`);
  
  // Pobierz szczegółowe stany w batchach po 100
  const BATCH_SIZE = 100;
  const stockProducts = [];
  
  console.log('📥 Pobieranie szczegółów stanów magazynowych...');
  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batchIds = allProducts.slice(i, i + BATCH_SIZE).map(p => p.id);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allProducts.length / BATCH_SIZE);
    
    console.log(`   Batch ${batchNum}/${totalBatches} (${batchIds.length} produktów)...`);
    
    const response = await blRequest(apiToken, 'getInventoryProductsData', {
      inventory_id: parseInt(warehouse.id),
      products: batchIds
    });
    
    // Klucze to product_id, wartości to dane produktu
    const productsObj = response.products || {};
    for (const [productId, productData] of Object.entries(productsObj)) {
      stockProducts.push({
        ...productData,
        product_id: productId  // Dodaj ID jako właściwość
      });
    }
  }
  
  console.log(`✅ Pobrano szczegóły ${stockProducts.length} produktów\n`);
  
  // Debug: sprawdź pierwszy produkt
  if (stockProducts.length > 0) {
    console.log('🔍 DEBUG - przykładowy produkt:');
    const sample = stockProducts[0];
    console.log(`   ID: ${sample.id || sample.product_id}`);
    console.log(`   Stock: ${sample.stock}`);
    console.log(`   Klucze: ${Object.keys(sample).join(', ')}`);
    console.log();
  }
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  for (const stockEntry of stockProducts) {
    try {
      const productId = stockEntry.id?.toString() || stockEntry.product_id?.toString();
      if (!productId) continue;
      
      const blId = warehouse.prefix + productId;
      
      // Suma stanów ze wszystkich magazynów Baselinker dla tego produktu
      const stockObj = stockEntry.stock || {};
      const totalStock = Object.values(stockObj).reduce((sum, qty) => {
        return sum + (parseInt(qty) || 0);
      }, 0);
      
      // Znajdź wariant w naszej bazie danych
      const variant = await prisma.productVariant.findFirst({
        where: { baselinkerVariantId: blId }
      });
      
      if (!variant) {
        notFound++;
        if (notFound <= 5) {
          console.log(`   ⚠ Nie znaleziono wariantu dla baselinkerVariantId: ${blId}`);
        }
        continue;
      }
      
      // Upsert stanu magazynowego
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
      
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`   ✓ Zaktualizowano ${updated} stanów...`);
      }
    } catch (err) {
      errors++;
      console.error(`   ✗ Błąd dla produktu ${stockEntry.product_id}: ${err.message}`);
    }
  }
  
  console.log('\n📊 Podsumowanie magazynu ' + warehouse.name + ':');
  console.log(`   ✓ Zaktualizowano: ${updated}`);
  console.log(`   ⚠ Nie znaleziono: ${notFound}`);
  console.log(`   ✗ Błędów: ${errors}`);
  
  return { updated, notFound, errors };
}

async function main() {
  const startTime = Date.now();
  console.log('🔄 Aktualizacja stanów magazynowych z Baselinker');
  console.log('Rozpoczęto:', new Date().toLocaleString('pl-PL'));
  console.log('='.repeat(60));
  
  const apiToken = getApiToken();
  
  // Upewnij się, że domyślna lokalizacja istnieje
  let defaultLocation = await prisma.location.findFirst({
    where: { code: 'MAIN' }
  });
  
  if (!defaultLocation) {
    console.log('📍 Tworzenie domyślnej lokalizacji magazynowej...');
    defaultLocation = await prisma.location.create({
      data: {
        name: 'Magazyn główny',
        code: 'MAIN',
        type: 'WAREHOUSE'
      }
    });
    console.log('   ✓ Utworzono lokalizację: MAIN');
  } else {
    console.log(`📍 Używam istniejącej lokalizacji: ${defaultLocation.name} (${defaultLocation.code})`);
  }
  
  // Statystyki łączne
  let totalUpdated = 0;
  let totalNotFound = 0;
  let totalErrors = 0;
  
  // Synchronizuj każdy magazyn
  for (const warehouse of WAREHOUSES) {
    const result = await updateInventoryForWarehouse(apiToken, warehouse, defaultLocation);
    totalUpdated += result.updated;
    totalNotFound += result.notFound;
    totalErrors += result.errors;
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Zakończono synchronizację stanów magazynowych');
  console.log('='.repeat(60));
  console.log(`⏱️  Czas trwania: ${elapsed}s (${(elapsed / 60).toFixed(1)} min)`);
  console.log(`✅ Zaktualizowano: ${totalUpdated} stanów`);
  console.log(`⚠️  Nie znaleziono: ${totalNotFound} produktów`);
  console.log(`❌ Błędów: ${totalErrors}`);
  console.log('\nZakończono:', new Date().toLocaleString('pl-PL'));
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Krytyczny błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
