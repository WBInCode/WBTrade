const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_ioaBnk75ybAm@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  // Sprawdź produkt 132070354 ze screena
  console.log('=== Szukam produktu 132070354 ===');
  const prod = await p.product.findFirst({
    where: { name: { contains: '132070354' } },
    include: { images: true }
  });
  
  if (prod) {
    console.log('Name:', prod.name);
    console.log('Images count:', prod.images?.length || 0);
    if (prod.images && prod.images.length > 0) {
      prod.images.forEach((img, i) => console.log(`  ${i}: ${img.url}`));
    } else {
      console.log('  BRAK OBRAZKÓW!');
    }
  } else {
    console.log('Nie znaleziono produktu');
  }
  
  // Sprawdź ile produktów w tej kategorii ma/nie ma obrazków
  console.log('\n=== Statystyki obrazków produktów z kategorią ===');
  const withCatWithImages = await p.product.count({
    where: { 
      categoryId: { not: null },
      images: { some: {} }
    }
  });
  const withCatNoImages = await p.product.count({
    where: { 
      categoryId: { not: null },
      images: { none: {} }
    }
  });
  console.log('Z kategorią I z obrazkami:', withCatWithImages);
  console.log('Z kategorią BEZ obrazków:', withCatNoImages);
}

main().finally(() => p.$disconnect());
