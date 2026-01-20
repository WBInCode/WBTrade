/**
 * TEST: Synchronizacja 10 produktów z Ikonka
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

async function blRequest(apiToken, method, parameters = {}) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));
  
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  return response.json();
}

function getProductTags(blProduct) {
  let tags = [];
  if (Array.isArray(blProduct.tags)) {
    tags = blProduct.tags.map(t => String(t).trim()).filter(Boolean);
  }
  if (tags.length === 0 && blProduct.text_fields?.extra_field_2) {
    tags = blProduct.text_fields.extra_field_2.split(',').map(t => t.trim()).filter(Boolean);
  }
  return tags;
}

async function test() {
  console.log('=== TEST SYNC 10 PRODUKTÓW Z IKONKA ===\n');
  
  const apiToken = process.env.BASELINKER_API_TOKEN;
  if (!apiToken) { 
    console.log('Brak BASELINKER_API_TOKEN!'); 
    return; 
  }
  
  // Pobierz magazyny
  console.log('Pobieranie magazynów...');
  const invResp = await blRequest(apiToken, 'getInventories');
  
  console.log('Dostępne magazyny:');
  for (const inv of invResp.inventories || []) {
    console.log(`  - ${inv.name} (ID: ${inv.inventory_id})`);
  }
  
  const ikonka = invResp.inventories?.find(i => 
    i.name.toLowerCase().includes('ikonka')
  );
  
  if (!ikonka) {
    console.log('\nNie znaleziono magazynu Ikonka!');
    console.log('Użyję pierwszego dostępnego...');
    const first = invResp.inventories?.[0];
    if (!first) {
      console.log('Brak magazynów!');
      return;
    }
    ikonka = first;
  }
  
  console.log(`\nWybrany magazyn: ${ikonka.name} (ID: ${ikonka.inventory_id})\n`);
  
  // Pobierz 10 produktów
  console.log('Pobieranie listy produktów...');
  const listResp = await blRequest(apiToken, 'getInventoryProductsList', {
    inventory_id: parseInt(ikonka.inventory_id),
    page: 1
  });
  
  const productIds = Object.values(listResp.products || {}).slice(0, 10).map(p => p.id);
  console.log(`Pobrano ${productIds.length} ID produktów\n`);
  
  if (productIds.length === 0) {
    console.log('Brak produktów!');
    return;
  }
  
  // Pobierz szczegóły
  console.log('Pobieranie szczegółów produktów...\n');
  const dataResp = await blRequest(apiToken, 'getInventoryProductsData', {
    inventory_id: parseInt(ikonka.inventory_id),
    products: productIds
  });
  
  const products = dataResp.products || {};
  
  for (const [id, blProduct] of Object.entries(products)) {
    const name = blProduct.text_fields?.name || blProduct.name || 'Brak nazwy';
    const tags = getProductTags(blProduct);
    
    console.log('─'.repeat(60));
    console.log(`ID: ${id}`);
    console.log(`Nazwa: ${name.substring(0, 55)}...`);
    console.log(`Tagi z Baselinker: ${JSON.stringify(tags)}`);
    
    // Sprawdź w bazie
    const dbProduct = await prisma.product.findUnique({
      where: { baselinkerProductId: id },
      select: { id: true, tags: true }
    });
    
    if (dbProduct) {
      console.log(`Tagi w bazie:      ${JSON.stringify(dbProduct.tags)}`);
      const changed = JSON.stringify([...(dbProduct.tags || [])].sort()) !== JSON.stringify([...tags].sort());
      console.log(`Wymaga aktualizacji: ${changed ? '✅ TAK' : '❌ NIE'}`);
    } else {
      console.log(`Status: ⚠️ NOWY PRODUKT (nie ma w bazie)`);
    }
    console.log('');
  }
  
  await prisma.$disconnect();
  console.log('=== KONIEC TESTU ===');
}

test().catch(async (err) => {
  console.error('Błąd:', err);
  await prisma.$disconnect();
});
