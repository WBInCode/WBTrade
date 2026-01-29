const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const order = await p.order.findUnique({
    where: { id: 'cmkz1vld90004b16020lo1hhm' },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      guestEmail: true,
      guestFirstName: true,
      paymentStatus: true,
      status: true
    }
  });
  console.log('Order:', JSON.stringify(order, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
