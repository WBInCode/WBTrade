const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBlIds() {
  try {
    // Sprawdź jak wyglądają baselinkerCategoryId
    const cats = await prisma.category.findMany({
      where: { baselinkerCategoryId: { not: null } },
      take: 15,
      select: {
        id: true,
        name: true,
        baselinkerCategoryId: true,
        slug: true
      }
    });
    
    console.log('=== PRZYKŁADOWE KATEGORIE Z BASELINKER ID ===\n');
    for (const c of cats) {
      console.log(`BL ID: "${c.baselinkerCategoryId}"`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Slug: ${c.slug}`);
      console.log('');
    }
    
    // Sprawdź czy są kategorie z czystymi numerycznymi ID
    const numericIdCats = await prisma.category.findMany({
      where: {
        baselinkerCategoryId: {
          not: null
        }
      },
      select: { baselinkerCategoryId: true }
    });
    
    const withPrefix = numericIdCats.filter(c => c.baselinkerCategoryId && c.baselinkerCategoryId.includes('-'));
    const withoutPrefix = numericIdCats.filter(c => c.baselinkerCategoryId && !c.baselinkerCategoryId.includes('-'));
    
    console.log('=== STATYSTYKI FORMATÓW ID ===');
    console.log(`Z prefiksem (np. btp-123): ${withPrefix.length}`);
    console.log(`Bez prefiksu (tylko liczba): ${withoutPrefix.length}`);
    
    if (withoutPrefix.length > 0) {
      console.log('\nPrzykłady bez prefiksu:');
      withoutPrefix.slice(0, 5).forEach(c => console.log(`  "${c.baselinkerCategoryId}"`));
    }
    
  } catch (error) {
    console.error('Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlIds();
