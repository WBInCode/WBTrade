import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  // Get all unique baselinkerCategoryPath for HP products without category
  const products = await prisma.product.findMany({
    where: {
      baselinkerProductId: { startsWith: 'hp-' },
      categoryId: null,
      baselinkerCategoryPath: { not: '' },
    },
    select: { baselinkerCategoryPath: true },
  });
  
  const paths = new Map<string, number>();
  for (const p of products) {
    const raw = (p.baselinkerCategoryPath || '').replace(/"/g, '').trim();
    if (raw) {
      paths.set(raw, (paths.get(raw) || 0) + 1);
    }
  }
  
  console.log(`Unique BL paths (not in CSV): ${paths.size}`);
  for (const [p, count] of [...paths.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  [${count}] ${p}`);
  }
}

main().finally(() => prisma.$disconnect());
