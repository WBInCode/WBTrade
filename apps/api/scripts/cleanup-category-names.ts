/**
 * Script to clean up category names
 */

import { prisma } from '../src/db';

async function cleanupCategoryNames() {
  console.log('🧹 Cleaning up category names...\n');
  
  // Fix "Zwierzęta /" -> "Zwierzęta"
  const zwierzeta = await prisma.category.updateMany({
    where: { name: 'Zwierzęta /' },
    data: { name: 'Zwierzęta' }
  });
  console.log(`Fixed "Zwierzęta /": ${zwierzeta.count}`);
  
  // Check for duplicates
  const categories = await prisma.category.findMany({
    where: { parentId: null, order: { gt: 0 } },
    orderBy: { name: 'asc' }
  });
  
  const nameCounts = new Map<string, number>();
  for (const cat of categories) {
    const count = nameCounts.get(cat.name) || 0;
    nameCounts.set(cat.name, count + 1);
  }
  
  console.log('\nDuplicates found:');
  for (const [name, count] of nameCounts) {
    if (count > 1) {
      console.log(`  "${name}": ${count} duplicates`);
    }
  }
  
  // Merge duplicates - keep the one with more products
  const pozostale = await prisma.category.findMany({
    where: { name: 'Pozostałe', parentId: null },
    include: { _count: { select: { products: true } } }
  });
  
  if (pozostale.length > 1) {
    console.log('\nMerging "Pozostałe" categories...');
    // Sort by product count descending
    pozostale.sort((a, b) => b._count.products - a._count.products);
    const keep = pozostale[0];
    const remove = pozostale.slice(1);
    
    for (const cat of remove) {
      // Move products to the main category
      await prisma.product.updateMany({
        where: { categoryId: cat.id },
        data: { categoryId: keep.id }
      });
      // Deactivate the duplicate
      await prisma.category.update({
        where: { id: cat.id },
        data: { isActive: false, order: 0 }
      });
      console.log(`  Merged ${cat.id} (${cat._count.products} products) into ${keep.id}`);
    }
  }
  
  await prisma.$disconnect();
  console.log('\n✅ Done!');
}

cleanupCategoryNames().catch(console.error);
