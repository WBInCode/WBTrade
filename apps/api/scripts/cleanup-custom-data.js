// Script to remove custom products and categories (without Baselinker IDs)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanup() {
  console.log('Starting cleanup of custom products and categories...\n');
  
  // 1. Find the specific custom product "testJS"
  const customProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'testJS', mode: 'insensitive' } },
        { sku: 'T-JGBY' },
        { name: { contains: 'TestProduct', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      sku: true
    }
  });
  
  console.log(`Found ${customProducts.length} custom products:`);
  customProducts.forEach(p => console.log(`  - ${p.name} (${p.sku})`));
  
  // 2. Find the specific custom category "TestSosnowski"
  const customCategories = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'TestSosnowski', mode: 'insensitive' } },
        { name: { contains: 'Sosnowski', mode: 'insensitive' } },
        { slug: 'testjs' }
      ]
    },
    select: {
      id: true,
      name: true,
      slug: true
    }
  });
  
  console.log(`\nFound ${customCategories.length} custom categories:`);
  customCategories.forEach(c => console.log(`  - ${c.name} (${c.slug})`));
  
  if (customProducts.length === 0 && customCategories.length === 0) {
    console.log('\nNo custom data to cleanup.');
    return;
  }
  
  console.log('\nDeleting custom data...');
  
  // 3. Delete custom products (this will cascade delete variants, images, etc.)
  if (customProducts.length > 0) {
    const productIds = customProducts.map(p => p.id);
    
    // Get variant IDs for these products
    const variants = await prisma.productVariant.findMany({
      where: { productId: { in: productIds } },
      select: { id: true }
    });
    const variantIds = variants.map(v => v.id);
    
    // Delete order items referencing these variants
    if (variantIds.length > 0) {
      const deletedOrderItems = await prisma.orderItem.deleteMany({
        where: { variantId: { in: variantIds } }
      });
      console.log(`Deleted ${deletedOrderItems.count} order items`);
    }
    
    // Delete cart items referencing these variants
    if (variantIds.length > 0) {
      const deletedCartItems = await prisma.cartItem.deleteMany({
        where: { variantId: { in: variantIds } }
      });
      console.log(`Deleted ${deletedCartItems.count} cart items`);
    }
    
    // Delete wishlist items
    const deletedWishlist = await prisma.wishlistItem.deleteMany({
      where: { productId: { in: productIds } }
    });
    console.log(`Deleted ${deletedWishlist.count} wishlist items`);
    
    // Delete related inventory records
    await prisma.inventory.deleteMany({
      where: {
        variant: {
          productId: { in: productIds }
        }
      }
    });
    
    // Delete products (cascades to variants, images, reviews)
    const deletedProducts = await prisma.product.deleteMany({
      where: {
        id: { in: productIds }
      }
    });
    console.log(`Deleted ${deletedProducts.count} custom products`);
  }
  
  // 4. Delete custom categories
  if (customCategories.length > 0) {
    const categoryIds = customCategories.map(c => c.id);
    const deletedCategories = await prisma.category.deleteMany({
      where: {
        id: { in: categoryIds }
      }
    });
    console.log(`Deleted ${deletedCategories.count} custom categories`);
  }
  
  console.log('\nCleanup completed!');
}

cleanup()
  .catch(e => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
