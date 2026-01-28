require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Sprawdź kategorię 2806608
  const cat = await p.category.findFirst({
    where: { baselinkerCategoryId: 2806608 }
  });
  console.log('=== KATEGORIA 2806608 ===');
  console.log(cat ? `Znaleziono: ${cat.name} (ID: ${cat.id})` : 'NIE ZNALEZIONO');

  // 2. Sprawdź produkt 212580651 w bazie
  const prod = await p.product.findFirst({
    where: { baselinkerProductId: '212580651' }
  });
  console.log('\n=== PRODUKT 212580651 (jako string) ===');
  console.log(prod ? `Znaleziono: ${prod.name}` : 'NIE ZNALEZIONO');
  
  // 3. Sprawdź jak wyglądają ID w bazie dla HP
  const hpProducts = await p.product.findMany({
    take: 5,
    where: { sku: { startsWith: '101' } }, // SKU HP zaczyna się od 101
    select: { baselinkerProductId: true, sku: true }
  });
  console.log('\n=== PRZYKŁADOWE PRODUKTY HP W BAZIE ===');
  hpProducts.forEach(pr => {
    console.log(`baselinkerProductId: "${pr.baselinkerProductId}", SKU: ${pr.sku}`);
  });
  
  // 4. Znajdź produkt po SKU 1017281
  const bySku = await p.product.findFirst({
    where: { sku: '1017281' },
    select: { baselinkerProductId: true, sku: true, name: true }
  });
  console.log('\n=== SZUKAM PO SKU 1017281 ===');
  console.log(bySku ? `baselinkerProductId: "${bySku.baselinkerProductId}", name: ${bySku.name}` : 'NIE ZNALEZIONO');
}

main().finally(() => p.$disconnect());
