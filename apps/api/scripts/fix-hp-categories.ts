import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing [HP] categories...\n');

  // 1. Find all HP categories
  const hpCategories = await prisma.category.findMany({
    where: { name: { startsWith: '[HP]' } },
    include: {
      _count: {
        select: { products: true }
      }
    }
  });

  console.log(`Found ${hpCategories.length} [HP] categories\n`);

  // 2. Get current max order from existing categories
  const maxOrderResult = await prisma.category.aggregate({
    _max: { order: true }
  });
  let nextOrder = (maxOrderResult._max.order || 0) + 1;

  // 3. Fix each HP category
  let fixed = 0;
  for (const cat of hpCategories) {
    const newName = cat.name.replace(/^\[HP\]\s*/, '');
    const hasProducts = cat._count.products > 0;
    
    await prisma.category.update({
      where: { id: cat.id },
      data: {
        name: newName,
        order: hasProducts ? nextOrder++ : 0  // Only show categories with products
      }
    });

    if (hasProducts) {
      console.log(`✓ Fixed: "${cat.name}" -> "${newName}" (${cat._count.products} products, order: ${nextOrder - 1})`);
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} [HP] categories with products`);

  // 4. Update productCount for main categories
  console.log('\n📊 Updating product counts...');
  
  const allCategories = await prisma.category.findMany({
    where: { order: { gt: 0 } },
    include: {
      _count: { select: { products: true } }
    }
  });

  for (const cat of allCategories) {
    // Product count is computed dynamically, no need to store
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
