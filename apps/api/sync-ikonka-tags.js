/**
 * Sync tagów dla IKONKA
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const IKONKA_ID = '22951';
const MIN_DELAY = 2500;
let lastRequest = 0;

async function blRequest(apiToken, method, parameters = {}) {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < MIN_DELAY) await new Promise(r => setTimeout(r, MIN_DELAY - elapsed));
  lastRequest = Date.now();
  
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));
  
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(BASELINKER_API_URL, {
      method: 'POST',
      headers: { 'X-BLToken': apiToken, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    const data = await response.json();
    if (data.status === 'ERROR') {
      if (data.error_message?.includes('Query limit')) {
        console.log('Rate limit, czekam 60s...');
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }
      throw new Error(data.error_message);
    }
    return data;
  }
}

function getProductTags(blProduct) {
  let tags = [];
  if (Array.isArray(blProduct.tags)) tags = blProduct.tags.map(t => String(t).trim()).filter(Boolean);
  if (tags.length === 0 && blProduct.text_fields?.extra_field_2) {
    tags = blProduct.text_fields.extra_field_2.split(',').map(t => t.trim()).filter(Boolean);
  }
  return tags;
}

async function main() {
  console.log('=== SYNC TAGÓW: IKONKA ===\n');
  const startTime = Date.now();
  const apiToken = process.env.BASELINKER_API_TOKEN;
  
  // Pobierz wszystkie produkty z bazy które mają baselinkerProductId
  const existingProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { not: null } },
    select: { id: true, baselinkerProductId: true, tags: true }
  });
  const existingMap = new Map(existingProducts.map(p => [p.baselinkerProductId, p]));
  console.log('Produkty w bazie: ' + existingProducts.length);
  
  // Pobierz listę produktów z Ikonka
  console.log('Pobieranie listy z Ikonka...');
  let allProductIds = [];
  let page = 1;
  while (true) {
    const resp = await blRequest(apiToken, 'getInventoryProductsList', { inventory_id: parseInt(IKONKA_ID), page });
    const products = Object.values(resp.products || {});
    if (products.length === 0) break;
    allProductIds = allProductIds.concat(products.map(p => p.id));
    console.log('  Strona ' + page + ': ' + products.length + ' (razem: ' + allProductIds.length + ')');
    page++;
  }
  
  // Filtruj tylko te które są w bazie
  const relevantIds = allProductIds.filter(id => existingMap.has(id.toString()));
  console.log('\nProdukty w Baselinker: ' + allProductIds.length);
  console.log('Powiązanych z bazą: ' + relevantIds.length + '\n');
  
  let updated = 0, unchanged = 0, errors = 0;
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < relevantIds.length; i += BATCH_SIZE) {
    const batchIds = relevantIds.slice(i, i + BATCH_SIZE);
    const resp = await blRequest(apiToken, 'getInventoryProductsData', { inventory_id: parseInt(IKONKA_ID), products: batchIds });
    
    for (const [productId, blProduct] of Object.entries(resp.products || {})) {
      try {
        const existing = existingMap.get(productId);
        if (!existing) continue;
        
        const newTags = getProductTags(blProduct);
        const currentTags = existing.tags || [];
        const changed = JSON.stringify([...currentTags].sort()) !== JSON.stringify([...newTags].sort());
        
        if (changed) {
          await prisma.product.update({ where: { id: existing.id }, data: { tags: newTags } });
          updated++;
          if (updated <= 10) console.log('  Update: ' + productId + ' -> ' + JSON.stringify(newTags));
        } else {
          unchanged++;
        }
      } catch (e) { errors++; }
    }
    
    console.log('Progress: ' + Math.min(i + BATCH_SIZE, relevantIds.length) + '/' + relevantIds.length + ' (updated: ' + updated + ')');
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n=== PODSUMOWANIE ===');
  console.log('Czas: ' + elapsed + 's');
  console.log('Zaktualizowano: ' + updated);
  console.log('Bez zmian: ' + unchanged);
  console.log('Błędów: ' + errors);
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Błąd:', err);
  await prisma.$disconnect();
});
