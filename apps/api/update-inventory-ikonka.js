/**
 * Update Inventory Script - IKONKA Only
 * Aktualizuje stany magazynowe tylko dla produktów z magazynu Ikonka
 * 
 * Uruchom: node update-inventory-ikonka.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const INVENTORY_ID = '22951'; // Ikonka
const WAREHOUSE_NAME = 'Ikonka';

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

async function main() {
  const startTime = Date.now();
  console.log('🔄 Aktualizacja stanów magazynowych - MAGAZYN IKONKA');
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
  
  console.log(`\n📦 Synchronizacja magazynu: ${WAREHOUSE_NAME} (ID: ${INVENTORY_ID})`);
  console.log('='.repeat(60));
  
  // Pobierz stany magazynowe z Baselinker
  console.log('📥 Pobieranie stanów magazynowych z Baselinker...');
  const stockResponse = await blRequest(apiToken, 'getInventoryProductsStock', {
    inventory_id: parseInt(INVENTORY_ID)
  });
  
  const stockProducts = Object.values(stockResponse.products || {});
  console.log(`📋 Znaleziono ${stockProducts.length} produktów ze stanami w Baselinker\n`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  let unchanged = 0;
  
  for (let i = 0; i < stockProducts.length; i++) {
    const stockEntry = stockProducts[i];
    
    try {
      const productId = stockEntry.product_id.toString();
      
      // Suma stanów ze wszystkich wariantów produktu w Baselinker
      const totalStock = Object.values(stockEntry.stock || {}).reduce((sum, qty) => {
        return sum + (parseInt(qty) || 0);
      }, 0);
      
      // Znajdź wariant w naszej bazie danych (Ikonka nie ma prefiksu)
      const variant = await prisma.productVariant.findFirst({
        where: { baselinkerVariantId: productId }
      });
      
      if (!variant) {
        notFound++;
        if (notFound <= 10) {
          console.log(`   ⚠ Nie znaleziono wariantu dla baselinkerVariantId: ${productId}`);
        } else if (notFound === 11) {
          console.log(`   ⚠ ... (kolejne nie znalezione produkty nie będą wyświetlane)`);
        }
        continue;
      }
      
      // Sprawdź czy stan się zmienił
      const existingInventory = await prisma.inventory.findUnique({
        where: {
          variantId_locationId: {
            variantId: variant.id,
            locationId: defaultLocation.id
          }
        }
      });
      
      if (existingInventory && existingInventory.quantity === totalStock) {
        unchanged++;
      } else {
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
      }
      
      // Progress bar co 100 produktów
      if ((i + 1) % 100 === 0) {
        const progress = ((i + 1) / stockProducts.length * 100).toFixed(1);
        console.log(`   📊 Progress: ${i + 1}/${stockProducts.length} (${progress}%) | Zaktualizowano: ${updated} | Bez zmian: ${unchanged}`);
      }
    } catch (err) {
      errors++;
      console.error(`   ✗ Błąd dla produktu ${stockEntry.product_id}: ${err.message}`);
    }
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Zakończono synchronizację stanów magazynowych');
  console.log('='.repeat(60));
  console.log(`📦 Magazyn: ${WAREHOUSE_NAME}`);
  console.log(`⏱️  Czas trwania: ${elapsed}s (${(elapsed / 60).toFixed(1)} min)`);
  console.log(`✅ Zaktualizowano: ${updated} stanów`);
  console.log(`⚪ Bez zmian: ${unchanged} stanów`);
  console.log(`⚠️  Nie znaleziono: ${notFound} produktów`);
  console.log(`❌ Błędów: ${errors}`);
  console.log('\nZakończono:', new Date().toLocaleString('pl-PL'));
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Krytyczny błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
