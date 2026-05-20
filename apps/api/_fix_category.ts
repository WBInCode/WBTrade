import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const cats = await p.category.findMany({
    where: { name: { contains: 'zrobienia', mode: 'insensitive' } },
  });
  console.log('Found categories:', cats.map(c => ({ id: c.id, name: c.name, isActive: c.isActive })));

  const result = await p.category.updateMany({
    where: { name: { contains: 'zrobienia', mode: 'insensitive' } },
    data: { isActive: false },
  });
  console.log('Updated:', result.count, 'categories to isActive=false');
}

main().finally(() => p.$disconnect());
