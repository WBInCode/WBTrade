const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const prodTotal = await p.product.count();
  const prodNull = await p.product.count({ where: { lowestPrice30Days: null } });
  const varTotal = await p.productVariant.count();
  const varNull = await p.productVariant.count({ where: { lowestPrice30Days: null } });
  
  console.log('=== WALIDACJA OMNIBUS BACKFILL ===');
  console.log('Produkty:', prodTotal, '| NULL:', prodNull);
  console.log('Warianty:', varTotal, '| NULL:', varNull);
  console.log(prodNull === 0 && varNull === 0 ? '✅ SUKCES - wszystko uzupełnione!' : '❌ Nadal są NULL');
  
  await p.$disconnect();
})();
