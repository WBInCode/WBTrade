import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({ 
    select: { tags: true }, 
    take: 500 
  });
  
  const allTags = new Set<string>();
  products.forEach(p => (p.tags as string[])?.forEach(t => allTags.add(t)));
  
  const warehouseTags = Array.from(allTags).filter(t => 
    t.toLowerCase().includes('hurtownia') || 
    t.toLowerCase().includes('ikonka') || 
    t.toLowerCase().includes('leker') || 
    t.toLowerCase().includes('btp') || 
    t.toLowerCase().includes('hp') ||
    t.toLowerCase().includes('forcetop')
  );
  
  console.log('Warehouse-related tags found:');
  warehouseTags.forEach(t => console.log('-', t));
  
  await prisma.$disconnect();
}

check();
