require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Sprawdzam prefixy w bazie...\n');
  
  // HP
  const hpSample = await prisma.product.findFirst({ 
    where: { baselinkerProductId: { startsWith: 'hp-' } }, 
    select: { baselinkerProductId: true, sku: true } 
  });
  console.log('HP prefix:', hpSample);
  
  // BTP
  const btpSample = await prisma.product.findFirst({ 
    where: { baselinkerProductId: { startsWith: 'btp-' } }, 
    select: { baselinkerProductId: true, sku: true } 
  });
  console.log('BTP prefix:', btpSample);
  
  // Leker
  const lekerSample = await prisma.product.findFirst({ 
    where: { baselinkerProductId: { startsWith: 'leker-' } }, 
    select: { baselinkerProductId: true, sku: true } 
  });
  console.log('Leker prefix:', lekerSample);
  
  // Ikonka (bez prefixu - tylko cyfry)
  const ikonkaSample = await prisma.product.findFirst({ 
    where: { 
      baselinkerProductId: { not: { contains: '-' } }
    }, 
    select: { baselinkerProductId: true, sku: true } 
  });
  console.log('Ikonka (bez prefixu):', ikonkaSample);
  
  // Statystyki
  const counts = await Promise.all([
    prisma.product.count({ where: { baselinkerProductId: { startsWith: 'hp-' } } }),
    prisma.product.count({ where: { baselinkerProductId: { startsWith: 'btp-' } } }),
    prisma.product.count({ where: { baselinkerProductId: { startsWith: 'leker-' } } }),
    prisma.product.count({ where: { baselinkerProductId: { not: { contains: '-' } } } }),
  ]);
  
  console.log('\n--- Statystyki ---');
  console.log('HP (hp-):', counts[0]);
  console.log('BTP (btp-):', counts[1]);
  console.log('Leker (leker-):', counts[2]);
  console.log('Ikonka (bez prefixu):', counts[3]);
  
  await prisma.$disconnect();
}

main().catch(console.error);
