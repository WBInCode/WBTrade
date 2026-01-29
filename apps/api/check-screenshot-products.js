const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Nazwy produktów ze screenshota
  const names = [
    'TOOKY TOY Wielofunkcyjna',
    'VIGA Drewniane Puzzle Układanka',
    'VIGA PolarB Drewniana Ławeczka',
    'VIGA PolarB Zestaw Drewniana Piramidka',
    'WOOPIE Duże Rakietki',
    'WOOPIE Huśtawka Swing',
    'VIGA Drewniane Liczydło',
    'MASTERKIDZ Tablica Magnetyczna'
  ];
  
  console.log('Sprawdzam produkty ze screenshota...\n');
  
  for (const name of names) {
    const products = await prisma.product.findMany({
      where: {
        name: { contains: name, mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        images: { select: { url: true } }
      },
      take: 1
    });
    
    if (products.length > 0) {
      const p = products[0];
      const imgCount = p.images.length;
      const hasPlaceholder = p.images.some(i => /placeholder|noimage/i.test(i.url));
      console.log('═══════════════════════════════════════════════════');
      console.log('Nazwa:', p.name.substring(0, 60));
      console.log('SKU:', p.sku);
      console.log('Status:', p.status);
      console.log('Liczba zdjęć:', imgCount);
      console.log('Ma placeholder:', hasPlaceholder);
      if (imgCount > 0) {
        console.log('Przykładowy URL:', p.images[0].url.substring(0, 100));
      }
      
      // Czy będzie ukryty?
      if (imgCount === 0) {
        console.log('>>> BĘDZIE UKRYTY (brak zdjęć)');
      } else if (hasPlaceholder && p.images.every(i => /placeholder|noimage/i.test(i.url))) {
        console.log('>>> BĘDZIE UKRYTY (same placeholdery)');
      } else {
        console.log('>>> NIE BĘDZIE UKRYTY');
      }
    } else {
      console.log('═══════════════════════════════════════════════════');
      console.log('NIE ZNALEZIONO:', name);
    }
  }
  
  await prisma.$disconnect();
}
check();
