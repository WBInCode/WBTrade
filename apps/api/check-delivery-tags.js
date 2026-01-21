require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const DELIVERY_TAGS = [
    'Paczkomaty i Kurier', 
    'Tylko kurier', 
    'do 2 kg', 'do 3 kg', 'do 5 kg', 'do 10 kg', 
    'do 15 kg', 'do 20 kg', 'do 25 kg', 'do 30 kg'
  ];
  
  const withDelivery = await prisma.product.count({
    where: { tags: { hasSome: DELIVERY_TAGS } }
  });
  
  const total = await prisma.product.count();
  
  console.log('=== STATYSTYKI TAGÓW DOSTAWY ===\n');
  console.log('Z tagami dostawy (widoczne):', withDelivery);
  console.log('Bez tagów dostawy (ukryte):', total - withDelivery);
  console.log('Razem:', total);
  console.log('');
  console.log('% widocznych:', ((withDelivery / total) * 100).toFixed(1) + '%');
  
  // Rozbicie per hurtownia
  console.log('\n=== PER HURTOWNIA ===');
  
  const ikonkaWith = await prisma.product.count({
    where: { 
      sku: { startsWith: 'KX' },
      tags: { hasSome: DELIVERY_TAGS }
    }
  });
  const ikonkaTotal = await prisma.product.count({ where: { sku: { startsWith: 'KX' } } });
  
  const btpWith = await prisma.product.count({
    where: { 
      baselinkerProductId: { startsWith: 'btp' },
      tags: { hasSome: DELIVERY_TAGS }
    }
  });
  const btpTotal = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'btp' } } });
  
  const hpWith = await prisma.product.count({
    where: { 
      baselinkerProductId: { startsWith: 'hp' },
      tags: { hasSome: DELIVERY_TAGS }
    }
  });
  const hpTotal = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'hp' } } });
  
  const lekerWith = await prisma.product.count({
    where: { 
      baselinkerProductId: { startsWith: 'leker' },
      tags: { hasSome: DELIVERY_TAGS }
    }
  });
  const lekerTotal = await prisma.product.count({ where: { baselinkerProductId: { startsWith: 'leker' } } });
  
  console.log(`Ikonka: ${ikonkaWith}/${ikonkaTotal} z tagami dostawy`);
  console.log(`BTP: ${btpWith}/${btpTotal} z tagami dostawy`);
  console.log(`HP: ${hpWith}/${hpTotal} z tagami dostawy`);
  console.log(`Leker: ${lekerWith}/${lekerTotal} z tagami dostawy`);
  
  await prisma.$disconnect();
}

check();
