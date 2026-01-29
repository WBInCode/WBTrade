const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking carts with coupons ===');
  
  const carts = await prisma.cart.findMany({
    where: { couponCode: { not: null } },
    select: { id: true, userId: true, sessionId: true, couponCode: true }
  });
  console.log('Carts with coupons:', JSON.stringify(carts, null, 2));
  
  console.log('\n=== Recent carts ===');
  const recentCarts = await prisma.cart.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { id: true, userId: true, sessionId: true, couponCode: true, updatedAt: true }
  });
  console.log('Recent carts:', JSON.stringify(recentCarts, null, 2));
  
  console.log('\n=== Checking coupons with 30% value ===');
  const coupons = await prisma.coupon.findMany({
    where: { value: 30 },
    select: { id: true, code: true, value: true, type: true, isActive: true }
  });
  console.log('30% coupons:', JSON.stringify(coupons, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
