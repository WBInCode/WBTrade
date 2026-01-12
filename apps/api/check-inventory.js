const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Inventory Data ===\n');
  
  // Check inventory count
  const inventoryCount = await prisma.inventory.count();
  console.log('Total Inventory records:', inventoryCount);
  
  // Check locations
  const locations = await prisma.location.findMany();
  console.log('Locations:', locations.length);
  locations.forEach(l => console.log(`  - ${l.name} (${l.code})`));
  
  // Check a sample of inventory records
  const inventorySample = await prisma.inventory.findMany({
    take: 5,
    include: {
      variant: {
        include: {
          product: true
        }
      },
      location: true
    }
  });
  
  console.log('\nSample inventory records:');
  inventorySample.forEach(inv => {
    console.log(`  - Variant: ${inv.variant?.name || 'N/A'}, Product: ${inv.variant?.product?.name?.substring(0, 40) || 'N/A'}...`);
    console.log(`    Location: ${inv.location?.name}, Qty: ${inv.quantity}, Reserved: ${inv.reserved}`);
  });
  
  // Check product variants count
  const variantsCount = await prisma.productVariant.count();
  console.log('\nTotal Product Variants:', variantsCount);
  
  // Check variants with inventory
  const variantsWithInventory = await prisma.productVariant.count({
    where: {
      inventory: {
        some: {}
      }
    }
  });
  console.log('Variants WITH inventory records:', variantsWithInventory);
  console.log('Variants WITHOUT inventory records:', variantsCount - variantsWithInventory);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
