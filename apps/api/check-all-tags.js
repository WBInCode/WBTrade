require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Pobierz wszystkie unikalne tagi
  const products = await prisma.product.findMany({
    where: { tags: { isEmpty: false } },
    select: { tags: true },
    take: 10000
  });
  
  const tagCounts = {};
  for (const p of products) {
    for (const tag of p.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  
  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  
  console.log('=== TOP 30 TAGÓW ===\n');
  sorted.slice(0, 30).forEach(([tag, count]) => console.log(count + 'x\t' + tag));
  
  // Tagi dostawy
  const deliveryTags = sorted.filter(([tag]) => 
    tag.toLowerCase().includes('kurier') || 
    tag.toLowerCase().includes('paczkomat') ||
    tag.toLowerCase().includes('kg') ||
    tag.toLowerCase().includes('gabaryt')
  );
  
  console.log('\n=== TAGI DOSTAWY ===\n');
  deliveryTags.forEach(([tag, count]) => console.log(count + 'x\t' + tag));
  
  await prisma.$disconnect();
}
check();
