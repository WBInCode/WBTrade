/**
 * Skrypt do aktualizacji opłaconych zamówień w Baselinkerze
 * Ustawia prawidłowy status i kwotę płatności dla zamówień które są PAID
 */

import { prisma } from './src/db';
import { baselinkerOrdersService } from './src/services/baselinker-orders.service';

async function main() {
  console.log('🔄 Aktualizacja opłaconych zamówień w Baselinkerze\n');

  // Znajdź wszystkie opłacone zamówienia które mają baselinkerOrderId
  const paidOrders = await prisma.order.findMany({
    where: {
      paymentStatus: 'PAID',
      baselinkerOrderId: { not: null },
    },
    select: {
      id: true,
      orderNumber: true,
      baselinkerOrderId: true,
      total: true,
      paymentMethod: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`📦 Znaleziono ${paidOrders.length} opłaconych zamówień z BL ID\n`);

  let updated = 0;
  let failed = 0;

  for (const order of paidOrders) {
    console.log(`\n📋 ${order.orderNumber} (BL#${order.baselinkerOrderId})`);
    console.log(`   Kwota: ${order.total} PLN | Metoda: ${order.paymentMethod}`);

    try {
      const result = await baselinkerOrdersService.markOrderAsPaid(order.id);
      
      if (result.success) {
        console.log(`   ✅ Zaktualizowano w Baselinkerze`);
        updated++;
      } else {
        console.log(`   ⚠️ Błąd: ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ Wyjątek: ${error}`);
      failed++;
    }

    // Opóźnienie żeby nie przekroczyć limitu API
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Zaktualizowano: ${updated}`);
  console.log(`❌ Błędy: ${failed}`);
  console.log('='.repeat(50));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
