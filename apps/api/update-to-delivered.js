const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateToDelivered() {
  const orders = ['WB-MKZIFRKY-1SU5', 'WB-MKZH84B6-8KFM'];
  
  for (const orderNumber of orders) {
    const result = await prisma.order.update({
      where: { orderNumber },
      data: { 
        status: 'DELIVERED',
        updatedAt: new Date()
      }
    });
    console.log(`✅ ${orderNumber} -> DELIVERED`);
  }
  
  await prisma.$disconnect();
}

updateToDelivered();
