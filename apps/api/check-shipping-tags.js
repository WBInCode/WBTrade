require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Produkty z tagiem "kurier i paczkomat"
  const kurierIPaczkomat = await prisma.product.count({
    where: {
      tags: { has: 'kurier i paczkomat' },
      status: 'ACTIVE'
    }
  });
  
  // Wszystkie aktywne
  const wszystkie = await prisma.product.count({
    where: { status: 'ACTIVE' }
  });
  
  console.log('=== STATYSTYKI TAGÓW ===');
  console.log('Wszystkie aktywne produkty:', wszystkie);
  console.log('Z tagiem "kurier i paczkomat":', kurierIPaczkomat);
  
  await prisma.$disconnect();
}

main();
