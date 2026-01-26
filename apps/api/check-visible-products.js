const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

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

const CATEGORY_TAGS = [
  'Elektronika',
  'Sport',
  'Zdrowie i uroda',
  'Dom i ogród',
  'Motoryzacja',
  'Dziecko',
  'Biurowe i papiernicze',
  'Gastronomiczne',
];

async function check() {
  console.log('=== SPRAWDZENIE PRODUKTÓW WIDOCZNYCH NA STRONIE ===\n');

  // Wszystkie produkty
  const total = await p.product.count();
  console.log(`Wszystkie produkty: ${total}`);

  // Z tagiem dostawy
  const withDelivery = await p.product.count({
    where: { tags: { hasSome: DELIVERY_TAGS } }
  });
  console.log(`Z tagiem dostawy: ${withDelivery}`);

  // Z tagiem kategorii
  const withCategory = await p.product.count({
    where: { tags: { hasSome: CATEGORY_TAGS } }
  });
  console.log(`Z tagiem kategorii: ${withCategory}`);

  // Ze stanem > 0
  const withStock = await p.product.count({
    where: {
      variants: {
        some: {
          inventory: {
            some: {
              quantity: { gt: 0 }
            }
          }
        }
      }
    }
  });
  console.log(`Ze stanem > 0: ${withStock}`);

  // WSZYSTKIE WARUNKI RAZEM (widoczne na stronie)
  const visible = await p.product.count({
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
        { tags: { hasSome: CATEGORY_TAGS } },
      ],
    }
  });
  console.log(`\n✅ WIDOCZNE NA STRONIE (wszystkie warunki): ${visible}`);

  // Rozbicie po kategoriach
  console.log('\n=== ROZBICIE PO KATEGORIACH ===');
  for (const cat of CATEGORY_TAGS) {
    const count = await p.product.count({
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
          { tags: { has: cat } },
        ],
      }
    });
    console.log(`  ${cat}: ${count}`);
  }

  await p.$disconnect();
}
check();
