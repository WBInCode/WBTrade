require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Sprawdź przykładowe baselinkerProductId z bazy
  const products = await p.product.findMany({
    take: 5,
    select: {
      baselinkerProductId: true,
      sku: true,
    }
  });
  
  console.log('=== baselinkerProductId Z BAZY ===');
  products.forEach(pr => {
    console.log(`"${pr.baselinkerProductId}" (type: ${typeof pr.baselinkerProductId}) - SKU: ${pr.sku}`);
  });
  
  // Pobierz przykładowe ID z Baselinker dla magazynu Ikonka
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'X-BLToken': process.env.BASELINKER_API_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'method=getInventoryProductsList&parameters={"inventory_id":22951,"page":1}'
  });
  const data = await res.json();
  const blIds = Object.keys(data.products).slice(0, 5);
  
  console.log('\n=== ID PRODUKTÓW Z BASELINKER (Ikonka) ===');
  blIds.forEach(id => {
    console.log(`"${id}" (type: ${typeof id})`);
  });
  
  // Sprawdź czy któryś z tych ID istnieje w bazie
  const found = await p.product.findMany({
    where: {
      baselinkerProductId: { in: blIds }
    },
    select: { baselinkerProductId: true, sku: true }
  });
  
  console.log(`\n=== ZNALEZIONE W BAZIE ===`);
  console.log(`Znaleziono: ${found.length}`);
  found.forEach(f => console.log(`  ${f.baselinkerProductId} - ${f.sku}`));
  
  // Sprawdź też po konkretnym ID
  const firstBlId = blIds[0];
  const exactMatch = await p.product.findFirst({
    where: { baselinkerProductId: firstBlId }
  });
  console.log(`\nSzukam dokładnie "${firstBlId}": ${exactMatch ? 'ZNALEZIONO' : 'NIE ZNALEZIONO'}`);
  
  // Może ID w bazie są numeryczne?
  const numericMatch = await p.product.findFirst({
    where: { baselinkerProductId: String(parseInt(firstBlId)) }
  });
  console.log(`Szukam jako number "${parseInt(firstBlId)}": ${numericMatch ? 'ZNALEZIONO' : 'NIE ZNALEZIONO'}`);
}

main().finally(() => p.$disconnect());
