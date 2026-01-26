const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PRODUKTY W KATEGORIACH ===\n');

  // Sprawdź ile produktów ma przypisaną kategorię
  const withCategory = await prisma.product.count({
    where: { categoryId: { not: null } }
  });
  
  const withoutCategory = await prisma.product.count({
    where: { categoryId: null }
  });

  console.log(`Produkty Z kategorią: ${withCategory}`);
  console.log(`Produkty BEZ kategorii: ${withoutCategory}`);
  console.log('');

  // Pokaż liczbę produktów w każdej kategorii
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { order: 'asc' }
  });

  console.log('Produkty w kategoriach:');
  for (const cat of categories) {
    const indent = cat.parentId ? '  ' : '';
    console.log(`${indent}${cat.name}: ${cat._count.products}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
