// Find and delete categories with "/" separator (Hurtownia Sportowa format)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_4v2IehYGZzjF@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  // Find all categories with "/" in name (sport warehouse format)
  const slashCategories = await prisma.category.findMany({
    where: {
      name: { contains: '/' }
    },
    select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
    orderBy: { name: 'asc' }
  });

  console.log(`=== CATEGORIES WITH "/" IN NAME (Hurtownia Sportowa format) ===`);
  console.log(`Found: ${slashCategories.length}`);
  let totalProducts = 0;
  for (const c of slashCategories) {
    totalProducts += c._count.products;
    if (c._count.products > 0) {
      console.log(`  [${c._count.products} prod] "${c.name}"`);
    }
  }
  
  // Show first 30 names
  console.log('\nFirst 30 names:');
  for (const c of slashCategories.slice(0, 30)) {
    console.log(`  - "${c.name}" (${c._count.products} prod)`);
  }
  
  console.log(`\nTotal products in "/" categories: ${totalProducts}`);
  
  // Also check: categories WITHOUT "/" and WITHOUT "|" that are NOT standard names
  // These might also be sport-only top-level categories
  const allCats = await prisma.category.findMany({
    where: {
      parentId: null, // top-level only
      name: { not: { contains: '|' } },
    },
    select: { id: true, name: true, slug: true, _count: { select: { products: true, children: true } } },
    orderBy: { name: 'asc' }
  });
  
  console.log(`\n=== ALL TOP-LEVEL CATEGORIES (without "|") ===`);
  for (const c of allCats) {
    const hasSlash = c.name.includes('/');
    console.log(`  ${hasSlash ? '[SLASH]' : '[CLEAN]'} "${c.name}" (slug: ${c.slug}) | prod: ${c._count.products}, children: ${c._count.children}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
