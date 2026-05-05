import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: {
      slug: true,
      name: true,
      baselinkerCategoryId: true,
      parent: { select: { name: true, parent: { select: { name: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  for (const c of cats) {
    let path = c.name;
    if (c.parent) {
      path = c.parent.name + ' > ' + c.name;
      if (c.parent.parent) path = c.parent.parent.name + ' > ' + path;
    }
    console.log(c.slug.padEnd(50) + ' | ' + path);
  }
  console.log('\nTotal:', cats.length);
  await prisma.$disconnect();
}

main();
