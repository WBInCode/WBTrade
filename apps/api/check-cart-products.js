const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Szukaj produktu Marble
  const marble = await prisma.product.findFirst({
    where: { name: { contains: 'Marble', mode: 'insensitive' } },
    select: { id: true, name: true, tags: true }
  });
  console.log('Marble product:');
  console.log('Name:', marble?.name);
  console.log('Tags:', marble?.tags);
  
  // Szukaj produktu Uchwyt organizer
  const organizer = await prisma.product.findFirst({
    where: { name: { contains: 'Uchwyt organizer', mode: 'insensitive' } },
    select: { id: true, name: true, tags: true }
  });
  console.log('\nOrganizer product:');
  console.log('Name:', organizer?.name);
  console.log('Tags:', organizer?.tags);
  
  // Sprawdź czy mają tagi paczkomat
  const PACZKOMAT_TAGS = ['Paczkomaty i Kurier', 'paczkomaty i kurier'];
  const PACKAGE_LIMIT_PATTERN = /produkt\s*w\s*paczce:\s*(\d+)/i;
  
  [marble, organizer].forEach(p => {
    if (!p) return;
    const hasPaczkomat = p.tags.some(t => PACZKOMAT_TAGS.some(pt => t.toLowerCase() === pt.toLowerCase()));
    const packageMatch = p.tags.find(t => PACKAGE_LIMIT_PATTERN.test(t));
    console.log(`\n${p.name}:`);
    console.log('  Ma tag Paczkomat:', hasPaczkomat);
    console.log('  Tag produkt w paczce:', packageMatch || 'BRAK');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
