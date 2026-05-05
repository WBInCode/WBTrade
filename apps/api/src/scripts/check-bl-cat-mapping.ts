/**
 * Sprawdza mapowanie kategorii DB → Baselinker category_id
 */
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true, baselinkerCategoryId: true, baselinkerCategoryPath: true, parentId: true },
  });

  const withBLId = categories.filter(c => c.baselinkerCategoryId);
  const withoutBLId = categories.filter(c => !c.baselinkerCategoryId);

  console.log(`Kategorie DB: ${categories.length}`);
  console.log(`Z baselinkerCategoryId: ${withBLId.length}`);
  console.log(`Bez baselinkerCategoryId: ${withoutBLId.length}`);
  console.log('');

  if (withBLId.length > 0) {
    console.log('Mapowania slug → BL category_id:');
    for (const c of withBLId.sort((a, b) => a.slug.localeCompare(b.slug))) {
      const parent = c.parentId ? categories.find(p => p.id === c.parentId) : null;
      const fullName = parent ? `${parent.name} > ${c.name}` : c.name;
      console.log(`  ${c.slug} → BL ID: ${c.baselinkerCategoryId} | "${fullName}" | BL path: ${c.baselinkerCategoryPath || '-'}`);
    }
  }

  if (withoutBLId.length > 0) {
    console.log('\nBez mapowania BL:');
    for (const c of withoutBLId.sort((a, b) => a.slug.localeCompare(b.slug))) {
      const parent = c.parentId ? categories.find(p => p.id === c.parentId) : null;
      const fullName = parent ? `${parent.name} > ${c.name}` : c.name;
      console.log(`  ${c.slug} | "${fullName}"`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
