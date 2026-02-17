const { PrismaClient, ProductStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFeed() {
  // Get 10 sample products that were updated in sync
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      baselinkerProductId: { not: null },
    },
    select: {
      sku: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: {
        select: { url: true },
        orderBy: { order: 'asc' },
        take: 1,
      },
    },
    take: 10,
  });

  console.log('=== Sample feed products (first 10) ===\n');
  for (const p of products) {
    console.log(`SKU: ${p.sku}`);
    console.log(`Name: ${p.name}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Price: ${Number(p.price).toFixed(2)} PLN`);
    if (p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price)) {
      console.log(`Sale: ${Number(p.price).toFixed(2)} PLN (was ${Number(p.compareAtPrice).toFixed(2)} PLN)`);
    }
    console.log(`Image: ${p.images[0]?.url || 'none'}`);
    console.log(`Link: https://www.wb-trade.pl/product/${p.slug}`);
    console.log('---');
  }

  // Count total active
  const total = await prisma.product.count({ where: { status: ProductStatus.ACTIVE } });
  console.log(`\nTotal products that will be in feed: ${total}`);

  await prisma.$disconnect();
}

testFeed().catch(console.error);
