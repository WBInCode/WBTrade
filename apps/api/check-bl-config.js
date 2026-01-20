const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.baselinkerConfig.findFirst();
  
  if (!config) {
    console.log('❌ BRAK konfiguracji Baselinker!');
    console.log('   Skonfiguruj w panelu admina: /admin/baselinker');
    return;
  }
  
  console.log('✅ Konfiguracja Baselinker:');
  console.log('   Inventory ID:', config.inventoryId);
  console.log('   Sync enabled:', config.syncEnabled);
  console.log('   Ma token:', !!config.apiTokenEncrypted);
  console.log('   Last sync:', config.lastSyncAt);
}

main().finally(() => prisma.$disconnect());
