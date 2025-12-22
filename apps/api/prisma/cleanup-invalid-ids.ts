import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning invalid products with prod_ IDs...');
  
  // Delete inventory for variants of invalid products
  const inv = await prisma.$executeRaw`DELETE FROM inventory WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id LIKE 'prod_%')`;
  console.log(`  - Deleted ${inv} inventory records`);
  
  // Delete variants of invalid products
  const variants = await prisma.$executeRaw`DELETE FROM product_variants WHERE product_id LIKE 'prod_%'`;
  console.log(`  - Deleted ${variants} variant records`);
  
  // Delete images of invalid products
  const images = await prisma.$executeRaw`DELETE FROM product_images WHERE product_id LIKE 'prod_%'`;
  console.log(`  - Deleted ${images} image records`);
  
  // Delete invalid products
  const products = await prisma.$executeRaw`DELETE FROM products WHERE id LIKE 'prod_%'`;
  console.log(`  - Deleted ${products} product records`);
  
  console.log('✅ Cleanup completed!');
  
  // Show remaining products count
  const remaining = await prisma.product.count();
  console.log(`📦 Remaining products: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
