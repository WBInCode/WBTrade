require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

const WAREHOUSES = [
  { id: '22951', name: 'Ikonka', prefix: '' },
  { id: '22952', name: 'Leker', prefix: 'leker-' },
  { id: '22953', name: 'BTP', prefix: 'btp-' },
  { id: '22954', name: 'HP', prefix: 'hp-' }
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
  console.log('📊 Porównanie stanów magazynowych: Baselinker vs Baza danych');
  console.log('═'.repeat(70));
  console.log();

  const apiToken = process.env.BASELINKER_API_TOKEN;
  
  // Stany w naszej bazie
  console.log('🗄️  BAZA DANYCH:');
  
  const totalInventory = await prisma.inventory.count();
  const totalStock = await prisma.inventory.aggregate({
    _sum: { quantity: true }
  });
  
  console.log(`   Łączna liczba pozycji inventory: ${totalInventory.toLocaleString('pl-PL')}`);
  console.log(`   Łączny stan: ${totalStock._sum.quantity?.toLocaleString('pl-PL') || 0} szt.`);
  
  // Szczegóły per magazyn w bazie
  for (const warehouse of WAREHOUSES) {
    const where = warehouse.prefix 
      ? { variant: { product: { baselinkerProductId: { startsWith: warehouse.prefix } } } }
      : { variant: { product: { AND: [
          { baselinkerProductId: { not: { startsWith: 'leker-' } } },
          { baselinkerProductId: { not: { startsWith: 'btp-' } } },
          { baselinkerProductId: { not: { startsWith: 'hp-' } } }
        ] } } };
    
    const count = await prisma.inventory.count({ where });
    const sum = await prisma.inventory.aggregate({
      where,
      _sum: { quantity: true }
    });
    
    console.log(`   ${warehouse.name}: ${count.toLocaleString('pl-PL')} pozycji, ${sum._sum.quantity?.toLocaleString('pl-PL') || 0} szt.`);
  }
  
  console.log();
  console.log('═'.repeat(70));
  console.log();
  console.log('📦 BASELINKER (getInventoryProductsStock):');
  
  let baselinkerTotal = 0;
  let baselinkerTotalStock = 0;
  
  for (const warehouse of WAREHOUSES) {
    console.log(`\n   ${warehouse.name} (ID: ${warehouse.id})...`);
    
    try {
      const response = await blRequest(apiToken, 'getInventoryProductsStock', {
        inventory_id: parseInt(warehouse.id)
      });
      
      const products = Object.values(response.products || {});
      
      let warehouseStock = 0;
      products.forEach(p => {
        const stock = Object.values(p.stock || {}).reduce((sum, qty) => sum + parseInt(qty || 0), 0);
        warehouseStock += stock;
      });
      
      baselinkerTotal += products.length;
      baselinkerTotalStock += warehouseStock;
      
      console.log(`      Produkty ze stanami: ${products.length.toLocaleString('pl-PL')}`);
      console.log(`      Łączny stan: ${warehouseStock.toLocaleString('pl-PL')} szt.`);
    } catch (err) {
      console.log(`      ❌ Błąd: ${err.message}`);
    }
  }
  
  console.log();
  console.log('═'.repeat(70));
  console.log();
  console.log('📈 PODSUMOWANIE:');
  console.log(`   Baselinker: ${baselinkerTotal.toLocaleString('pl-PL')} produktów ze stanami`);
  console.log(`   Baza danych: ${totalInventory.toLocaleString('pl-PL')} pozycji inventory`);
  console.log(`   Różnica: ${(totalInventory - baselinkerTotal).toLocaleString('pl-PL')}`);
  console.log();
  console.log(`   Baselinker: ${baselinkerTotalStock.toLocaleString('pl-PL')} szt. łącznie`);
  console.log(`   Baza danych: ${totalStock._sum.quantity?.toLocaleString('pl-PL') || 0} szt. łącznie`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
