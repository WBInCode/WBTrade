const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('=== PRZYKŁADOWE PRODUKTY ===\n');
  
  const products = await p.product.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
      price: true,
      lowestPrice30Days: true,
      lowestPrice30DaysAt: true
    }
  });
  
  products.forEach((prod, i) => {
    console.log(`${i+1}. ${prod.name?.substring(0, 40)}...`);
    console.log(`   ID: ${prod.id}`);
    console.log(`   Cena: ${prod.price} PLN`);
    console.log(`   Najniższa 30 dni: ${prod.lowestPrice30Days} PLN`);
    console.log(`   Data: ${prod.lowestPrice30DaysAt}`);
    console.log('');
  });
  
  console.log('=== PRZYKŁADOWE WARIANTY ===\n');
  
  const variants = await p.productVariant.findMany({
    take: 5,
    select: {
      id: true,
      sku: true,
      price: true,
      lowestPrice30Days: true,
      lowestPrice30DaysAt: true
    }
  });
  
  variants.forEach((v, i) => {
    console.log(`${i+1}. SKU: ${v.sku}`);
    console.log(`   Cena: ${v.price} PLN | Najniższa 30 dni: ${v.lowestPrice30Days} PLN`);
    console.log('');
  });
  
  await p.$disconnect();
})();
