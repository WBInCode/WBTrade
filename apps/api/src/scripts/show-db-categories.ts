import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  // Get full category tree from DB
  const cats = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true, isActive: true },
    orderBy: { order: 'asc' },
  });

  const map = new Map(cats.map(c => [c.id, c]));

  // Build tree
  console.log('=== KATEGORIE W BAZIE DANYCH (drzewko) ===\n');
  
  const roots = cats.filter(c => !c.parentId);
  for (const root of roots) {
    const children = cats.filter(c => c.parentId === root.id);
    const productCount = await prisma.product.count({ where: { categoryId: root.id } });
    console.log(`${root.isActive ? '✅' : '❌'} ${root.name} [${root.slug}] (${productCount} prod.) id=${root.id}`);
    
    for (const child of children) {
      const childCount = await prisma.product.count({ where: { categoryId: child.id } });
      console.log(`   ${child.isActive ? '✅' : '❌'} ${child.name} [${child.slug}] (${childCount} prod.) id=${child.id}`);
      
      const grandchildren = cats.filter(c => c.parentId === child.id);
      for (const gc of grandchildren) {
        const gcCount = await prisma.product.count({ where: { categoryId: gc.id } });
        console.log(`      ${gc.isActive ? '✅' : '❌'} ${gc.name} [${gc.slug}] (${gcCount} prod.) id=${gc.id}`);
      }
    }
  }
  
  console.log(`\nŁącznie kategorii: ${cats.length}`);
  
  // Show HP products without category stats
  const hpNoCat = await prisma.product.count({
    where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: null }
  });
  const hpWithCat = await prisma.product.count({
    where: { baselinkerProductId: { startsWith: 'hp-' }, categoryId: { not: null } }
  });
  console.log(`\nHP produkty: ${hpWithCat} z kat. / ${hpNoCat} bez kat. = ${hpWithCat + hpNoCat} łącznie`);
}

main().finally(() => prisma.$disconnect());
