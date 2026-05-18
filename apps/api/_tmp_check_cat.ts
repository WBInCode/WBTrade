import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const prod = await prisma.product.findFirst({
    where: { sku: 'DOFIRMY-5900951310508' },
    include: { category: true },
  });

  if (prod) {
    console.log('Nazwa:', prod.name);
    console.log('Kategoria:', prod.category?.name);
    console.log('Category baselinkerCategoryId:', prod.category?.baselinkerCategoryId);
    console.log('Category parentId:', prod.category?.parentId);
    console.log('Tags:', prod.tags);
  } else {
    console.log('Nie znaleziono');
  }

  // Check "do zrobienia" category
  const cats = await prisma.category.findMany({
    where: { name: { contains: 'do zrobienia', mode: 'insensitive' } },
    select: { id: true, name: true, parentId: true, isActive: true, baselinkerCategoryId: true },
  });
  console.log('\nKategorie "do zrobienia":', JSON.stringify(cats, null, 2));

  // Count products in "do zrobienia"
  if (cats.length > 0) {
    const count = await prisma.product.count({
      where: { categoryId: { in: cats.map(c => c.id) }, price: { gt: 0 } },
    });
    console.log('Produktów w "do zrobienia":', count);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
