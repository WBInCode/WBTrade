const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCategories() {
  console.log('=== SPRAWDZANIE KATEGORII ===\n');
  
  // Kategorie z produktami
  const categoriesWithProducts = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      baselinkerCategoryId: true,
      _count: {
        select: {
          products: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  console.log('Kategorie z liczbą produktów:');
  categoriesWithProducts.forEach(c => {
    console.log(`- ${c.name} (BL ID: ${c.baselinkerCategoryId}): ${c._count.products} produktów`);
  });
  
  // Produkty bez kategorii
  const productsWithoutCategory = await prisma.product.count({
    where: {
      categoryId: null
    }
  });
  
  console.log(`\n📊 Produkty BEZ kategorii: ${productsWithoutCategory}`);
  
  // Przykładowe produkty z kategoriami
  const sampleProducts = await prisma.product.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
      categoryId: true,
      category: {
        select: {
          name: true,
          baselinkerCategoryId: true
        }
      }
    }
  });
  
  console.log('\nPrzykładowe produkty:');
  sampleProducts.forEach(p => {
    console.log(`- ${p.name}`);
    console.log(`  Kategoria: ${p.category ? p.category.name + ' (BL: ' + p.category.baselinkerCategoryId + ')' : 'BRAK!'}`);
  });
  
  await prisma.$disconnect();
}

checkCategories().catch(console.error);
