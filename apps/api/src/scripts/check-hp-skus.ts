import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const samples = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: null },
    select: { sku: true, baselinkerProductId: true, baselinkerCategoryPath: true },
    take: 10,
  });
  for (const s of samples) {
    console.log(`SKU: ${s.sku} | BL_ID: ${s.baselinkerProductId} | BL_PATH: "${s.baselinkerCategoryPath}"`);
  }
  
  // Also check what sku format is
  const withCat = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: { not: null } },
    select: { sku: true, baselinkerProductId: true, baselinkerCategoryPath: true },
    take: 5,
  });
  console.log('\n--- Z kategorią (dla porownania) ---');
  for (const s of withCat) {
    console.log(`SKU: ${s.sku} | BL_ID: ${s.baselinkerProductId} | BL_PATH: "${s.baselinkerCategoryPath}"`);
  }
}

main().finally(() => prisma.$disconnect());
