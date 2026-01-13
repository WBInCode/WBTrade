require('dotenv').config();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

const WAREHOUSES = [
  { id: '22951', name: 'Ikonka' },
  { id: '22952', name: 'Leker' },
  { id: '22953', name: 'BTP' },
  { id: '22954', name: 'HP' }
];

let lastRequest = 0;
const MIN_DELAY = 2500;

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
    throw new Error(`Baselinker error: ${data.error_message}`);
  }
  
  return data;
}

async function main() {
  console.log('📊 Szczegółowa analiza stanów w Baselinker');
  console.log('═'.repeat(70));
  console.log('⚠️  getInventoryProductsStock zwraca MAX 1000 produktów!');
  console.log('   Sprawdzamy czy to wszystkie produkty ze stanami...\n');

  const apiToken = process.env.BASELINKER_API_TOKEN;
  
  for (const warehouse of WAREHOUSES) {
    console.log(`\n📦 ${warehouse.name} (ID: ${warehouse.id})`);
    console.log('─'.repeat(70));
    
    // Pobierz listę wszystkich produktów
    console.log('   Pobieranie WSZYSTKICH produktów...');
    let allProducts = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await blRequest(apiToken, 'getInventoryProductsList', {
        inventory_id: parseInt(warehouse.id),
        page: page
      });
      
      const products = Object.values(response.products || {});
      if (products.length === 0) {
        hasMore = false;
      } else {
        allProducts = allProducts.concat(products);
        process.stdout.write(`\r   Strona ${page}: ${allProducts.length} produktów`);
        page++;
      }
    }
    
    console.log(`\n   ✅ Znaleziono ${allProducts.length} produktów w magazynie`);
    
    // Pobierz stany (tylko 1000)
    const stockResponse = await blRequest(apiToken, 'getInventoryProductsStock', {
      inventory_id: parseInt(warehouse.id)
    });
    
    const stockProducts = Object.values(stockResponse.products || {});
    
    let totalWithStock = 0;
    let totalStockQty = 0;
    
    stockProducts.forEach(p => {
      const stock = Object.values(p.stock || {}).reduce((sum, qty) => sum + parseInt(qty || 0), 0);
      if (stock > 0) {
        totalWithStock++;
        totalStockQty += stock;
      }
    });
    
    console.log(`   📊 getInventoryProductsStock zwrócił: ${stockProducts.length} produktów`);
    console.log(`   🟢 Z niezerowymi stanami: ${totalWithStock} produktów`);
    console.log(`   📈 Łączny stan (z 1000 pierwszych): ${totalStockQty.toLocaleString('pl-PL')} szt.`);
    
    if (stockProducts.length >= 1000) {
      console.log(`   ⚠️  UWAGA: Limit 1000 osiągnięty! Może być więcej produktów ze stanami.`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n💡 WNIOSEK:');
  console.log('   API getInventoryProductsStock ma limit 1000 produktów.');
  console.log('   Aby pobrać WSZYSTKIE stany, trzeba użyć:');
  console.log('   1. getInventoryProductsList (z paginacją) - wszystkie produkty');
  console.log('   2. getInventoryProductsData (batche po 100) - szczegóły + stany');
}

main().catch(console.error);
