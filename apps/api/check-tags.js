const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  // Produkty z tagiem 'Paczkomaty i Kurier'
  const withPaczkomat = await p.product.count({
    where: {
      status: 'ACTIVE',
      tags: { hasSome: ['Paczkomaty i Kurier', 'paczkomaty i kurier'] }
    }
  });
  console.log('With Paczkomaty i Kurier tag:', withPaczkomat);
  
  // Produkty z tagiem 'produkt w paczce'
  const withPackage = await p.product.count({
    where: {
      status: 'ACTIVE',
      tags: { has: 'produkt w paczce' }
    }
  });
  console.log('With produkt w paczce tag:', withPackage);
  
  // Sample produktów z tagiem paczkomat
  const samples = await p.product.findMany({
    where: {
      status: 'ACTIVE', 
      tags: { hasSome: ['Paczkomaty i Kurier'] }
    },
    take: 5,
    select: { name: true, tags: true }
  });
  console.log('Sample tags:', JSON.stringify(samples.map(s => s.tags), null, 2));
  
  await p.$disconnect();
}
check();
