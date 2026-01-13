const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  const slug = 'samochod-zdalnie-sterowany-na-pilota-rc-rock-crawler-hb-24ghz-118-czerwony';
  
  console.log(`Szukam produktu z slugiem: ${slug}\n`);
  
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      baselinkerProductId: true
    }
  });
  
  if (product) {
    console.log('✅ Produkt znaleziony w bazie:');
    console.log(JSON.stringify(product, null, 2));
  } else {
    console.log('❌ Produkt NIE ISTNIEJE w bazie!');
    
    // Szukaj podobnego
    const similar = await prisma.product.findMany({
      where: {
        slug: {
          contains: 'samochod-zdalnie-sterowany-na-pilota'
        }
      },
      take: 3,
      select: { id: true, name: true, slug: true }
    });
    
    console.log('\nPodobne produkty:');
    console.log(JSON.stringify(similar, null, 2));
  }
  
  await prisma.$disconnect();
}

checkProduct().catch(console.error);
