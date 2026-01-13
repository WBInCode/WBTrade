const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ikonkaProducts = await prisma.product.findMany({
    where: {
      AND: [
        { baselinkerProductId: { not: { startsWith: 'leker-' } } },
        { baselinkerProductId: { not: { startsWith: 'btp-' } } },
        { baselinkerProductId: { not: { startsWith: 'hp-' } } }
      ]
    },
    select: { baselinkerProductId: true },
    take: 10
  });

  console.log('Przykładowe baselinkerProductId z Ikonka:');
  ikonkaProducts.forEach(p => console.log('  -', p.baselinkerProductId));

  await prisma.$disconnect();
}

main().catch(console.error);
