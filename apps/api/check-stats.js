const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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

  const total = await prisma.product.count({ 
    where: { status: 'ACTIVE', price: { gt: 0 } } 
  });
  
  const withDeliveryTags = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      price: { gt: 0 },
      tags: { hasSome: DELIVERY_TAGS }
    }
  });
  
  const withStock = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      price: { gt: 0 },
      variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } }
    }
  });
  
  const withBothTagsAndStock = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      price: { gt: 0 },
      tags: { hasSome: DELIVERY_TAGS },
      variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } }
    }
  });
  
  const kablePrzewodsProducts = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      price: { gt: 0 },
      category: {
        slug: { contains: 'kable-przewody' }
      }
    }
  });
  
  const kablePrzewodsWithTagsAndStock = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      price: { gt: 0 },
      tags: { hasSome: DELIVERY_TAGS },
      variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } },
      category: {
        slug: { contains: 'kable-przewody' }
      }
    }
  });
  
  console.log('=== Statystyki produktów ===');
  console.log('Total aktywnych z ceną > 0:', total);
  console.log('Z tagami dostawy:', withDeliveryTags);
  console.log('Ze stanem > 0:', withStock);
  console.log('Z tagami dostawy I stanem > 0:', withBothTagsAndStock);
  console.log('');
  console.log('=== Kategoria Kable przewody ===');
  console.log('Wszystkie w kategorii:', kablePrzewodsProducts);
  console.log('Z tagami i stanem:', kablePrzewodsWithTagsAndStock);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
