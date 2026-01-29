require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PODZIAŁ "Paczkomaty i Kurier" NA "produkt w paczce: X" ===\n');

  // Produkty z tagiem "Paczkomaty i Kurier"
  const paczkomatyIKurier = await prisma.product.count({
    where: {
      tags: { has: 'Paczkomaty i Kurier' },
      status: 'ACTIVE'
    }
  });
  console.log('Produkty z tagiem "Paczkomaty i Kurier":', paczkomatyIKurier);

  // Dla każdego tagu "produkt w paczce: X" sprawdź ile ma też "Paczkomaty i Kurier"
  for (let i = 1; i <= 5; i++) {
    const tag = `produkt w paczce: ${i}`;
    
    const count = await prisma.product.count({
      where: {
        AND: [
          { tags: { has: 'Paczkomaty i Kurier' } },
          { tags: { has: tag } }
        ],
        status: 'ACTIVE'
      }
    });
    
    console.log(`  + "${tag}": ${count}`);
  }

  // Sprawdź też "Tylko kurier"
  console.log('\n=== PODZIAŁ "Tylko kurier" NA "produkt w paczce: X" ===\n');
  
  const tylkoKurier = await prisma.product.count({
    where: {
      tags: { has: 'Tylko kurier' },
      status: 'ACTIVE'
    }
  });
  console.log('Produkty z tagiem "Tylko kurier":', tylkoKurier);

  for (let i = 1; i <= 5; i++) {
    const tag = `produkt w paczce: ${i}`;
    
    const count = await prisma.product.count({
      where: {
        AND: [
          { tags: { has: 'Tylko kurier' } },
          { tags: { has: tag } }
        ],
        status: 'ACTIVE'
      }
    });
    
    console.log(`  + "${tag}": ${count}`);
  }

  await prisma.$disconnect();
}

main();
