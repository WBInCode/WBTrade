const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const order = await p.order.findFirst({
    where: { orderNumber: 'WB-MOBR2013-FV00' },
    select: {
      id: true,
      orderNumber: true,
      wantInvoice: true,
      billingNip: true,
      billingCompanyName: true,
      isBusinessOrder: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
      guestEmail: true,
      userId: true,
      baselinkerOrderId: true,
      billingAddress: true,
    }
  });
  console.log(JSON.stringify(order, null, 2));
  await p.$disconnect();
}
main();
