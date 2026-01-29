const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Cleaning up stuck coupons from carts ===\n');
  
  // Find all carts with coupons
  const cartsWithCoupons = await prisma.cart.findMany({
    where: { couponCode: { not: null } },
    select: { id: true, userId: true, sessionId: true, couponCode: true }
  });
  
  console.log(`Found ${cartsWithCoupons.length} carts with stuck coupons:`);
  cartsWithCoupons.forEach(cart => {
    console.log(`  - Cart ${cart.id}: coupon=${cart.couponCode}, userId=${cart.userId || 'guest'}`);
  });
  
  // Clear all coupons from carts
  const result = await prisma.cart.updateMany({
    where: { couponCode: { not: null } },
    data: { couponCode: null }
  });
  
  console.log(`\n✅ Cleared coupons from ${result.count} carts`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
