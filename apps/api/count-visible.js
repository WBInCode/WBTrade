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

const PACZKOMAT_TAGS = ['Paczkomaty i Kurier', 'paczkomaty i kurier'];

const PACKAGE_TAGS = [
  'produkt w paczce: 1',
  'produkt w paczce: 2',
  'produkt w paczce: 3',
  'produkt w paczce: 4',
  'produkt w paczce: 5',
];

async function countVisibleProducts() {
  console.log('=== TEST NOWEGO FILTRA SQL ===\n');

  // Nowy filtr z warunkiem "produkt w paczce" w SQL
  const count = await prisma.product.count({
    where: { 
      price: { gt: 0 },
      variants: {
        some: {
          inventory: {
            some: {
              quantity: { gt: 0 }
            }
          }
        }
      },
      AND: [
        { tags: { hasSome: DELIVERY_TAGS } },
        { category: { baselinkerCategoryId: { not: null } } },
        // Nowy filtr: jeśli ma "Paczkomaty i Kurier" to MUSI mieć też "produkt w paczce"
        {
          OR: [
            { NOT: { tags: { hasSome: PACZKOMAT_TAGS } } },
            { tags: { hasSome: PACKAGE_TAGS } },
          ]
        },
      ],
    }
  });

  console.log(`Produkty widoczne (z nowym filtrem SQL): ${count}`);
  
  // Porównanie ze starym filtrem (bez warunku package)
  const oldCount = await prisma.product.count({
    where: { 
      price: { gt: 0 },
      variants: {
        some: {
          inventory: {
            some: {
              quantity: { gt: 0 }
            }
          }
        }
      },
      tags: { hasSome: DELIVERY_TAGS },
      category: { baselinkerCategoryId: { not: null } },
    }
  });
  
  console.log(`Produkty (stary filtr bez package): ${oldCount}`);
  console.log(`Różnica (odfiltrowane): ${oldCount - count}`);

  await prisma.$disconnect();
}

countVisibleProducts().catch(e => {
  console.error('Błąd:', e);
  prisma.$disconnect();
});
