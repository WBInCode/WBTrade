// Clean up remaining junk categories: empty name and "do zrobienia"  
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_4v2IehYGZzjF@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  // Find category with empty name
  const emptyCats = await prisma.category.findMany({
    where: { name: { in: ['', ' '] } },
    select: { id: true, name: true, _count: { select: { products: true } } }
  });
  
  console.log('Empty-name categories:', emptyCats.length);
  for (const c of emptyCats) {
    console.log(`  id: ${c.id}, name: "${c.name}", products: ${c._count.products}`);
  }

  if (emptyCats.length > 0) {
    const ids = emptyCats.map(c => c.id);
    // Unlink products
    const updated = await prisma.product.updateMany({
      where: { categoryId: { in: ids } },
      data: { categoryId: null }
    });
    console.log(`Unlinked ${updated.count} products from empty categories`);
    
    // Delete
    const deleted = await prisma.category.deleteMany({
      where: { id: { in: ids } }
    });
    console.log(`Deleted ${deleted.count} empty-name categories`);
  }

  // Final list
  const remaining = await prisma.category.findMany({
    where: { parentId: null },
    select: { name: true, _count: { select: { products: true, children: true } } },
    orderBy: { name: 'asc' }
  });
  console.log(`\nFinal top-level categories (${remaining.length}):`);
  for (const c of remaining) {
    console.log(`  ${c.name} (${c._count.products} prod, ${c._count.children} children)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
