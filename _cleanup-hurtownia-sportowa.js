// Cleanup: remove "Hurtownia Sportowa" category from DB and unassign products
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Find the category
  const cats = await prisma.category.findMany({
    where: { name: { contains: 'Hurtownia', mode: 'insensitive' } },
    select: {
      id: true, name: true, slug: true, baselinkerCategoryId: true, parentId: true,
      _count: { select: { products: true, children: true } }
    }
  });

  console.log('Found categories with "Hurtownia" in name:');
  for (const c of cats) {
    console.log(`  - "${c.name}" (id: ${c.id}, blCatId: ${c.baselinkerCategoryId}, products: ${c._count.products}, children: ${c._count.children})`);
  }

  if (cats.length === 0) {
    console.log('No categories found. Nothing to do.');
    return;
  }

  const dryRun = !process.argv.includes('--go');
  if (dryRun) {
    console.log('\n=== DRY RUN === Add --go to execute changes');
    return;
  }

  for (const cat of cats) {
    // Only delete categories that are warehouse names (not shared)
    const isWarehouseName = cat.name.toLowerCase().includes('hurtownia');
    if (!isWarehouseName) continue;

    console.log(`\nProcessing category "${cat.name}" (${cat.id})...`);

    // 2. Unassign products from this category (set categoryId to null)
    const updated = await prisma.product.updateMany({
      where: { categoryId: cat.id },
      data: { categoryId: null }
    });
    console.log(`  Unassigned ${updated.count} products`);

    // 3. Move children to no parent
    if (cat._count.children > 0) {
      const movedChildren = await prisma.category.updateMany({
        where: { parentId: cat.id },
        data: { parentId: null }
      });
      console.log(`  Moved ${movedChildren.count} child categories to root`);
    }

    // 4. Delete the category
    await prisma.category.delete({ where: { id: cat.id } });
    console.log(`  Deleted category "${cat.name}"`);
  }

  console.log('\nDone!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
