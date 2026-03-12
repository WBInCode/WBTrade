const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check current outlet product tags
  const products = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'outlet-' } },
    select: { id: true, name: true, tags: true, status: true, price: true, categoryId: true,
      category: { select: { slug: true, baselinkerCategoryId: true } },
      variants: { select: { inventory: { select: { quantity: true } } } }
    },
    take: 5
  });

  console.log('OUTLET PRODUCTS SAMPLE:');
  for (const p of products) {
    const stock = p.variants.reduce((sum, v) => sum + v.inventory.reduce((s, i) => s + i.quantity, 0), 0);
    console.log(JSON.stringify({
      name: p.name.substring(0, 40),
      tags: p.tags,
      status: p.status,
      price: p.price.toString(),
      stock,
      catSlug: p.category?.slug,
      catBlId: p.category?.baselinkerCategoryId,
    }));
  }

  // Check outlet category
  const outletCat = await prisma.category.findUnique({ where: { slug: 'outlet' } });
  console.log('\nOUTLET CATEGORY:', JSON.stringify({
    id: outletCat?.id,
    slug: outletCat?.slug,
    baselinkerCategoryId: outletCat?.baselinkerCategoryId,
    isActive: outletCat?.isActive,
  }));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
