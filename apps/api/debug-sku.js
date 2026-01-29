const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check variant table
  const variant = await prisma.productVariant.findFirst({
    where: { sku: '31200' }
  });
  console.log('Variant by SKU 31200:', variant);

  // Check product table (if it has sku field)
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'WOOPIE BABY Klocki Sensoryczne' } },
    include: { variants: true }
  });
  
  if (product) {
    console.log('\nProduct found by name:');
    console.log('  ID:', product.id);
    console.log('  Name:', product.name);
    console.log('  SKU (product level):', product.sku || 'N/A');
    console.log('  Variants:', product.variants.map(v => ({ sku: v.sku, barcode: v.barcode })));
  }

  await prisma.$disconnect();
}

main();
