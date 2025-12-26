const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_ioaBnk75ybAm@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  // Sprawdź produkt który był aktualizowany
  const product = await prisma.product.findFirst({
    where: { baselinkerProductId: '83362553' },
    select: { id: true, name: true, slug: true, baselinkerProductId: true }
  });
  
  console.log('Produkt w bazie:');
  console.log(product);
  
  // Sprawdź ile produktów nadal ma fallback nazwy
  const fallbackCount = await prisma.product.count({
    where: { name: { startsWith: 'Product ' } }
  });
  
  console.log(`\nProduktów z fallback nazwami: ${fallbackCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
