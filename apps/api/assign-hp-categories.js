/**
 * Przypisanie kategorii dla 44 produktów HP po synchronizacji tagów
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRODUCT_IDS = [
  'hp-212579691', 'hp-212581260', 'hp-212581274', 'hp-212582362', 'hp-212583318', 'hp-212583319',
  'hp-212585754', 'hp-212589648', 'hp-212596438', 'hp-212596443', 'hp-212596449', 'hp-212596455',
  'hp-212596460', 'hp-212596467', 'hp-212596968', 'hp-212596973', 'hp-212596980', 'hp-212596985',
  'hp-212596992', 'hp-212596999', 'hp-212597004', 'hp-212597011', 'hp-212599191', 'hp-212599493',
  'hp-212623518', 'hp-212623695', 'hp-212624069', 'hp-212624132', 'hp-212624154', 'hp-212624211',
  'hp-212624261', 'hp-212624287', 'hp-212624305', 'hp-212624322', 'hp-212624408', 'hp-212624446',
  'hp-212624449', 'hp-212624558', 'hp-212624840', 'hp-212624847', 'hp-212625103', 'hp-212625107',
  'hp-212631492', 'hp-212631497'
];

async function main() {
  console.log('=== PRZYPISANIE KATEGORII DLA PRODUKTÓW HP ===\n');
  
  // Znajdź kategorię oświetlenie
  const oswietlenie = await prisma.category.findFirst({
    where: { slug: 'oswietlenie' }
  });
  
  if (!oswietlenie) {
    console.log('❌ Brak kategorii "oswietlenie"!');
    
    // Sprawdź dostępne kategorie
    const cats = await prisma.category.findMany({ select: { slug: true, name: true } });
    console.log('\nDostępne kategorie:', cats.map(c => c.slug).join(', '));
    return;
  }
  
  console.log(`✅ Kategoria: ${oswietlenie.name} (ID: ${oswietlenie.id})\n`);
  
  // Aktualizuj produkty
  const result = await prisma.product.updateMany({
    where: { baselinkerProductId: { in: PRODUCT_IDS } },
    data: { categoryId: oswietlenie.id }
  });
  
  console.log(`✅ Zaktualizowano ${result.count} produktów`);
  
  // Pokaż przykłady
  const updated = await prisma.product.findMany({
    where: { baselinkerProductId: { in: PRODUCT_IDS.slice(0, 5) } },
    select: { name: true, baselinkerProductId: true, category: { select: { name: true } } }
  });
  
  console.log('\nPrzykłady:');
  for (const p of updated) {
    console.log(`  - ${p.name.substring(0, 50)}... → ${p.category?.name}`);
  }
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Błąd:', err);
  await prisma.$disconnect();
});
