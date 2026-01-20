const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeCategories() {
  try {
    // Pobierz wszystkie kategorie z liczbą produktów
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true }
        },
        parent: {
          select: { name: true, slug: true }
        }
      },
      orderBy: [
        { order: 'desc' },
        { name: 'asc' }
      ]
    });

    // Grupuj według tego czy mają rodzica
    const rootCategories = allCategories.filter(c => !c.parentId);
    const childCategories = allCategories.filter(c => c.parentId);

    console.log('=== ANALIZA KATEGORII ===\n');
    console.log(`Kategorie główne (bez rodzica): ${rootCategories.length}`);
    console.log(`Kategorie potomne (z rodzicem): ${childCategories.length}`);
    console.log('');

    // Pokaż główne kategorie z największą liczbą produktów
    const topRootCategories = rootCategories
      .sort((a, b) => b._count.products - a._count.products)
      .slice(0, 30);

    console.log('=== TOP 30 KATEGORII GŁÓWNYCH (z największą liczbą produktów) ===\n');
    topRootCategories.forEach((cat, idx) => {
      const prefix = cat.order > 0 ? '✓' : '✗';
      console.log(`${idx + 1}. ${prefix} ${cat.name}`);
      console.log(`   Produktów: ${cat._count.products}, Order: ${cat.order}, Slug: ${cat.slug}`);
      if (cat.baselinkerCategoryId) {
        console.log(`   BaseLinker ID: ${cat.baselinkerCategoryId}`);
      }
      console.log('');
    });

    // Sprawdź kategorie z order = 0 ale z dużą liczbą produktów
    const hiddenWithProducts = rootCategories
      .filter(c => c.order === 0 && c._count.products > 10)
      .sort((a, b) => b._count.products - a._count.products);

    console.log(`\n=== UKRYTE KATEGORIE Z >10 PRODUKTAMI (order=0) ===`);
    console.log(`Liczba: ${hiddenWithProducts.length}\n`);
    hiddenWithProducts.slice(0, 20).forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name} - ${cat._count.products} produktów`);
    });

    // Sprawdź nazwy kategorii - czy zawierają prefiksy [BTP], [HP] itp
    const categoriesByPrefix = {
      BTP: rootCategories.filter(c => c.name.includes('[BTP]')),
      HP: rootCategories.filter(c => c.name.includes('[HP]')),
      Other: rootCategories.filter(c => !c.name.includes('[BTP]') && !c.name.includes('[HP]'))
    };

    console.log('\n=== KATEGORIE WEDŁUG PREFIKSU ===');
    console.log(`[BTP]: ${categoriesByPrefix.BTP.length} kategorii`);
    console.log(`[HP]: ${categoriesByPrefix.HP.length} kategorii`);
    console.log(`Bez prefiksu: ${categoriesByPrefix.Other.length} kategorii`);

  } catch (error) {
    console.error('Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCategories();
