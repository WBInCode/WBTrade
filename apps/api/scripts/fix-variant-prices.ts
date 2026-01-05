/**
 * Fix variant prices - sync from product prices
 * This script updates all variants that have price = 0 with their product's price
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixVariantPrices() {
  console.log('🔧 Starting variant price fix...\n');

  // Get all variants with price = 0 that have a product with price > 0
  const variantsToFix = await prisma.productVariant.findMany({
    where: {
      price: 0,
      product: {
        price: { gt: 0 }
      }
    },
    include: {
      product: {
        select: { id: true, name: true, price: true }
      }
    }
  });

  console.log(`Found ${variantsToFix.length} variants with price = 0 that need fixing\n`);

  if (variantsToFix.length === 0) {
    console.log('✅ No variants to fix!');
    return;
  }

  // Update each variant
  let fixed = 0;
  for (const variant of variantsToFix) {
    const productPrice = Number(variant.product.price);
    
    if (productPrice > 0) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { price: productPrice }
      });
      
      console.log(`✓ Fixed: ${variant.product.name} (${variant.name}) - ${productPrice} PLN`);
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} variants!`);

  // Also check for products with price = 0 that have variants with price > 0
  const productsToFix = await prisma.product.findMany({
    where: {
      price: 0,
      variants: {
        some: {
          price: { gt: 0 }
        }
      }
    },
    include: {
      variants: {
        select: { price: true },
        orderBy: { price: 'desc' },
        take: 1
      }
    }
  });

  console.log(`\nFound ${productsToFix.length} products with price = 0 that have variants with price > 0`);

  for (const product of productsToFix) {
    const variantPrice = Number(product.variants[0]?.price || 0);
    
    if (variantPrice > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { price: variantPrice }
      });
      
      console.log(`✓ Fixed product: ${product.name} - ${variantPrice} PLN`);
    }
  }

  console.log('\n🎉 Price fix completed!');
}

fixVariantPrices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
