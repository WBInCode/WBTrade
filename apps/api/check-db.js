const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Delivery tags required for products to be visible
const DELIVERY_TAGS = [
  'Paczkomaty i Kurier',
  'paczkomaty i kurier',
  'Tylko kurier',
  'tylko kurier',
  'do 2 kg',
  'do 5 kg',
  'do 10 kg',
  'do 20 kg',
  'do 31,5 kg',
];

async function check() {
  try {
    const count = await p.product.count();
    console.log('Products count:', count);
    
    const activeCount = await p.product.count({
      where: { status: 'ACTIVE' }
    });
    console.log('Active products:', activeCount);
    
    // Check products with at least one delivery tag
    const withDeliveryTag = await p.product.count({
      where: {
        status: 'ACTIVE',
        tags: { hasSome: DELIVERY_TAGS }
      }
    });
    console.log('Products with delivery tags:', withDeliveryTag);
    
    // Check products with categoryId
    const withCategory = await p.product.count({
      where: {
        status: 'ACTIVE',
        categoryId: { not: null }
      }
    });
    console.log('Products with category:', withCategory);
    
    // Check categories with baselinkerCategoryId
    const categoriesWithBL = await p.category.count({
      where: {
        baselinkerCategoryId: { not: null }
      }
    });
    console.log('Categories with baselinkerCategoryId:', categoriesWithBL);
    
    const categoriesTotal = await p.category.count();
    console.log('Total categories:', categoriesTotal);
    
    // Check products with category that has baselinkerCategoryId
    const productsWithBLCategory = await p.product.count({
      where: {
        status: 'ACTIVE',
        category: {
          baselinkerCategoryId: { not: null }
        }
      }
    });
    console.log('Products with baselinker category:', productsWithBLCategory);
    
    // Full filter as in service
    const fullFilter = await p.product.count({
      where: {
        price: { gt: 0 },
        variants: {
          some: {
            inventory: {
              some: {
                quantity: { gt: 0 }
              }
            }
          }
        },
        AND: [
          { tags: { hasSome: DELIVERY_TAGS } },
          { 
            category: { 
              baselinkerCategoryId: { not: null } 
            } 
          },
        ],
      }
    });
    console.log('Products matching full filter:', fullFilter);
    
    // Check inventory
    const withInventory = await p.product.count({
      where: {
        status: 'ACTIVE',
        variants: {
          some: {
            inventory: {
              some: {
                quantity: { gt: 0 }
              }
            }
          }
        }
      }
    });
    console.log('Products with inventory > 0:', withInventory);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}

check();
