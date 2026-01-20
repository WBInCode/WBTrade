require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { 
      baselinkerProductId: { not: null },
      tags: { isEmpty: false }
    },
    select: { 
      name: true, 
      sku: true,
      tags: true 
    },
    take: 10
  });
  
  console.log('=== 10 PRZYKŁADOWYCH PRODUKTÓW Z TAGAMI ===\n');
  
  for (const p of products) {
    console.log('Nazwa: ' + p.name.substring(0, 55));
    console.log('SKU: ' + p.sku);
    console.log('Tagi: ' + JSON.stringify(p.tags));
    console.log('---');
  }
  
  await prisma.$disconnect();
}

main();
