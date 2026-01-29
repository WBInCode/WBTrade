const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  // Check for specific order
  const specificOrder = await p.order.findFirst({
    where: { orderNumber: { contains: 'MKYMVNL9' } },
    include: { items: true, shippingAddress: true }
  });
  
  if (specificOrder) {
    console.log('=== Order WB-MKYMVNL9-JVCV ===');
    console.log(JSON.stringify(specificOrder, null, 2));
  } else {
    console.log('Order WB-MKYMVNL9-JVCV not found');
  }
  
  // Also check unsynced orders
  const orders = await p.order.findMany({
    where: { paymentStatus: 'PAID', baselinkerOrderId: null },
    select: { 
      id: true, 
      orderNumber: true, 
      status: true, 
      paymentStatus: true, 
      createdAt: true, 
      total: true, 
      shippingMethod: true, 
      paymentMethod: true 
    }
  });
  
  console.log('\n=== Unsynced PAID orders ===');
  orders.forEach(x => console.log(JSON.stringify(x, null, 2)));
  
  await p.$disconnect();
}

check().catch(console.error);
