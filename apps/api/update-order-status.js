const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateOrder() {
  try {
    // Update order status to DELIVERED
    const order = await prisma.order.update({
      where: { orderNumber: 'WB-MLAOGLA7-FV00' },
      data: { 
        status: 'DELIVERED'
      }
    });
    
    // Add status history entry for DELIVERED
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'DELIVERED',
        note: 'Zamówienie dostarczone (test)'
      }
    });
    
    console.log('Updated:', order.orderNumber);
    console.log('Status:', order.status);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateOrder();
