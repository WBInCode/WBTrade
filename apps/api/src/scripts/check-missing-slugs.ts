import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { slug: true, name: true, baselinkerCategoryId: true },
    orderBy: { slug: 'asc' },
  });
  
  console.log('SLUGI Z baselinkerCategoryId w DB:');
  const dbSlugs = new Set<string>();
  for (const c of cats) {
    dbSlugs.add(c.slug);
    console.log(`  ${c.slug} | BL:${c.baselinkerCategoryId} | ${c.name}`);
  }
  console.log(`\nŁącznie: ${cats.length}`);

  // Keyword mapping slugs
  const fs = await import('fs');
  const path = await import('path');
  const mappingPath = path.resolve(__dirname, '../../config/category-mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
  
  console.log('\n\nBRAKUJĄCE SLUGI (w keyword rules ale NIE w DB):');
  let missing = 0;
  for (const mainCat of mapping.mainCategories) {
    for (const sub of mainCat.subcategories) {
      if (!dbSlugs.has(sub.slug)) {
        missing++;
        console.log(`  ❌ ${sub.slug} (${mainCat.name} > ${sub.name})`);
      }
    }
  }
  console.log(`\nBrakujących: ${missing}`);

  await prisma.$disconnect();
}

main().catch(console.error);
