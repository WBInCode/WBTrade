const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCategoryOrders() {
  try {
    // Wszystkie kategorie
    const allCategories = await prisma.category.count({ where: { isActive: true } });
    
    // Kategorie główne (bez rodzica)
    const rootCategories = await prisma.category.count({ 
      where: { isActive: true, parentId: null } 
    });
    
    // Kategorie główne z order > 0
    const mainWithOrder = await prisma.category.count({ 
      where: { isActive: true, parentId: null, order: { gt: 0 } } 
    });
    
    // Kategorie główne z order = 0
    const mainWithoutOrder = await prisma.category.count({ 
      where: { isActive: true, parentId: null, order: 0 } 
    });
    
    // Zlicz produkty w kategoriach z order > 0
    const mainCategories = await prisma.category.findMany({
      where: { isActive: true, parentId: null, order: { gt: 0 } },
      select: { id: true, name: true, order: true }
    });
    
    const mainIds = mainCategories.map(c => c.id);
    
    // Pobierz wszystkie kategorie powiązane z głównymi (one same + dzieci)
    const visibleCategoryIds = await prisma.category.findMany({
      where: {
        isActive: true,
        OR: [
          { id: { in: mainIds } },
          { parentId: { in: mainIds } }
        ]
      },
      select: { id: true }
    });
    
    const visibleIds = visibleCategoryIds.map(c => c.id);
    
    // Zlicz produkty w widocznych kategoriach
    const productsInVisible = await prisma.product.count({
      where: {
        status: 'ACTIVE',
        categoryId: { in: visibleIds }
      }
    });
    
    // Zlicz produkty w ukrytych kategoriach
    const productsInHidden = await prisma.product.count({
      where: {
        status: 'ACTIVE',
        categoryId: { notIn: visibleIds },
        categoryId: { not: null }
      }
    });
    
    console.log('STATYSTYKI KATEGORII:');
    console.log('======================');
    console.log(`Wszystkie aktywne kategorie: ${allCategories}`);
    console.log(`Kategorie główne (bez rodzica): ${rootCategories}`);
    console.log(`Kategorie główne z order > 0: ${mainWithOrder}`);
    console.log(`Kategorie główne z order = 0: ${mainWithoutOrder}`);
    console.log('');
    console.log('PRODUKTY:');
    console.log('======================');
    console.log(`Produkty w widocznych kategoriach: ${productsInVisible}`);
    console.log(`Produkty w ukrytych kategoriach: ${productsInHidden}`);
    console.log(`Produkty bez kategorii: ${await prisma.product.count({ where: { status: 'ACTIVE', categoryId: null } })}`);
    console.log('');
    console.log('KATEGORIE GŁÓWNE Z ORDER > 0:');
    console.log('======================');
    mainCategories.forEach(cat => {
      console.log(`  ${cat.name} (order: ${cat.order})`);
    });
    
  } catch (error) {
    console.error('Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategoryOrders();
