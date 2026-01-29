/**
 * Skrypt naprawczy dla zamówienia WB-MKYMVNL9-JVCV
 * 
 * Problem: Zamówienie ma paymentStatus: PENDING ale klient zapłacił
 * Rozwiązanie: 
 * 1. Zmień paymentStatus na PAID
 * 2. Zsynchronizuj z Baselinker
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Import baselinker service - must run in context with ts-node
// For now, we'll just update the DB and sync can be done via admin panel

async function fixOrder(orderNumber) {
  console.log(`\n=== Fixing order ${orderNumber} ===\n`);
  
  // 1. Find order
  const order = await p.order.findFirst({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      baselinkerOrderId: true,
      total: true,
    },
  });
  
  if (!order) {
    console.log(`Order ${orderNumber} not found!`);
    return;
  }
  
  console.log('Current state:');
  console.log(`  Order ID: ${order.id}`);
  console.log(`  Status: ${order.status}`);
  console.log(`  Payment Status: ${order.paymentStatus}`);
  console.log(`  Baselinker ID: ${order.baselinkerOrderId || 'NOT SYNCED'}`);
  console.log(`  Total: ${order.total} PLN`);
  
  if (order.paymentStatus === 'PAID') {
    console.log('\n⚠️  Order already has paymentStatus: PAID');
    
    if (!order.baselinkerOrderId) {
      console.log('   But it is NOT synced to Baselinker!');
      console.log('   Go to Admin Panel -> Baselinker -> Orders and sync it manually');
    }
    return;
  }
  
  // 2. Update payment status to PAID
  console.log('\n📝 Updating paymentStatus to PAID...');
  
  await p.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      status: 'CONFIRMED', // Also update order status
    },
  });
  
  // 3. Add to order history
  await p.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: 'CONFIRMED',
      note: 'Ręczna korekta statusu płatności - webhook PayU nie dotarł',
    },
  });
  
  console.log('✅ Order updated successfully!');
  console.log('\n📦 Next steps:');
  console.log('   1. Go to Admin Panel -> Baselinker');
  console.log('   2. Find the order and click "Sync to Baselinker"');
  console.log('   OR use API endpoint:');
  console.log(`   POST /api/admin/baselinker/orders/${order.id}/sync`);
  
  await p.$disconnect();
}

// Run the fix
const orderNumber = process.argv[2] || 'WB-MKYMVNL9-JVCV';
fixOrder(orderNumber).catch(console.error);
