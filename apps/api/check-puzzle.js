const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.product.findFirst({
    where: { name: { contains: 'Puzzle drewniane sorter', mode: 'insensitive' } },
    select: { name: true, tags: true }
  });
  
  console.log('Produkt:', p?.name);
  console.log('Tagi:', JSON.stringify(p?.tags, null, 2));
  
  // Sprawdź tag produkt w paczce
  const PACKAGE_LIMIT_PATTERN = /produkt\s*w\s*paczce:\s*(\d+)/i;
  const packageTag = p?.tags?.find(t => PACKAGE_LIMIT_PATTERN.test(t));
  
  if (packageTag) {
    const match = packageTag.match(PACKAGE_LIMIT_PATTERN);
    console.log('\nTag "produkt w paczce":', packageTag);
    console.log('Limit:', match[1], 'szt/paczka');
    console.log('\nObliczenia:');
    const limit = parseInt(match[1]);
    for (let qty = 1; qty <= 6; qty++) {
      const fraction = qty / limit;
      const packages = Math.ceil(fraction);
      const cost = packages * 15.99;
      console.log(`  ${qty} szt: ${qty}/${limit} = ${fraction.toFixed(4)} → ${packages} paczek × 15.99 = ${cost.toFixed(2)} zł`);
    }
  } else {
    console.log('\nBRAK tagu "produkt w paczce" - domyślnie 1 szt = 1 paczka');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
