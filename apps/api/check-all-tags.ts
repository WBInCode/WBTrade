import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({ 
    select: { tags: true } 
  });
  
  const allTags = new Map<string, number>();
  products.forEach(p => (p.tags as string[])?.forEach(t => allTags.set(t, (allTags.get(t) || 0) + 1)));
  
  const sorted = Array.from(allTags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50);
  console.log('Top 50 tags:');
  sorted.forEach(([t, c]) => console.log(c, '-', t));
  
  await prisma.$disconnect();
}

check();
