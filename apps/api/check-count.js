const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_ioaBnk75ybAm@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  // Sprawdź przykładowe kategorie
  console.log('=== Sample categories ===');
  const cats = await p.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    take: 10,
    select: { id: true, name: true, baselinkerCategoryId: true, slug: true }
  });
  cats.forEach(c => console.log(`  baselinkerCategoryId: "${c.baselinkerCategoryId}", name: ${c.name.substring(0, 40)}`));
  
  // Sprawdź czy jest kategoria 1038263 (z testu)
  console.log('\n=== Szukam kategorii z baselinkerCategoryId = 1038263 ===');
  const cat1038263 = await p.category.findFirst({
    where: { baselinkerCategoryId: '1038263' }
  });
  console.log('Znaleziono:', cat1038263 ? `TAK - ${cat1038263.name}` : 'NIE');
  
  // Sprawdź min/max baselinkerCategoryId w DB
  console.log('\n=== Min/Max baselinkerCategoryId w DB ===');
  const allCats = await p.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { baselinkerCategoryId: true }
  });
  const numericIds = allCats.map(c => parseInt(c.baselinkerCategoryId)).filter(n => !isNaN(n));
  console.log('Min:', Math.min(...numericIds));
  console.log('Max:', Math.max(...numericIds));
  console.log('Total categories:', allCats.length);
  
  // Statystyki produktów
  console.log('\n=== Statystyki produktów ===');
  const withCat = await p.product.count({ where: { categoryId: { not: null } } });
  const withoutCat = await p.product.count({ where: { categoryId: null } });
  console.log('Products WITH category:', withCat);
  console.log('Products WITHOUT category:', withoutCat);
}

main().finally(() => p.$disconnect());
