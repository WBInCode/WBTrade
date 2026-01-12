/**
 * Script to fix categories for frontend display:
 * 1. Remove [BTP], [Ikonka] prefixes from category names
 * 2. Set proper order values for main categories
 * 3. Clean up duplicate/old categories
 */

import { prisma } from '../src/db';

async function fixCategories() {
  console.log('🔧 Fixing categories...\n');
  
  // Get all categories
  const allCategories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } }
    }
  });
  
  console.log(`Total categories: ${allCategories.length}\n`);
  
  // Categories with prefixes to fix
  const prefixPattern = /^\[(BTP|Ikonka|IKONKA)\]\s*/i;
  const categoriesToFix = allCategories.filter(c => prefixPattern.test(c.name));
  
  console.log(`Categories with prefixes to fix: ${categoriesToFix.length}`);
  
  // Fix prefix in names
  let fixedCount = 0;
  for (const cat of categoriesToFix) {
    const newName = cat.name.replace(prefixPattern, '');
    console.log(`  "${cat.name}" -> "${newName}"`);
    
    await prisma.category.update({
      where: { id: cat.id },
      data: { name: newName }
    });
    fixedCount++;
  }
  
  console.log(`\n✅ Fixed ${fixedCount} category names\n`);
  
  // Set order for main categories that have products
  const mainCategoriesWithProducts = await prisma.category.findMany({
    where: { 
      parentId: null,
      isActive: true
    },
    include: {
      _count: { select: { products: true } }
    },
    orderBy: { name: 'asc' }
  });
  
  console.log('📊 Setting order for main categories with products:');
  
  // Define preferred category order (most important first)
  const preferredOrder = [
    'Elektronika',
    'Telefony i akcesoria',
    'Komputery',
    'AGD',
    'Dom i ogród',
    'Moda',
    'Dziecko',
    'Zabawki',
    'Sport',
    'Motoryzacja',
    'Uroda',
    'Zdrowie',
    'Supermarket',
  ];
  
  let orderValue = 1;
  const updatedCategories: string[] = [];
  
  // First, set order for preferred categories
  for (const prefName of preferredOrder) {
    const cat = mainCategoriesWithProducts.find(c => 
      c.name.toLowerCase() === prefName.toLowerCase() ||
      c.name.toLowerCase().includes(prefName.toLowerCase())
    );
    if (cat && cat._count.products > 0) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { order: orderValue }
      });
      console.log(`  ${orderValue}. ${cat.name} (${cat._count.products} products)`);
      updatedCategories.push(cat.id);
      orderValue++;
    }
  }
  
  // Then, set order for remaining categories with products
  for (const cat of mainCategoriesWithProducts) {
    if (!updatedCategories.includes(cat.id) && cat._count.products > 0) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { order: orderValue }
      });
      console.log(`  ${orderValue}. ${cat.name} (${cat._count.products} products)`);
      orderValue++;
    }
  }
  
  // Set order = 0 for categories without products (they won't show in main menu)
  const emptyCategories = mainCategoriesWithProducts.filter(c => c._count.products === 0);
  console.log(`\n🗑️ Categories without products (order = 0): ${emptyCategories.length}`);
  for (const cat of emptyCategories) {
    await prisma.category.update({
      where: { id: cat.id },
      data: { order: 0 }
    });
  }
  
  console.log('\n✅ Category order updated!');
  
  // Show final state
  console.log('\n📋 Final main categories for frontend:');
  const finalCategories = await prisma.category.findMany({
    where: { 
      parentId: null,
      isActive: true,
      order: { gt: 0 }
    },
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { products: true } }
    }
  });
  
  for (const cat of finalCategories) {
    console.log(`  ${cat.order}. ${cat.name} (${cat._count.products} products)`);
  }
  
  await prisma.$disconnect();
  console.log('\n✅ Done!');
}

fixCategories().catch(console.error);
