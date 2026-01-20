require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Sprawdź ile produktów ma jakie tagi hurtowni
  const stats = await prisma.product.groupBy({
    by: ['status'],
    _count: true
  });
  
  console.log('=== PRODUKTY WG STATUSU ===');
  console.log(stats);
  
  // Policz produkty z tagami hurtowni
  const ikonka = await prisma.product.count({ where: { tags: { has: 'Ikonka' } } });
  const btp = await prisma.product.count({ where: { tags: { has: 'BTP' } } });
  const hp = await prisma.product.count({ where: { tags: { has: 'HP' } } });
  const leker = await prisma.product.count({ where: { tags: { has: 'Leker' } } });
  
  console.log('');
  console.log('=== PRODUKTY WG TAGU HURTOWNI ===');
  console.log('Ikonka:', ikonka);
  console.log('BTP:', btp);
  console.log('HP:', hp);
  console.log('Leker:', leker);
  
  // Policz produkty BEZ tagu hurtowni
  const noTag = await prisma.product.count({
    where: {
      NOT: {
        OR: [
          { tags: { has: 'Ikonka' } },
          { tags: { has: 'BTP' } },
          { tags: { has: 'HP' } },
          { tags: { has: 'Leker' } }
        ]
      }
    }
  });
  
  console.log('');
  console.log('Bez tagu hurtowni:', noTag);
  
  // Przykłady produktów bez tagu hurtowni
  const examples = await prisma.product.findMany({
    where: {
      NOT: {
        OR: [
          { tags: { has: 'Ikonka' } },
          { tags: { has: 'BTP' } },
          { tags: { has: 'HP' } },
          { tags: { has: 'Leker' } }
        ]
      }
    },
    select: { name: true, tags: true, sku: true },
    take: 5
  });
  
  console.log('');
  console.log('=== PRZYKŁADY BEZ TAGU HURTOWNI ===');
  examples.forEach(p => console.log(p.sku + ': ' + JSON.stringify(p.tags)));
  
  // Suma
  const total = await prisma.product.count();
  console.log('');
  console.log('=== SUMA ===');
  console.log('Wszystkich produktów:', total);
  
  await prisma.$disconnect();
}
check();
