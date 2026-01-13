const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Analiza wariantów w bazie:\n');

  // Przykładowe warianty Ikonka
  const ikonkaVariants = await prisma.productVariant.findMany({
    where: {
      product: {
        AND: [
          { baselinkerProductId: { not: { startsWith: 'leker-' } } },
          { baselinkerProductId: { not: { startsWith: 'btp-' } } },
          { baselinkerProductId: { not: { startsWith: 'hp-' } } }
        ]
      }
    },
    take: 10,
    select: {
      id: true,
      baselinkerVariantId: true,
      product: {
        select: {
          baselinkerProductId: true,
          name: true
        }
      }
    }
  });

  console.log('📦 Przykładowe warianty Ikonka:');
  ikonkaVariants.forEach(v => {
    console.log(`   Product: ${v.product.baselinkerProductId}`);
    console.log(`   Variant: ${v.baselinkerVariantId}`);
    console.log(`   Name: ${v.product.name.substring(0, 50)}`);
    console.log();
  });

  // Sprawdź czy warianty mają takie same ID jak produkty
  const sameId = await prisma.productVariant.count({
    where: {
      baselinkerVariantId: {
        equals: prisma.raw('products.baselinker_product_id')
      }
    }
  });

  // Policz warianty bez baselinkerVariantId
  const noVariantId = await prisma.productVariant.count({
    where: {
      OR: [
        { baselinkerVariantId: null },
        { baselinkerVariantId: '' }
      ]
    }
  });

  console.log(`❌ Warianty bez baselinkerVariantId: ${noVariantId}`);
  
  // Sprawdź strukturę
  const totalVariants = await prisma.productVariant.count();
  console.log(`📊 Łącznie wariantów: ${totalVariants.toLocaleString('pl-PL')}`);

  await prisma.$disconnect();
}

main().catch(console.error);
