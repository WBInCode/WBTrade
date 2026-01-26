const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showCategories() {
  const cats = await prisma.category.findMany({
    include: { children: true },
    where: { parentId: null },
    orderBy: { order: 'asc' }
  });
  
  console.log('\n=== KATEGORIE W BAZIE ===\n');
  cats.forEach(c => {
    console.log(`${c.name} (${c.slug})`);
    c.children.forEach(s => console.log(`  - ${s.name} (${s.slug})`));
  });
  
  await prisma.$disconnect();
}

showCategories();
