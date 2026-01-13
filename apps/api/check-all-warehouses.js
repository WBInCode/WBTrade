const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📊 Produkty z wszystkich hurtowni:\n');

  const ikonka = await prisma.product.count({
    where: {
      OR: [
        { baselinkerProductId: { not: { contains: '-' } } },
        { baselinkerProductId: { startsWith: 'ikonka-' } }
      ]
    }
  });

  const leker = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'leker-' }
    }
  });

  const btp = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'btp-' }
    }
  });

  const hp = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'hp-' }
    }
  });

  const total = await prisma.product.count();

  console.log(`🏢 Ikonka: ${ikonka.toLocaleString('pl-PL')}`);
  console.log(`🏢 Leker:  ${leker.toLocaleString('pl-PL')}`);
  console.log(`🏢 BTP:    ${btp.toLocaleString('pl-PL')}`);
  console.log(`🏢 HP:     ${hp.toLocaleString('pl-PL')}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📦 RAZEM:  ${total.toLocaleString('pl-PL')}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
