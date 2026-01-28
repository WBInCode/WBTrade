require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Sprawdź przykładowe produkty z bazy
  const products = await p.product.findMany({
    take: 10,
    select: {
      id: true,
      baselinkerProductId: true,
      sku: true,
      name: true,
    }
  });
  
  console.log('=== PRODUKTY Z BAZY ===');
  products.forEach(pr => {
    console.log(`ID: ${pr.id}, BL_ID: ${pr.baselinkerProductId}, SKU: ${pr.sku}`);
  });
  
  // Ile produktów ma baselinkerProductId?
  const withBlId = await p.product.count({ where: { baselinkerProductId: { not: null } } });
  const total = await p.product.count();
  
  console.log(`\n=== STATYSTYKI ===`);
  console.log(`Produkty z baselinkerProductId: ${withBlId}/${total}`);
  
  // Pobierz przykładowe ID z Baselinker
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'X-BLToken': process.env.BASELINKER_API_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'method=getInventoryProductsList&parameters={"inventory_id":11235,"page":1}'
  });
  const data = await res.json();
  const blIds = Object.keys(data.products).slice(0, 10);
  
  console.log(`\n=== ID PRODUKTÓW Z BASELINKER ===`);
  console.log(blIds);
  
  // Sprawdź czy któreś ID z Baselinker istnieje w bazie
  const matching = await p.product.findMany({
    where: {
      baselinkerProductId: { in: blIds.map(id => parseInt(id)) }
    },
    select: { baselinkerProductId: true }
  });
  
  console.log(`\n=== DOPASOWANIA ===`);
  console.log(`Znaleziono ${matching.length} produktów pasujących do pierwszych 10 ID z Baselinker`);
}

main().finally(() => p.$disconnect());
