const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlugs() {
  console.log('Sprawdzanie slugów w bazie...\n');
  
  // Check if products have slugs
  const products = await prisma.product.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
      slug: true,
      baselinkerProductId: true
    }
  });
  
  console.log('Pierwsze 10 produktów:');
  products.forEach(p => {
    console.log(`- ${p.name}`);
    console.log(`  Slug: ${p.slug || 'BRAK!'}`);
    console.log(`  Baselinker ID: ${p.baselinkerProductId}\n`);
  });
  
  // Count products without slugs
  const withoutSlug = await prisma.product.count({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    }
  });
  
  const total = await prisma.product.count();
  console.log(`\n📊 Produkty BEZ slugów: ${withoutSlug} / ${total}`);
  console.log(`📊 Produkty Z slugami: ${total - withoutSlug} / ${total}`);
  
  await prisma.$disconnect();
}

checkSlugs().catch(console.error);
