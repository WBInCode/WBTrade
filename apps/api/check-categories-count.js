const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.category.count();
  console.log('Total categories:', count);
  
  const topLevel = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true, slug: true }
  });
  console.log('Top-level categories:', topLevel.length);
  topLevel.forEach(c => console.log(`  - ${c.name} (${c.slug})`));
  
  await prisma.$disconnect();
}

check();
