require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Sprawdź przykładowe produkty z bazy - ich baselinkerProductId
  const products = await p.product.findMany({
    take: 5,
    select: {
      id: true,
      baselinkerProductId: true,
      sku: true,
    }
  });
  
  console.log('=== PRODUKTY Z BAZY (pierwsze 5) ===');
  products.forEach(pr => {
    console.log(`BL_ID: ${pr.baselinkerProductId}, SKU: ${pr.sku}`);
  });
  
  // Pobierz produkty z Baselinker i sprawdź po SKU
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'X-BLToken': process.env.BASELINKER_API_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `method=getInventoryProductsData&parameters={"inventory_id":11235,"products":[${products[0].baselinkerProductId}]}`
  });
  const data = await res.json();
  
  console.log('\n=== PRODUKT Z BASELINKER (po ID z bazy) ===');
  console.log(JSON.stringify(data, null, 2));
  
  // Sprawdźmy też po SKU
  const sku = products[0].sku;
  console.log(`\n=== SZUKAM PO SKU: ${sku} ===`);
  
  // Pobierz z Baselinker po filtrze
  const res2 = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'X-BLToken': process.env.BASELINKER_API_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `method=getInventoryProductsList&parameters={"inventory_id":11235,"filter_ean":"${sku}"}`
  });
  const data2 = await res2.json();
  console.log('Wynik szukania po SKU jako EAN:', Object.keys(data2.products || {}).length);
}

main().finally(() => p.$disconnect());
