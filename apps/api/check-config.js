const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== BaseLinker Config ===\n');
  
  const configs = await prisma.baselinkerConfig.findMany();
  console.log('Konfiguracje w bazie:', configs.length);
  
  if (configs.length === 0) {
    console.log('\n⚠️ Brak konfiguracji BaseLinker!');
    console.log('Dodaj konfigurację przez panel admina.\n');
  } else {
    for (const config of configs) {
      console.log('\nConfig ID:', config.id);
      console.log('  Inventory ID:', config.inventoryId);
      console.log('  Last Sync:', config.lastSyncAt);
      console.log('  Sync Enabled:', config.syncEnabled);
      console.log('  Sync Interval:', config.syncIntervalMinutes, 'min');
      console.log('  Token (encrypted):', config.apiTokenEncrypted?.slice(0, 20) + '...');
    }
  }
  
  // Sprawdź też produkty
  console.log('\n=== Przykładowe produkty ===\n');
  
  const products = await prisma.product.findMany({
    take: 5,
    where: { baselinkerProductId: { not: null } },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      price: true,
      baselinkerProductId: true,
    }
  });
  
  console.log('Produkty z BaseLinker:', products.length);
  for (const p of products) {
    console.log(`\n  ${p.name.slice(0, 50)}...`);
    console.log(`    BL ID: ${p.baselinkerProductId}`);
    console.log(`    SKU: ${p.sku}`);
    console.log(`    Barcode/EAN: ${p.barcode || '(brak)'}`);
    console.log(`    Cena: ${p.price} PLN`);
  }
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
