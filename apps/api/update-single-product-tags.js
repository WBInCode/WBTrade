/**
 * Update tags for ONE specific product
 * EAN: 5904326942059
 * SKU: 31200
 * Product: WOOPIE BABY Klocki Sensoryczne
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_TOKEN = process.env.BASELINKER_API_TOKEN;

async function baselinkerRequest(method, parameters = {}) {
  const response = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-BLToken': BASELINKER_API_TOKEN
    },
    body: new URLSearchParams({
      method,
      parameters: JSON.stringify(parameters)
    })
  });
  
  const data = await response.json();
  if (data.status === 'ERROR') {
    throw new Error(`Baselinker error: ${data.error_message}`);
  }
  return data;
}

async function main() {
  const SKU = '31200';
  const INVENTORY_ID = 22952; // Leker
  const PRODUCT_ID = 212543396;
  
  console.log(`🔍 Updating tags for product SKU: ${SKU}\n`);
  
  // 1. Get current tags from database - try by SKU first
  let productInDb = await prisma.product.findFirst({
    where: {
      variants: {
        some: {
          sku: SKU
        }
      }
    },
    include: { variants: true }
  });
  
  // If not found by variant SKU, try by baselinkerProductId
  if (!productInDb) {
    productInDb = await prisma.product.findFirst({
      where: {
        baselinkerProductId: String(PRODUCT_ID)
      }
    });
  }
  
  if (!productInDb) {
    console.log('❌ Product not found in database');
    console.log('   Trying to find by name...');
    
    productInDb = await prisma.product.findFirst({
      where: {
        name: { contains: 'WOOPIE BABY Klocki Sensoryczne' }
      }
    });
  }
  
  if (!productInDb) {
    console.log('❌ Product not found in database at all');
    await prisma.$disconnect();
    return;
  }
  
  console.log('📦 Product in DB:');
  console.log('   Name:', productInDb.name);
  console.log('   ID:', productInDb.id);
  console.log('   Current tags:', productInDb.tags);
  
  // 2. Get tags from Baselinker
  const dataResponse = await baselinkerRequest('getInventoryProductsData', {
    inventory_id: INVENTORY_ID,
    products: [PRODUCT_ID]
  });
  
  const blProduct = Object.values(dataResponse.products)[0];
  
  if (!blProduct) {
    console.log('❌ Product not found in Baselinker');
    return;
  }
  
  const newTags = blProduct.tags || [];
  
  console.log('\n🏷️ Tags from Baselinker:');
  console.log('  ', newTags);
  
  // 3. Compare
  const currentTagsStr = JSON.stringify((productInDb.tags || []).sort());
  const newTagsStr = JSON.stringify(newTags.sort());
  
  if (currentTagsStr === newTagsStr) {
    console.log('\n✅ Tags are already the same, no update needed');
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n🔄 Updating tags...');
  console.log('   Before:', productInDb.tags);
  console.log('   After:', newTags);
  
  // 4. Update
  await prisma.product.update({
    where: { id: productInDb.id },
    data: { tags: newTags }
  });
  
  console.log('\n✅ Tags updated successfully!');
  
  // 5. Verify
  const updated = await prisma.product.findUnique({
    where: { id: productInDb.id },
    select: { tags: true }
  });
  
  console.log('   Verified tags:', updated.tags);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
