/**
 * Sprawdź status synchronizacji zamówień do Baselinkera
 */

import { prisma } from './src/db';

async function main() {
  console.log('📊 Status zamówień i synchronizacji do Baselinkera\n');

  // 1. Podsumowanie po statusach
  const summary = await prisma.order.groupBy({
    by: ['paymentStatus', 'status'],
    _count: true,
  });

  console.log('📈 Statystyki zamówień:');
  console.table(summary.map(s => ({
    'Payment Status': s.paymentStatus,
    'Order Status': s.status,
    'Count': s._count,
  })));

  // 2. Opłacone zamówienia bez sync do Baselinkera
  const unsyncedPaid = await prisma.order.findMany({
    where: {
      paymentStatus: 'PAID',
      baselinkerOrderId: null,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          variant: {
            select: {
              product: {
                select: {
                  baselinkerProductId: true,
                }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n❌ Opłacone zamówienia BEZ sync do Baselinkera (${unsyncedPaid.length}):`);
  for (const order of unsyncedPaid) {
    console.log(`\n  📦 ${order.orderNumber} | ${order.status} | ${order.total} PLN`);
    console.log(`     ID: ${order.id}`);
    console.log(`     Created: ${order.createdAt.toISOString()}`);
    console.log(`     Products:`);
    for (const item of order.items) {
      const blId = item.variant?.product?.baselinkerProductId || 'BRAK';
      console.log(`       - ${item.productName} x${item.quantity} (BL: ${blId})`);
    }
  }

  // 3. Ostatnie zsynchronizowane zamówienia
  const syncedOrders = await prisma.order.findMany({
    where: {
      baselinkerOrderId: { not: null },
    },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      baselinkerOrderId: true,
      baselinkerSyncedAt: true,
    },
    orderBy: { baselinkerSyncedAt: 'desc' },
    take: 10,
  });

  console.log(`\n✅ Ostatnie zsynchronizowane zamówienia (${syncedOrders.length}):`);
  for (const order of syncedOrders) {
    console.log(`   ${order.orderNumber} → BL#${order.baselinkerOrderId} | ${order.baselinkerSyncedAt?.toISOString()}`);
  }

  // 4. Sprawdź konfigurację Baselinkera
  const config = await prisma.baselinkerConfig.findFirst({
    select: {
      syncEnabled: true,
      inventoryId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log('\n⚙️ Konfiguracja Baselinkera:');
  if (config) {
    console.log(`   Sync enabled: ${config.syncEnabled}`);
    console.log(`   Inventory ID: ${config.inventoryId}`);
    console.log(`   Updated: ${config.updatedAt?.toISOString()}`);
  } else {
    console.log('   ❌ BRAK KONFIGURACJI BASELINKERA!');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
