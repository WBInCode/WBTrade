import { prisma } from './src/db';

async function checkProduct() {
  const variant = await prisma.productVariant.findFirst({
    where: { 
      name: { contains: 'BMW Carbon' }
    },
    include: {
      inventory: true,
      product: {
        select: { name: true, status: true }
      }
    }
  });
  
  console.log('Variant:', JSON.stringify(variant, null, 2));
  
  // Also check by product name
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'BMW Carbon' }
    },
    include: {
      variants: {
        include: {
          inventory: true
        }
      }
    }
  });
  
  console.log('\nProduct:', JSON.stringify(product, null, 2));
  
  await prisma.$disconnect();
}

checkProduct().catch(console.error);
