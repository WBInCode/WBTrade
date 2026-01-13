const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count({
    where: {
      baselinkerProductId: {
        startsWith: 'btp-'
      }
    }
  });

  console.log('📦 Produkty z hurtowni BTP:', count);
  
  await prisma.$disconnect();
}

main().catch(console.error);
