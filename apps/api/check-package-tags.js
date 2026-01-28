const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Pobierz produkty z kategorii kable-przewody
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      price: { gt: 0 },
      variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } },
      category: { slug: { contains: 'kable-przewody' } },
      tags: { hasSome: ['Paczkomaty i Kurier', 'paczkomaty i kurier', 'Tylko kurier', 'tylko kurier', 'do 2 kg', 'do 5 kg', 'do 10 kg', 'do 20 kg', 'do 31,5 kg'] }
    },
    take: 100,
    select: { id: true, name: true, tags: true }
  });
  
  console.log('Znaleziono produktów:', products.length);
  
  let withPaczkomat = 0;
  let withPaczkomatAndPackageLimit = 0;
  let onlyKurier = 0;
  
  const PACKAGE_LIMIT_PATTERN = /produkt\s*w\s*paczce|produkty?\s*w\s*paczce/i;
  
  products.forEach(p => {
    const hasPaczkomat = p.tags.some(t => 
      t.toLowerCase() === 'paczkomaty i kurier'
    );
    const hasKurier = p.tags.some(t => 
      t.toLowerCase() === 'tylko kurier'
    );
    const hasPackageLimit = p.tags.some(t => PACKAGE_LIMIT_PATTERN.test(t));
    
    if (hasPaczkomat) {
      withPaczkomat++;
      if (hasPackageLimit) {
        withPaczkomatAndPackageLimit++;
      }
    }
    if (hasKurier) {
      onlyKurier++;
    }
  });
  
  console.log('Z tagiem "Paczkomaty i Kurier":', withPaczkomat);
  console.log('Z tagiem paczkomat + produkt w paczce:', withPaczkomatAndPackageLimit);
  console.log('Z tagiem "Tylko kurier":', onlyKurier);
  
  // Pokaż przykład produktu z paczkomat ale bez package limit
  const badProduct = products.find(p => {
    const hasPaczkomat = p.tags.some(t => t.toLowerCase() === 'paczkomaty i kurier');
    const hasPackageLimit = p.tags.some(t => PACKAGE_LIMIT_PATTERN.test(t));
    return hasPaczkomat && !hasPackageLimit;
  });
  
  if (badProduct) {
    console.log('\nPrzykład produktu z paczkomat ale bez "produkt w paczce":');
    console.log('Nazwa:', badProduct.name);
    console.log('Tagi:', badProduct.tags);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
