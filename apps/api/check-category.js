const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const DELIVERY_TAGS = [
    'Paczkomaty i Kurier',
    'paczkomaty i kurier',
    'Tylko kurier',
    'tylko kurier',
    'do 2 kg',
    'do 5 kg',
    'do 10 kg',
    'do 20 kg',
    'do 31,5 kg',
  ];

  // Sprawdź kategorię kable-przewody
  const kableCategory = await prisma.category.findFirst({
    where: { slug: { contains: 'kable-przewody' } }
  });
  
  console.log('Kategoria kable-przewody:', kableCategory?.name, '| ID:', kableCategory?.id);
  console.log('baselinkerCategoryId:', kableCategory?.baselinkerCategoryId);
  
  if (!kableCategory) {
    console.log('Kategoria nie znaleziona!');
    return;
  }
  
  // Ile produktów ma kategorię z baselinkerCategoryId
  const withBaselinkerCat = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      price: { gt: 0 },
      tags: { hasSome: DELIVERY_TAGS },
      variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } },
      category: {
        slug: { contains: 'kable-przewody' },
        baselinkerCategoryId: { not: null }
      }
    }
  });
  
  console.log('Z baselinkerCategoryId:', withBaselinkerCat);
  
  // Sprawdź ile kategorii kable-przewody ma baselinkerCategoryId
  const kableCategories = await prisma.category.findMany({
    where: { slug: { contains: 'kable-przewody' } },
    select: { id: true, name: true, slug: true, baselinkerCategoryId: true }
  });
  
  console.log('\nKategorie zawierające kable-przewody:');
  kableCategories.forEach(c => {
    console.log(`- ${c.name} | slug: ${c.slug} | baselinkerCategoryId: ${c.baselinkerCategoryId}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
