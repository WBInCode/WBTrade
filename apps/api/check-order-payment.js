const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderNumber: 'WB-MKYMVNL9-JVCV' },
    include: { 
      statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 }
    }
  });

  console.log('=== ZAMÓWIENIE WB-MKYMVNL9-JVCV ===');
  console.log('ID:', order.id);
  console.log('paymentStatus:', order.paymentStatus);
  console.log('status:', order.status);
  console.log('baselinkerOrderId:', order.baselinkerOrderId);
  console.log('total:', order.total);
  
  // Check payment sessions
  const paymentSessions = await prisma.paymentSession.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n=== SESJE PŁATNOŚCI ===');
  if (paymentSessions.length === 0) {
    console.log('Brak sesji płatności!');
  } else {
    paymentSessions.forEach(p => {
      console.log('- Status:', p.status);
      console.log('  Amount:', p.amount);
      console.log('  Provider ID:', p.providerPaymentId);
      console.log('  Created:', p.createdAt);
      console.log('  Updated:', p.updatedAt);
    });
  }
  
  console.log('\n=== HISTORIA STATUSÓW ===');
  order.statusHistory.forEach(h => {
    console.log('-', h.status, '|', h.note);
  });
}

main().finally(() => prisma.$disconnect());
