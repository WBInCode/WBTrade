require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    take: 5,
    include: { category: true }
  });
  
  console.log('Produkty z kategoriami i tagami:');
  for (const p of products) {
    console.log(`- ${p.name.slice(0, 50)}...`);
    console.log(`  Kategoria: ${p.category?.name || 'BRAK'}`);
    console.log(`  Tagi: ${p.tags?.length > 0 ? p.tags.join(', ') : 'BRAK'}`);
    console.log('');
  }
  
  await prisma.$disconnect();
}

main();
