require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Pobierz przykładowe produkty z każdego magazynu w Baselinker
  const warehouses = [
    { id: 22951, name: 'Ikonka' },
    { id: 22952, name: 'Leker' },
    { id: 22953, name: 'BTP' },
    { id: 22954, name: 'HP' },
  ];
  
  for (const wh of warehouses) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📦 ${wh.name} (ID: ${wh.id})`);
    console.log('='.repeat(50));
    
    // Pobierz 5 produktów z tego magazynu z Baselinker
    const res = await fetch('https://api.baselinker.com/connector.php', {
      method: 'POST',
      headers: {
        'X-BLToken': process.env.BASELINKER_API_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `method=getInventoryProductsList&parameters={"inventory_id":${wh.id},"page":1}`
    });
    const data = await res.json();
    const blIds = Object.keys(data.products).slice(0, 3);
    
    console.log(`\nID z Baselinker API: ${blIds.join(', ')}`);
    
    // Sprawdź czy te ID są w bazie
    const found = await p.product.findMany({
      where: {
        baselinkerProductId: { in: blIds }
      },
      select: { baselinkerProductId: true, sku: true }
    });
    
    console.log(`Znalezione w bazie: ${found.length}/${blIds.length}`);
    found.forEach(f => console.log(`  ✓ ${f.baselinkerProductId} - SKU: ${f.sku}`));
    
    // Jeśli nie znaleziono, sprawdź jakie ID mają produkty w bazie dla tego magazynu
    // (zakładając że możemy je rozpoznać po SKU)
    if (found.length === 0) {
      // Pobierz szczegóły jednego produktu z BL żeby zobaczyć jego SKU
      const res2 = await fetch('https://api.baselinker.com/connector.php', {
        method: 'POST',
        headers: {
          'X-BLToken': process.env.BASELINKER_API_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `method=getInventoryProductsData&parameters={"inventory_id":${wh.id},"products":[${blIds[0]}]}`
      });
      const data2 = await res2.json();
      const prod = data2.products?.[blIds[0]];
      
      if (prod) {
        console.log(`\nPrzykładowy produkt z BL:`);
        console.log(`  ID: ${blIds[0]}, SKU: ${prod.sku}`);
        
        // Szukaj w bazie po SKU
        const bySku = await p.product.findFirst({
          where: { sku: prod.sku },
          select: { baselinkerProductId: true, sku: true, name: true }
        });
        
        if (bySku) {
          console.log(`\n  Znaleziono w bazie po SKU:`);
          console.log(`  baselinkerProductId w bazie: "${bySku.baselinkerProductId}"`);
          console.log(`  ID z Baselinker API: "${blIds[0]}"`);
          console.log(`  CZY RÓWNE: ${bySku.baselinkerProductId === blIds[0]}`);
        } else {
          console.log(`  Produkt o SKU ${prod.sku} NIE ISTNIEJE w bazie`);
        }
      }
    }
  }
  
  // Pokaż też statystyki bazy
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 STATYSTYKI BAZY');
  console.log('='.repeat(50));
  
  const total = await p.product.count();
  const withBlId = await p.product.count({ where: { baselinkerProductId: { not: null } } });
  
  // Przykładowe baselinkerProductId z bazy
  const samples = await p.product.findMany({
    take: 10,
    select: { baselinkerProductId: true, sku: true },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Razem produktów: ${total}`);
  console.log(`Z baselinkerProductId: ${withBlId}`);
  console.log(`\nPrzykładowe baselinkerProductId z bazy:`);
  samples.forEach(s => console.log(`  "${s.baselinkerProductId}" - SKU: ${s.sku}`));
}

main().finally(() => p.$disconnect());
