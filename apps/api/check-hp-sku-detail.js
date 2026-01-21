require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Przykłady SKU dla HP w bazie
  const dbProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'hp-' } },
    select: { sku: true, baselinkerProductId: true },
    take: 20
  });
  
  console.log('SKU z bazy (HP) - pierwsze 20:');
  dbProducts.forEach(p => console.log('  SKU:', p.sku, '| blId:', p.baselinkerProductId));
  
  // Sprawdź unikalność SKU
  const allHpSkus = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'hp-' } },
    select: { sku: true },
  });
  
  const uniqueSkus = new Set(allHpSkus.map(p => p.sku));
  console.log('\nRazem produktów HP:', allHpSkus.length);
  console.log('Unikalnych SKU:', uniqueSkus.size);
  
  // Sprawdź ile SKU to same cyfry
  const numericSkus = allHpSkus.filter(p => /^\d+$/.test(p.sku));
  console.log('SKU numeryczne:', numericSkus.length);
  
  // Rozkład pierwszych 3 znaków SKU
  const prefixes = {};
  allHpSkus.forEach(p => {
    const prefix = p.sku?.substring(0, 3) || 'null';
    prefixes[prefix] = (prefixes[prefix] || 0) + 1;
  });
  
  console.log('\nRozkład prefiksów SKU (top 10):');
  Object.entries(prefixes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([prefix, count]) => console.log(`  ${prefix}: ${count}`));
  
  await prisma.$disconnect();
}

check();
