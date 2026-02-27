/**
 * Dodaje brakujące kategorie BTP z Basielinkera do bazy danych
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Znajdź parent kategorie
  const elektronika = await prisma.category.findFirst({ where: { baselinkerCategoryId: '2804021' } });
  const motoryzacja = await prisma.category.findFirst({ where: { baselinkerCategoryId: '2810027' } });
  const ogrod = await prisma.category.findFirst({ where: { baselinkerCategoryId: '2810013' } });

  console.log('Parents:');
  console.log('  Elektronika i GSM:', elektronika?.id, elektronika?.name);
  console.log('  Motoryzacja:', motoryzacja?.id, motoryzacja?.name);
  console.log('  Ogród i Gospodarstwo:', ogrod?.id, ogrod?.name);
  console.log('');

  const toCreate = [
    {
      name: 'Smartwatche',
      slug: 'smartwatche-bl-2827269',
      baselinkerCategoryId: '2827269',
      baselinkerCategoryPath: 'Elektronika i GSM|Smartwatche',
      parentId: elektronika?.id,
      isActive: true,
    },
    {
      name: 'Wyposażenie warsztatu',
      slug: 'wyposazenie-warsztatu-bl-2845103',
      baselinkerCategoryId: '2845103',
      baselinkerCategoryPath: 'Motoryzacja|Wyposażenie warsztatu',
      parentId: motoryzacja?.id,
      isActive: true,
    },
    {
      name: 'Pojemniki i zbiorniki gospodarcze',
      slug: 'pojemniki-i-zbiorniki-gospodarcze-bl-2966384',
      baselinkerCategoryId: '2966384',
      baselinkerCategoryPath: 'Ogród i Gospodarstwo|Pojemniki i zbiorniki gospodarcze',
      parentId: ogrod?.id,
      isActive: true,
    },
  ];

  for (const cat of toCreate) {
    const existing = await prisma.category.findFirst({ where: { baselinkerCategoryId: cat.baselinkerCategoryId } });
    if (existing) {
      console.log(`⏭️  Już istnieje: ${cat.name} (blId: ${cat.baselinkerCategoryId}, dbId: ${existing.id})`);
      continue;
    }
    const created = await prisma.category.create({ data: cat });
    console.log(`✅ Utworzono: ${created.name} (blId: ${cat.baselinkerCategoryId}, dbId: ${created.id})`);
  }

  const total = await prisma.category.count({ where: { baselinkerCategoryId: { not: null } } });
  console.log(`\nŁącznie kategorii z baselinkerCategoryId w bazie: ${total}`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
