const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Sprawdź tagi produktów i baselinkerProductId
  const products = await prisma.product.findMany({
    where: { baselinkerProductId: { not: null } },
    select: { 
      id: true, 
      name: true, 
      baselinkerProductId: true, 
      tags: true 
    },
    take: 10
  });
  
  console.log('Przykładowe produkty z Baselinkera:\n');
  products.forEach(p => {
    console.log('  Nazwa:', p.name.substring(0, 50) + '...');
    console.log('  BL ID:', p.baselinkerProductId);
    console.log('  Tagi:', p.tags);
    console.log('  ---');
  });
  
  // Sprawdź unikalne prefixy w baselinkerProductId
  const allProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { not: null } },
    select: { baselinkerProductId: true, tags: true }
  });
  
  const prefixes = new Set(allProducts.map(p => p.baselinkerProductId?.split('-')[0]));
  console.log('\nUnikalne prefixy w baselinkerProductId:', Array.from(prefixes));
  
  // Sprawdź unikalne tagi
  const allTags = new Set();
  allProducts.forEach(p => p.tags?.forEach(t => allTags.add(t)));
  console.log('Unikalne tagi:', Array.from(allTags).slice(0, 20));
}

main().finally(() => prisma.$disconnect());
