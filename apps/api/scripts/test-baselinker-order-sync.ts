/**
 * Test Baselinker Order Sync
 * 
 * Skrypt do testowania synchronizacji zamówień do Baselinkera.
 * 
 * Użycie:
 *   npx ts-node scripts/test-baselinker-order-sync.ts
 *   npx ts-node scripts/test-baselinker-order-sync.ts <orderId>
 */

import { prisma } from '../src/db';
import { baselinkerOrdersService } from '../src/services/baselinker-orders.service';

async function main() {
  const orderId = process.argv[2];

  console.log('🔍 Sprawdzam stan zamówień w bazie...\n');

  // 1. Pokaż statystyki
  const stats = await prisma.order.groupBy({
    by: ['paymentStatus'],
    _count: true,
  });
  console.log('📊 Zamówienia wg statusu płatności:');
  stats.forEach(s => console.log(`   ${s.paymentStatus}: ${s._count}`));

  // 2. Zamówienia opłacone, niezsynchronizowane
  const paidNotSynced = await prisma.order.findMany({
    where: {
      paymentStatus: 'PAID',
      baselinkerOrderId: null,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`\n📦 Opłacone zamówienia BEZ sync do Baselinkera (${paidNotSynced.length}):`);
  paidNotSynced.forEach(o => {
    console.log(`   ${o.orderNumber} | ${o.status} | ${o.total} PLN | ${o.id}`);
  });

  // 3. Zamówienia już zsynchronizowane
  const synced = await prisma.order.findMany({
    where: {
      baselinkerOrderId: { not: null },
    },
    select: {
      id: true,
      orderNumber: true,
      baselinkerOrderId: true,
      baselinkerSyncedAt: true,
    },
    orderBy: { baselinkerSyncedAt: 'desc' },
    take: 5,
  });

  console.log(`\n✅ Zamówienia już zsynchronizowane (${synced.length}):`);
  synced.forEach(o => {
    console.log(`   ${o.orderNumber} → BL#${o.baselinkerOrderId} | ${o.baselinkerSyncedAt}`);
  });

  // 4. Zamówienia OPEN/PENDING (do testu symulacji płatności)
  const openOrders = await prisma.order.findMany({
    where: {
      status: { in: ['OPEN', 'PENDING'] },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      total: true,
    },
    take: 5,
  });

  console.log(`\n⏳ Otwarte zamówienia (można symulować płatność) (${openOrders.length}):`);
  openOrders.forEach(o => {
    console.log(`   ${o.orderNumber} | ${o.status} | ${o.paymentStatus} | ${o.id}`);
  });

  // 5. Jeśli podano orderId - spróbuj zsynchronizować
  if (orderId) {
    console.log(`\n🚀 Synchronizuję zamówienie ${orderId} do Baselinkera...`);
    
    // Sprawdź czy zamówienie istnieje
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, paymentStatus: true, baselinkerOrderId: true },
    });

    if (!order) {
      console.log('❌ Zamówienie nie znalezione!');
      return;
    }

    console.log(`   Zamówienie: ${order.orderNumber}`);
    console.log(`   Status płatności: ${order.paymentStatus}`);
    console.log(`   Już zsync: ${order.baselinkerOrderId || 'NIE'}`);

    if (order.paymentStatus !== 'PAID') {
      console.log('\n⚠️  Zamówienie nie jest opłacone! Sync wymaga paymentStatus=PAID');
      console.log('   Użyj force=true aby wymusić (niezalecane)');
      
      const result = await baselinkerOrdersService.syncOrderToBaselinker(orderId, { force: false });
      console.log('\n📤 Wynik:', result);
      return;
    }

    const result = await baselinkerOrdersService.syncOrderToBaselinker(orderId, { force: true });
    
    if (result.success) {
      console.log(`\n✅ Sukces! Zamówienie zsynchronizowane`);
      console.log(`   Baselinker Order ID: ${result.baselinkerOrderId}`);
      console.log('\n🎉 Sprawdź teraz w panelu Baselinkera czy zamówienie się pojawiło!');
    } else {
      console.log(`\n❌ Błąd synchronizacji: ${result.error}`);
    }
  } else {
    console.log('\n💡 Aby zsynchronizować zamówienie:');
    console.log('   npx ts-node scripts/test-baselinker-order-sync.ts <orderId>');
    console.log('\n💡 Aby zsynchronizować wszystkie opłacone:');
    console.log('   Wywołaj POST /api/admin/baselinker/orders/sync');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
