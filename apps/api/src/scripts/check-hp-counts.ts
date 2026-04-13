import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'hp-' } } });
  const noCategory = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: null } });
  const withCategory = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: { not: null } } });
  
  // Bez kategorii i BEZ baselinkerCategoryPath
  const noCatNoPath = await prisma.product.count({ 
    where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: null, 
      OR: [{ baselinkerCategoryPath: null }, { baselinkerCategoryPath: '' }] 
    } 
  });
  // Bez kategorii ALE z baselinkerCategoryPath
  const noCatWithPath = await prisma.product.count({ 
    where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: null, 
      baselinkerCategoryPath: { not: '' }, NOT: { baselinkerCategoryPath: null } 
    } 
  });

  const noCatNoBLCatId = 0;
  const noCatWithBLCatId = 0;

  // Przykłady produktów bez kategorii ale z baselinkerCategoryPath
  const examples = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: null, 
      baselinkerCategoryPath: { not: '' }, NOT: { baselinkerCategoryPath: null }
    },
    select: { sku: true, name: true, baselinkerCategoryPath: true },
    take: 5
  });

  console.log('=== Produkty HP w bazie ===');
  console.log('Łącznie:', total);
  console.log('Z kategorią:', withCategory);
  console.log('Bez kategorii:', noCategory);
  console.log('  - bez baselinkerCategoryPath:', noCatNoPath);
  console.log('  - z baselinkerCategoryPath:', noCatWithPath);
  console.log('  - bez baselinkerCategoryId:', noCatNoBLCatId);
  console.log('  - z baselinkerCategoryId:', noCatWithBLCatId);
  console.log('');
  console.log('Różnica Baselinker (5121) vs DB (' + noCategory + '):', 5121 - noCategory);
  console.log('');
  if (examples.length > 0) {
    console.log('Przykłady produktów bez kategorii ale z BL path:');
    for (const e of examples) {
      console.log(`  ${e.sku}: "${e.baselinkerCategoryPath}" - ${e.name?.substring(0, 60)}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
