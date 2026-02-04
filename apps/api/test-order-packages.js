const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTestProducts() {
  console.log('🔍 Szukam produktów do testowego zamówienia...\n');

  // Znajdź produkty z tagiem gabaryt
  const gabarytProducts = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      tags: {
        hasSome: ['gabaryt', 'Gabaryt', '149.00 Gabaryt', '99.00 Gabaryt', '79.00 Gabaryt']
      }
    },
    include: {
      variants: { take: 1 }
    },
    take: 5
  });

  console.log('=== GABARYTY (osobna paczka każdy) ===');
  for (const p of gabarytProducts) {
    const gabarytTag = p.tags.find(t => t.toLowerCase().includes('gabaryt'));
    const wholesalerTag = p.tags.find(t => t.toLowerCase().includes('hurtownia'));
    console.log(`  ${p.id}`);
    console.log(`    Nazwa: ${p.name.substring(0, 60)}...`);
    console.log(`    Gabaryt tag: ${gabarytTag}`);
    console.log(`    Hurtownia: ${wholesalerTag || 'brak'}`);
    console.log(`    Variant: ${p.variants[0]?.id || 'BRAK!'}`);
    console.log('');
  }

  // Znajdź produkty Ikonka (dla InPost)
  const ikonkaProducts = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      tags: { hasSome: ['hurtownia:Ikonka', 'Ikonka'] },
      NOT: {
        tags: { hasSome: ['gabaryt', 'Gabaryt', '149.00 Gabaryt', '99.00 Gabaryt'] }
      }
    },
    include: {
      variants: { take: 1 }
    },
    take: 3
  });

  console.log('=== IKONKA (paczka InPost) ===');
  for (const p of ikonkaProducts) {
    console.log(`  ${p.id} - ${p.name.substring(0, 50)}`);
    console.log(`    Variant: ${p.variants[0]?.id}`);
  }

  // Znajdź produkty HP (dla DPD)
  const hpProducts = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      tags: { hasSome: ['hurtownia:HP', 'HP', 'Hurtownia Przemysłowa'] },
      NOT: {
        tags: { hasSome: ['gabaryt', 'Gabaryt', '149.00 Gabaryt', '99.00 Gabaryt'] }
      }
    },
    include: {
      variants: { take: 1 }
    },
    take: 3
  });

  console.log('\n=== HP (paczka DPD) ===');
  for (const p of hpProducts) {
    console.log(`  ${p.id} - ${p.name.substring(0, 50)}`);
    console.log(`    Variant: ${p.variants[0]?.id}`);
  }

  console.log('\n\n📋 PROPOZYCJA TESTOWEGO ZAMÓWIENIA:');
  console.log('=========================================');
  
  const testProducts = [];
  
  if (gabarytProducts.length >= 2) {
    testProducts.push({ product: gabarytProducts[0], type: 'gabaryt-1' });
    testProducts.push({ product: gabarytProducts[1], type: 'gabaryt-2' });
  }
  
  if (ikonkaProducts.length >= 1) {
    testProducts.push({ product: ikonkaProducts[0], type: 'ikonka-inpost' });
  }
  
  if (hpProducts.length >= 1) {
    testProducts.push({ product: hpProducts[0], type: 'hp-dpd' });
  }

  console.log('\nPaczki które powinny powstać:');
  console.log('  1. Wysyłka gabaryt - ' + (gabarytProducts[0]?.name.substring(0, 40) || 'brak') + '...');
  console.log('  2. Wysyłka gabaryt - ' + (gabarytProducts[1]?.name.substring(0, 40) || 'brak') + '...');
  console.log('  3. InPost/Paczkomat (Ikonka) - ' + (ikonkaProducts[0]?.name.substring(0, 40) || 'brak') + '...');
  console.log('  4. DPD Kurier (HP) - ' + (hpProducts[0]?.name.substring(0, 40) || 'brak') + '...');

  console.log('\n\n🛒 VARIANT IDs do dodania do koszyka:');
  console.log('=========================================');
  
  for (const { product, type } of testProducts) {
    if (product.variants[0]) {
      console.log(`${type}: ${product.variants[0].id}`);
    }
  }

  await prisma.$disconnect();
}

findTestProducts().catch(console.error);
