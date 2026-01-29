const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  console.log('Total products:', count);
  
  // Check some products with updated tags
  const withTags = await prisma.product.count({
    where: {
      tags: { isEmpty: false }
    }
  });
  console.log('Products with tags:', withTags);
  
  await prisma.$disconnect();
}

main();
