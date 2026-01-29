/**
 * Synchronize all pending orders to Baselinker
 * Run: npx tsx scripts/sync-pending-orders.ts
 */

import { prisma } from '../src/db';
import { baselinkerOrdersService } from '../src/services/baselinker-orders.service';

async function main() {
  console.log('🔄 Pobieranie zamówień bez synchronizacji do Baselinker...\n');

  const orders = await prisma.order.findMany({
    where: { baselinkerOrderId: null },
    select: { 
      id: true, 
      orderNumber: true, 
      paymentStatus: true, 
      status: true, 
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📦 Znaleziono ${orders.length} zamówień do synchronizacji:\n`);

  for (const order of orders) {
    console.log('-----------------------------------');
    console.log(`📋 ${order.orderNumber}`);
    console.log(`   Status: ${order.status} | Płatność: ${order.paymentStatus} | Kwota: ${order.total} PLN`);
    console.log(`   Data: ${order.createdAt.toISOString()}`);

    try {
      const result = await baselinkerOrdersService.syncOrderToBaselinker(order.id, { force: true });
      
      if (result.success) {
        console.log(`   ✅ Zsynchronizowano! Baselinker ID: ${result.baselinkerOrderId}`);
      } else {
        console.log(`   ❌ Błąd: ${result.error}`);
      }
    } catch (err) {
      console.log(`   ❌ Wyjątek: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log('\n===================================');
  console.log('✨ Synchronizacja zakończona!');

  // Verify results
  const synced = await prisma.order.count({
    where: { baselinkerOrderId: { not: null } }
  });
  const notSynced = await prisma.order.count({
    where: { baselinkerOrderId: null }
  });

  console.log(`\n📊 Podsumowanie:`);
  console.log(`   Zsynchronizowane: ${synced}`);
  console.log(`   Niezsynchronizowane: ${notSynced}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
