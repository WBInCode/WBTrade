// Delete ALL categories with "/" in name (Hurtownia Sportowa format)
// These are sport categories that don't belong on our store
// All have 0 products based on our audit
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_4v2IehYGZzjF@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  // Safety check: any "/" categories with products?
  const withProducts = await prisma.category.findMany({
    where: { name: { contains: '/' }, products: { some: {} } },
    select: { id: true, name: true, _count: { select: { products: true } } }
  });
  
  if (withProducts.length > 0) {
    console.log('WARNING: Some "/" categories have products:');
    for (const c of withProducts) {
      console.log(`  "${c.name}" - ${c._count.products} products`);
    }
    // Unlink products first
    const ids = withProducts.map(c => c.id);
    const updated = await prisma.product.updateMany({
      where: { categoryId: { in: ids } },
      data: { categoryId: null }
    });
    console.log(`Unlinked ${updated.count} products`);
  }

  // Delete all "/" categories
  const result = await prisma.category.deleteMany({
    where: { name: { contains: '/' } }
  });
  console.log(`\nDeleted ${result.count} categories with "/" in name`);

  // Now check remaining top-level categories
  const remaining = await prisma.category.findMany({
    where: { parentId: null },
    select: { name: true, _count: { select: { products: true, children: true } } },
    orderBy: { name: 'asc' }
  });
  console.log(`\nRemaining top-level categories (${remaining.length}):`);
  for (const c of remaining) {
    console.log(`  ${c.name} (${c._count.products} prod, ${c._count.children} children)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
