/**
 * Skrypt do sprawdzania duplikatów SKU
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Szukam duplikatów SKU...\n');
  
  // Pobierz wszystkie produkty
  const products = await prisma.product.findMany({
    select: {
      sku: true,
      baselinkerProductId: true,
      name: true,
      tags: true
    }
  });
  
  // Grupuj po SKU
  const skuMap = {};
  products.forEach(p => {
    if (!skuMap[p.sku]) {
      skuMap[p.sku] = [];
    }
    skuMap[p.sku].push(p);
  });
  
  // Znajdź duplikaty
  const duplicates = Object.entries(skuMap).filter(([sku, prods]) => prods.length > 1);
  
  console.log('=== DUPLIKATY SKU ===');
  console.log(`Znaleziono: ${duplicates.length}\n`);
  
  duplicates.forEach(([sku, prods]) => {
    console.log(`SKU: ${sku}`);
    prods.forEach(p => {
      const warehouse = p.tags?.includes('leker') ? 'LEKER' : 'IKONKA';
      console.log(`  - ${p.name}`);
      console.log(`    Magazyn: ${warehouse}`);
      console.log(`    BL ID: ${p.baselinkerProductId}`);
    });
    console.log('');
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
