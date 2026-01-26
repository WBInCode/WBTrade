const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  // Policz ile produktów ma każdy prefix
  const counts = await Promise.all([
    p.product.count({ where: { baselinkerProductId: { startsWith: 'leker-' } } }),
    p.product.count({ where: { baselinkerProductId: { startsWith: 'btp-' } } }),
    p.product.count({ where: { baselinkerProductId: { startsWith: 'ikonka-' } } }),
    p.product.count({ where: { baselinkerProductId: { startsWith: 'hp-' } } }),
    p.product.count({ where: { NOT: { baselinkerProductId: { contains: '-' } } } }),
  ]);
  
  console.log('=== Formaty baselinkerProductId ===');
  console.log('leker-*:', counts[0]);
  console.log('btp-*:', counts[1]);
  console.log('ikonka-*:', counts[2]);
  console.log('hp-*:', counts[3]);
  console.log('bez prefiksu (tylko numer):', counts[4]);
  
  await p.$disconnect();
}
check();
