const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Remove coupon from your cart
  const updated = await prisma.cart.update({
    where: { userId: 'cmkdqu6zp0000sl87whyy5oyz' },
    data: { couponCode: null }
  });
  
  console.log('✅ Removed coupon from cart:', updated.id);
  console.log('Coupon is now:', updated.couponCode);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
