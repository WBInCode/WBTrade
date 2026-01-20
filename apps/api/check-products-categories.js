const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductsCategories() {
  try {
    // Sprawdź ile produktów jest w "Inne"
    const inneCat = await prisma.category.findUnique({ 
      where: { slug: 'inne' }
    });
    
    const inneCount = await prisma.product.count({ 
      where: { categoryId: inneCat?.id }
    });
    
    console.log('=== ANALIZA PRODUKTÓW I KATEGORII ===\n');
    console.log(`Produkty w kategorii "Inne": ${inneCount}\n`);
    
    // Przykładowe produkty z "Inne"
    const sampleProducts = await prisma.product.findMany({
      where: { categoryId: inneCat?.id },
      take: 10,
      select: {
        id: true,
        name: true,
        baselinkerProductId: true,
        categoryId: true
      }
    });
    
    console.log('Przykładowe produkty z "Inne":');
    for (const p of sampleProducts) {
      console.log(`  - ${p.name.substring(0, 60)}...`);
      console.log(`    BL ID: ${p.baselinkerProductId}`);
    }
    
    // Sprawdź kategorie z Baselinker które mają przypisane produkty
    const categoriesWithBlId = await prisma.category.findMany({
      where: { 
        baselinkerCategoryId: { not: null },
        _count: { products: { gt: 0 } }
      },
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { _count: { products: 'desc' } },
      take: 20
    });
    
    console.log('\n=== KATEGORIE Z BASELINKER ID KTÓRE MAJĄ PRODUKTY ===');
    console.log(`Liczba: ${categoriesWithBlId.length}\n`);
    
    for (const cat of categoriesWithBlId) {
      console.log(`  ${cat.name}: ${cat._count.products} produktów`);
      console.log(`    BL ID: ${cat.baselinkerCategoryId}`);
    }
    
    // Sprawdź strukturę kategorii - ile jest z parent_id
    const stats = await prisma.category.groupBy({
      by: ['parentId'],
      _count: true
    });
    
    const withParent = stats.filter(s => s.parentId !== null).reduce((sum, s) => sum + s._count, 0);
    const withoutParent = stats.filter(s => s.parentId === null).reduce((sum, s) => sum + s._count, 0);
    
    console.log('\n=== STRUKTURA KATEGORII ===');
    console.log(`Kategorie główne (bez parent): ${withoutParent}`);
    console.log(`Podkategorie (z parent): ${withParent}`);
    
    // Sprawdź top kategorie z produktami (bez "Inne")
    const topCategories = await prisma.category.findMany({
      where: {
        slug: { not: 'inne' }
      },
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { _count: { products: 'desc' } },
      take: 20
    });
    
    console.log('\n=== TOP 20 KATEGORII (bez "Inne") ===\n');
    for (const cat of topCategories) {
      if (cat._count.products > 0) {
        console.log(`  ${cat.name}: ${cat._count.products} produktów`);
      }
    }
    
  } catch (error) {
    console.error('Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductsCategories();
