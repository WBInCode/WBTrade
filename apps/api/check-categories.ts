import { prisma } from './src/db';

async function checkCategories() {
  const cats = await prisma.category.findMany({ 
    where: { parentId: null }, 
    take: 30, 
    orderBy: { order: 'asc' } 
  });
  console.log('Root Categories:', JSON.stringify(cats, null, 2));
  
  // Count all categories
  const count = await prisma.category.count();
  console.log('\nTotal categories:', count);
  
  // Get a sample with children
  const withChildren = await prisma.category.findMany({
    take: 5,
    include: {
      children: { take: 5 }
    }
  });
  console.log('\nSample with children:', JSON.stringify(withChildren, null, 2));
  
  await prisma.$disconnect();
}

checkCategories().catch(console.error);
