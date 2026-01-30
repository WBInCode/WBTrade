const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetToDelivered() {
  const orderNumber = 'WB-MKZIFRKY-1SU5';
  
  const result = await prisma.order.update({
    where: { orderNumber },
    data: { 
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      refundNumber: null,
      refundReason: null,
      refundRequestedAt: null,
      updatedAt: new Date()
    }
  });
  
  console.log(`✅ ${orderNumber} -> DELIVERED (reset dla testu zwrotu)`);
  
  await prisma.$disconnect();
}

resetToDelivered();
