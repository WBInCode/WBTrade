/**
 * Naprawa kategorii "Zdrowie i Uroda" - przypisanie podkategorii do głównej
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixZdrowieUroda() {
  console.log('=== NAPRAWA KATEGORII "Zdrowie i Uroda" ===\n');

  // Znajdź kategorię główną "Zdrowie i uroda"
  const mainCategory = await prisma.category.findFirst({
    where: {
      baselinkerCategoryId: '2806643', // ID kategorii "Zdrowie i uroda"
    },
  });

  if (!mainCategory) {
    console.log('❌ Nie znaleziono kategorii głównej "Zdrowie i uroda"');
    return;
  }

  console.log(`✅ Znaleziono kategorię główną: "${mainCategory.name}" (ID: ${mainCategory.id})`);

  // Znajdź wszystkie podkategorie bez rodzica, które powinny być pod "Zdrowie i Uroda"
  const orphanSubcategories = await prisma.category.findMany({
    where: {
      parentId: null,
      baselinkerCategoryPath: {
        startsWith: 'Zdrowie i Uroda|',
      },
    },
  });

  console.log(`\nZnaleziono ${orphanSubcategories.length} podkategorii bez rodzica:\n`);

  for (const sub of orphanSubcategories) {
    console.log(`  - "${sub.name}" (path: ${sub.baselinkerCategoryPath})`);
    
    // Przypisz do kategorii głównej
    await prisma.category.update({
      where: { id: sub.id },
      data: { parentId: mainCategory.id },
    });
    
    console.log(`    ✅ Przypisano do "${mainCategory.name}"`);
  }

  console.log('\n=== PODSUMOWANIE ===');
  
  // Sprawdź wynik
  const fixedCategories = await prisma.category.findMany({
    where: { parentId: mainCategory.id },
    orderBy: { name: 'asc' },
  });

  console.log(`\nKategoria "${mainCategory.name}" ma teraz ${fixedCategories.length} podkategorii:`);
  for (const cat of fixedCategories) {
    console.log(`  └─ ${cat.name}`);
  }

  await prisma.$disconnect();
}

fixZdrowieUroda().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
