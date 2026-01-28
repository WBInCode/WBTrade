import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const withoutImages = await prisma.product.count({ 
    where: { images: { none: {} } } 
  });
  const total = await prisma.product.count();
  
  console.log('Products without images:', withoutImages, 'of', total, '(' + Math.round(withoutImages/total*100) + '%)');
  
  const examples = await prisma.product.findMany({ 
    where: { images: { none: {} } }, 
    select: { name: true, id: true }, 
    take: 5 
  });
  
  console.log('\nExamples:');
  examples.forEach(p => console.log('-', p.name));
  
  await prisma.$disconnect();
}

check();
