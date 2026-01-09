// Script to delete ALL products and inventory from the database
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllProducts() {
  console.log('⚠️  WARNING: This will delete ALL products from the database!\n');
  
  // Get counts before deletion
  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const inventoryCount = await prisma.inventory.count();
  const imageCount = await prisma.productImage.count();
  
  console.log('Current counts:');
  console.log(`  - Products: ${productCount}`);
  console.log(`  - Variants: ${variantCount}`);
  console.log(`  - Inventory records: ${inventoryCount}`);
  console.log(`  - Product images: ${imageCount}`);
  
  console.log('\nDeleting all data...\n');
  
  // 1. Delete order items first (they reference variants)
  const deletedOrderItems = await prisma.orderItem.deleteMany({});
  console.log(`Deleted ${deletedOrderItems.count} order items`);
  
  // 2. Delete cart items
  const deletedCartItems = await prisma.cartItem.deleteMany({});
  console.log(`Deleted ${deletedCartItems.count} cart items`);
  
  // 3. Delete wishlist items
  const deletedWishlist = await prisma.wishlistItem.deleteMany({});
  console.log(`Deleted ${deletedWishlist.count} wishlist items`);
  
  // 4. Delete inventory records
  const deletedInventory = await prisma.inventory.deleteMany({});
  console.log(`Deleted ${deletedInventory.count} inventory records`);
  
  // 5. Delete reviews
  const deletedReviews = await prisma.review.deleteMany({});
  console.log(`Deleted ${deletedReviews.count} reviews`);
  
  // 6. Delete products (cascades to variants and images)
  const deletedProducts = await prisma.product.deleteMany({});
  console.log(`Deleted ${deletedProducts.count} products`);
  
  console.log('\n✅ All products deleted successfully!');
  console.log('You can now re-sync products from Baselinker.');
}

deleteAllProducts()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
