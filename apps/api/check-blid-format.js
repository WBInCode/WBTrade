require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('=== FORMAT BASELINKER ID W BAZIE ===\n');
  
  const btpBlId = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'btp' } } });
  const lekerBlId = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'leker' } } });
  const kxBlId = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'kx' } } });
  const hpBlId = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'hp' } } });
  
  // Sprawdź też czy są numeryczne ID
  const numericCount = await prisma.product.count({
    where: {
      baselinkerProductId: {
        not: { contains: '-' }
      }
    }
  });
  
  console.log('btp-*:', btpBlId);
  console.log('leker-*:', lekerBlId);
  console.log('kx-*:', kxBlId);
  console.log('hp-*:', hpBlId);
  console.log('');
  console.log('Bez myślnika (numeryczne?):', numericCount);
  console.log('RAZEM:', btpBlId + lekerBlId + kxBlId + hpBlId);
  
  // Przykłady
  console.log('\n=== PRZYKŁADY ===');
  
  const examples = await prisma.product.findMany({
    select: { sku: true, baselinkerProductId: true, tags: true },
    take: 10
  });
  
  examples.forEach(p => {
    console.log(`${p.sku} => blId: ${p.baselinkerProductId} | tags: ${JSON.stringify(p.tags)}`);
  });
  
  await prisma.$disconnect();
}

check();
