const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkOrder() {
  // Pobierz ostatnie zamówienia ze statusem PAID
  const orders = await p.order.findMany({
    where: {
      paymentStatus: 'PAID',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      orderNumber: true,
      paymentStatus: true,
      status: true,
      baselinkerOrderId: true,
      baselinkerSyncedAt: true,
      createdAt: true,
      total: true,
    },
  });

  console.log('=== Last 10 PAID orders ===');
  for (const o of orders) {
    console.log(`
Order: ${o.orderNumber}
  ID: ${o.id}
  Status: ${o.status}
  Payment: ${o.paymentStatus}
  Baselinker ID: ${o.baselinkerOrderId || 'NOT SYNCED'}
  Synced At: ${o.baselinkerSyncedAt || 'never'}
  Created: ${o.createdAt}
  Total: ${o.total} PLN`);
  }

  // Znajdź zamówienia PAID bez baselinkerOrderId
  const unsyncedOrders = await p.order.count({
    where: {
      paymentStatus: 'PAID',
      baselinkerOrderId: null,
    },
  });
  console.log(`\n=== Unsynced PAID orders: ${unsyncedOrders} ===`);
  
  // Sprawdź config Baselinker
  const config = await p.baselinkerConfig.findFirst();
  console.log('\n=== Baselinker Config ===');
  if (config) {
    console.log(`  Sync Enabled: ${config.syncEnabled}`);
    console.log(`  Inventory ID: ${config.inventoryId}`);
    console.log(`  Has API Token: ${!!config.apiTokenEncrypted}`);
  } else {
    console.log('  NO CONFIG FOUND!');
  }

  await p.$disconnect();
}

checkOrder().catch(console.error);
