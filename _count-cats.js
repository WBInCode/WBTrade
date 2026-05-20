const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://neondb_owner:npg_4v2IehYGZzjF@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' } } });

async function main() {
  const slash = await prisma.category.count({ where: { name: { contains: '/' } } });
  const withProducts = await prisma.category.count({ where: { name: { contains: '/' }, products: { some: {} } } });
  console.log('Categories with / in name: ' + slash);
  console.log('Of those with products: ' + withProducts);
  
  const topLevel = await prisma.category.findMany({
    where: { parentId: null },
    select: { name: true, _count: { select: { products: true, children: true } } },
    orderBy: { name: 'asc' }
  });
  console.log('\nAll top-level categories (' + topLevel.length + '):');
  for (const c of topLevel) {
    console.log('  ' + c.name + ' (' + c._count.products + ' prod, ' + c._count.children + ' children)');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
