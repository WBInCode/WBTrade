const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cart = await prisma.cart.findUnique({
    where: { userId: 'cmkdqu6zp0000sl87whyy5oyz' },
    include: { items: { include: { variant: true } } }
  });
  
  console.log('=== Your Cart ===');
  console.log('Cart ID:', cart.id);
  console.log('Coupon Code:', cart.couponCode);
  console.log('Items:', cart.items.length);
  
  if (cart.items.length > 0) {
    let subtotal = 0;
    cart.items.forEach(item => {
      const itemTotal = Number(item.variant.price) * item.quantity;
      subtotal += itemTotal;
      console.log('- Item:', item.variant.sku || item.variant.id, 'Price:', item.variant.price, 'x', item.quantity, '=', itemTotal);
    });
    console.log('Subtotal:', subtotal);
    
    if (cart.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: cart.couponCode } });
      if (coupon) {
        console.log('Coupon:', coupon.code, 'Type:', coupon.type, 'Value:', coupon.value);
        const discount = coupon.type === 'PERCENTAGE' 
          ? subtotal * Number(coupon.value) / 100 
          : Number(coupon.value);
        console.log('Discount:', discount);
        console.log('Total after discount:', subtotal - discount);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
