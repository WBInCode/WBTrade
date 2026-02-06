const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Outlet jako drugi w kolejności (zaraz po "Wszystkie produkty")
  // "Wszystkie produkty" to link, nie kategoria - więc Outlet = order: 1
  
  const categoryOrder = [
    { slug: 'outlet', order: 1 }, // Outlet zaraz po "Wszystkie produkty"
    { slug: 'chemia-profesjonalna', order: 2 },
    { slug: 'dla-dziecka', order: 3 },
    { slug: 'dom', order: 4 },
    { slug: 'elektronika-i-gsm', order: 5 },
    { slug: 'gastronomia', order: 6 },
    { slug: 'motoryzacja', order: 7 },
    { slug: 'narzedzia', order: 8 },
    { slug: 'ogrod-i-gospodarstwo', order: 9 },
    { slug: 'sport-i-turystyka', order: 10 },
    { slug: 'wagi', order: 11 },
    { slug: 'zdrowie-i-uroda', order: 12 },
  ];

  console.log('Updating category order...\n');

  for (const cat of categoryOrder) {
    const result = await prisma.category.updateMany({
      where: { slug: cat.slug },
      data: { order: cat.order }
    });
    console.log(`  ${cat.slug}: order = ${cat.order} (updated ${result.count})`);
  }

  console.log('\n✅ Category order updated!\n');

  // Verify the result
  const cats = await prisma.category.findMany({
    where: { 
      parentId: null, 
      isActive: true, 
      baselinkerCategoryId: { not: null } 
    },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { 
      name: true, 
      slug: true, 
      order: true 
    }
  });

  console.log('New category order:');
  cats.forEach((cat, i) => {
    console.log(`  ${i + 1}. ${cat.name} (order: ${cat.order})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
