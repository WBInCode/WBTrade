// Delete sport-only categories from DB
// These categories exist ONLY in Hurtownia Sportowa and should not be on our store
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_4v2IehYGZzjF@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

const SPORT_ONLY_CATEGORIES = [
  '(Gry i zabawki) Pluszaki',
  'Akcesoria',
  'Buty',
  'Do skategoryzowania',
  'Dziecko',
  'Import z InMotion',
  'Import z Verto',
  'Moda',
  'Obuwie',
  'Odzież',
  'Sport',
];

async function main() {
  // First, find matching categories (top-level + children)
  const categories = await prisma.category.findMany({
    where: {
      OR: SPORT_ONLY_CATEGORIES.map(name => ({
        name: { equals: name, mode: 'insensitive' }
      }))
    },
    select: { id: true, name: true, slug: true, _count: { select: { products: true, children: true } } }
  });

  console.log(`Found ${categories.length} matching top-level categories:`);
  for (const c of categories) {
    console.log(`  - "${c.name}" (slug: ${c.slug}) | products: ${c._count.products}, children: ${c._count.children}`);
  }

  if (categories.length === 0) {
    console.log('No categories to delete.');
    return;
  }

  // Find all children (recursive) of these categories
  const parentIds = categories.map(c => c.id);
  
  async function getDescendantIds(ids) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: ids } },
      select: { id: true, name: true, _count: { select: { products: true } } }
    });
    if (children.length === 0) return [];
    const childIds = children.map(c => c.id);
    console.log(`  Found ${children.length} child categories: ${children.map(c => c.name).join(', ')}`);
    const grandchildren = await getDescendantIds(childIds);
    return [...childIds, ...grandchildren];
  }

  console.log('\nLooking for child categories...');
  const descendantIds = await getDescendantIds(parentIds);
  const allIds = [...parentIds, ...descendantIds];
  console.log(`\nTotal categories to delete: ${allIds.length} (${parentIds.length} top-level + ${descendantIds.length} children)`);

  // Check how many products reference these categories
  const productCount = await prisma.product.count({
    where: { categoryId: { in: allIds } }
  });
  console.log(`Products referencing these categories: ${productCount}`);

  // Unlink products first (set categoryId to null)
  if (productCount > 0) {
    console.log(`\nUnlinking ${productCount} products from sport categories...`);
    const updated = await prisma.product.updateMany({
      where: { categoryId: { in: allIds } },
      data: { categoryId: null }
    });
    console.log(`  Unlinked ${updated.count} products`);
  }

  // Delete children first, then parents
  if (descendantIds.length > 0) {
    const delChildren = await prisma.category.deleteMany({
      where: { id: { in: descendantIds } }
    });
    console.log(`Deleted ${delChildren.count} child categories`);
  }

  const delParents = await prisma.category.deleteMany({
    where: { id: { in: parentIds } }
  });
  console.log(`Deleted ${delParents.count} top-level categories`);

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
