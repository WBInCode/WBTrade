require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== GŁÓWNE KATEGORIE ===\n');
  
  const categories = await prisma.category.findMany({
    where: { parentId: null, isActive: true, order: { gt: 0 } },
    select: { id: true, name: true, slug: true, order: true },
    orderBy: { order: 'asc' }
  });
  
  categories.forEach(c => {
    console.log(`${c.order}. ${c.name}`);
    console.log(`   slug: "${c.slug}"`);
    console.log(`   link: /products?category=${c.slug}`);
    console.log('');
  });
  
  // Sprawdź też kilka subkategorii
  console.log('\n=== PRZYKŁADOWE SUBKATEGORIE ===\n');
  
  const subs = await prisma.category.findMany({
    where: { parentId: { not: null }, isActive: true },
    select: { name: true, slug: true },
    take: 10
  });
  
  subs.forEach(c => {
    console.log(`${c.name} -> slug: "${c.slug}"`);
  });
  
  // Sprawdź czy są puste slugi
  const emptySlug = await prisma.category.findMany({
    where: { 
      OR: [
        { slug: null },
        { slug: '' }
      ]
    },
    select: { name: true, slug: true }
  });
  
  if (emptySlug.length > 0) {
    console.log('\n=== KATEGORIE BEZ SLUG ===');
    emptySlug.forEach(c => console.log(c.name));
  } else {
    console.log('\n✓ Wszystkie kategorie mają slug');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
