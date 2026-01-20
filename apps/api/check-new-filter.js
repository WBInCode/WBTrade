require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DELIVERY_TAGS = [
  'Paczkomaty i Kurier',
  'paczkomaty i kurier',
  'Tylko kurier',
  'tylko kurier',
  'do 2 kg',
  'do 5 kg',
  'do 10 kg',
  'do 20 kg',
  'do 31,5 kg',
];

async function check() {
  const withDeliveryTag = await prisma.product.count({
    where: {
      price: { gt: 0 },
      tags: { hasSome: DELIVERY_TAGS }
    }
  });
  
  const total = await prisma.product.count({ where: { price: { gt: 0 } } });
  
  console.log('=== NOWE FILTROWANIE ===');
  console.log('Produkty z tagiem dostawy (WIDOCZNE):', withDeliveryTag);
  console.log('Wszystkie produkty:', total);
  console.log('Ukryte (bez tagu dostawy):', total - withDeliveryTag);
  console.log('');
  console.log('Procent widocznych:', Math.round(withDeliveryTag / total * 100) + '%');
  
  await prisma.$disconnect();
}
check();
