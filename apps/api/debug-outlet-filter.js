const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const outletCat = await prisma.category.findUnique({ 
    where: { slug: 'outlet' },
    select: { id: true, name: true, baselinkerCategoryId: true, baselinkerCategoryPath: true }
  });
  console.log('Outlet category:', JSON.stringify(outletCat, null, 2));

  // Check how many outlet products have stock > 0
  const withStock = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'outlet-' },
      variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } }
    }
  });
  console.log('With stock > 0:', withStock);

  // Check delivery tags
  const withDelivery = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'outlet-' },
      tags: { hasSome: ['Paczkomaty i Kurier', 'Tylko kurier', 'do 2 kg', 'do 5 kg', 'do 10 kg', 'do 20 kg', 'do 30 kg', 'powyżej 30 kg'] }
    }
  });
  console.log('With delivery tag:', withDelivery);

  // Check category with baselinkerCategoryId
  const catWithBlId = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'outlet-' },
      category: { baselinkerCategoryId: { not: null } }
    }
  });
  console.log('With category.baselinkerCategoryId:', catWithBlId);

  // Show sample product
  const sample = await prisma.product.findFirst({
    where: { baselinkerProductId: { startsWith: 'outlet-' } },
    select: { 
      name: true, tags: true, price: true, compareAtPrice: true, status: true,
      category: { select: { name: true, slug: true, baselinkerCategoryId: true } }
    }
  });
  console.log('Sample:', JSON.stringify(sample, null, 2));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
