const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check HP product tags
  const hpProduct = await prisma.product.findFirst({
    where: { baselinkerProductId: { startsWith: 'hp-' } },
    select: { id: true, name: true, sku: true, baselinkerProductId: true, tags: true }
  });
  console.log('HP Product:', JSON.stringify(hpProduct, null, 2));

  // Check Leker product tags
  const lekerProduct = await prisma.product.findFirst({
    where: { baselinkerProductId: { startsWith: 'leker-' } },
    select: { id: true, name: true, sku: true, baselinkerProductId: true, tags: true }
  });
  console.log('\nLeker Product:', JSON.stringify(lekerProduct, null, 2));

  // Check BTP product tags
  const btpProduct = await prisma.product.findFirst({
    where: { baselinkerProductId: { startsWith: 'btp-' } },
    select: { id: true, name: true, sku: true, baselinkerProductId: true, tags: true }
  });
  console.log('\nBTP Product:', JSON.stringify(btpProduct, null, 2));

  await prisma.$disconnect();
}

check();
