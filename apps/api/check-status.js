const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all HP categories and their product counts
  const hpCategories = await prisma.category.findMany({
    where: {
      name: { startsWith: '[HP]' }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      parentId: true,
      _count: { select: { products: true } }
    },
    orderBy: { products: { _count: 'desc' } }
  });
  
  const totalHpProducts = hpCategories.reduce((sum, cat) => sum + cat._count.products, 0);
  console.log(`Total [HP] categories: ${hpCategories.length}`);
  console.log(`Total products in [HP] categories: ${totalHpProducts}`);
  
  // Get all BTP categories
  const btpCategories = await prisma.category.findMany({
    where: {
      name: { startsWith: '[BTP]' }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      _count: { select: { products: true } }
    },
    orderBy: { order: 'asc' }
  });
  
  const totalBtpProducts = btpCategories.reduce((sum, cat) => sum + cat._count.products, 0);
  console.log(`\nTotal [BTP] categories: ${btpCategories.length}`);
  console.log(`Total products in [BTP] categories: ${totalBtpProducts}`);
  
  // Check how many products have no category at all
  const noCategory = await prisma.product.count({ where: { categoryId: null } });
  console.log(`\nProducts without any category: ${noCategory}`);
}

main().finally(() => prisma.$disconnect());
