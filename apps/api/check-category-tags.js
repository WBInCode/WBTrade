const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  console.log('=== SPRAWDZENIE TAGÓW KATEGORII ===\n');

  // Ikonka - produkty z tagami kategorii
  console.log('--- IKONKA ---');
  const ikonkaWithCat = await p.product.findMany({
    where: { 
      AND: [
        { tags: { has: 'Ikonka' } },
        { OR: [
          { tags: { has: 'Dom i ogród' } },
          { tags: { has: 'Dziecko' } },
          { tags: { has: 'Motoryzacja' } },
          { tags: { has: 'Elektronika' } }
        ]}
      ]
    },
    take: 5,
    select: { name: true, tags: true }
  });
  console.log(`Produkty z tagami kategorii: ${ikonkaWithCat.length}`);
  ikonkaWithCat.slice(0, 3).forEach(p => console.log(`  ${p.name.slice(0, 50)}... -> ${p.tags.join(', ')}`));

  const ikonkaTotal = await p.product.count({ where: { tags: { has: 'Ikonka' } } });
  const ikonkaWithCatCount = await p.product.count({
    where: { 
      AND: [
        { tags: { has: 'Ikonka' } },
        { OR: [
          { tags: { has: 'Dom i ogród' } },
          { tags: { has: 'Dziecko' } },
          { tags: { has: 'Motoryzacja' } },
          { tags: { has: 'Elektronika' } },
          { tags: { has: 'Sport' } },
          { tags: { has: 'Gastronomiczne' } },
          { tags: { has: 'Zdrowie i uroda' } },
          { tags: { has: 'Biurowe i papiernicze' } }
        ]}
      ]
    }
  });
  console.log(`\nIkonka łącznie: ${ikonkaTotal}, z tagami kategorii: ${ikonkaWithCatCount}`);

  // Leker
  console.log('\n--- LEKER ---');
  const lekerWithCat = await p.product.findMany({
    where: { 
      AND: [
        { tags: { has: 'Leker' } },
        { OR: [
          { tags: { has: 'Dziecko' } },
          { tags: { has: 'Dom i ogród' } },
          { tags: { has: 'Sport' } }
        ]}
      ]
    },
    take: 5,
    select: { name: true, tags: true }
  });
  console.log(`Produkty z tagami kategorii: ${lekerWithCat.length}`);
  lekerWithCat.slice(0, 3).forEach(p => console.log(`  ${p.name.slice(0, 50)}... -> ${p.tags.join(', ')}`));

  const lekerTotal = await p.product.count({ where: { tags: { has: 'Leker' } } });
  const lekerWithCatCount = await p.product.count({
    where: { 
      AND: [
        { tags: { has: 'Leker' } },
        { OR: [
          { tags: { has: 'Dom i ogród' } },
          { tags: { has: 'Dziecko' } },
          { tags: { has: 'Motoryzacja' } },
          { tags: { has: 'Elektronika' } },
          { tags: { has: 'Sport' } },
          { tags: { has: 'Gastronomiczne' } },
          { tags: { has: 'Zdrowie i uroda' } },
          { tags: { has: 'Biurowe i papiernicze' } }
        ]}
      ]
    }
  });
  console.log(`\nLeker łącznie: ${lekerTotal}, z tagami kategorii: ${lekerWithCatCount}`);

  await p.$disconnect();
}
check();
