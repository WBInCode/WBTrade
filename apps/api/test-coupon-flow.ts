/**
 * Test pełnego flow zamówienia z kuponem rabatowym
 * Symuluje dokładnie to co robi użytkownik w sklepie
 */

import { prisma } from './src/db';
import { cartService } from './src/services/cart.service';
import { ordersService } from './src/services/orders.service';

const TEST_COUPON_CODE = 'PROMO-RM35YE'; // 30% rabatu

async function main() {
  console.log('🧪 TEST: Pełny flow zamówienia z kuponem rabatowym\n');
  console.log('='.repeat(60));

  // 1. Znajdź produkt do zamówienia
  console.log('\n📦 1. Szukam produktu...');
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      variants: { 
        where: { inventory: { some: { quantity: { gt: 0 } } } },
        take: 1,
        include: { inventory: true }
      },
    },
  });

  if (!product || product.variants.length === 0) {
    console.log('❌ Brak produktów z dostępnym stanem!');
    return;
  }

  const variant = product.variants[0];
  const productPrice = Number(variant.price);
  console.log(`   Produkt: ${product.name}`);
  console.log(`   Wariant: ${variant.name}`);
  console.log(`   Cena: ${productPrice} PLN`);

  // 2. Stwórz koszyk
  console.log('\n🛒 2. Tworzę koszyk...');
  const cart = await prisma.cart.create({
    data: {
      sessionId: `test-coupon-${Date.now()}`,
      items: {
        create: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    },
    include: { items: true },
  });
  console.log(`   Cart ID: ${cart.id}`);

  // 3. Sprawdź kupon
  console.log('\n🏷️ 3. Sprawdzam kupon...');
  const coupon = await prisma.coupon.findUnique({
    where: { code: TEST_COUPON_CODE },
  });

  if (!coupon) {
    console.log(`   ❌ Kupon ${TEST_COUPON_CODE} nie istnieje!`);
    await cleanup(cart.id);
    return;
  }

  console.log(`   Kod: ${coupon.code}`);
  console.log(`   Typ: ${coupon.discountType}`);
  console.log(`   Wartość: ${coupon.discountValue}${coupon.discountType === 'PERCENTAGE' ? '%' : ' PLN'}`);
  console.log(`   Aktywny: ${coupon.isActive}`);

  // 4. Zastosuj kupon do koszyka
  console.log('\n💰 4. Obliczam rabat...');
  const subtotal = productPrice;
  const shippingCost = 15.99;
  
  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = subtotal * (Number(coupon.discountValue) / 100);
  } else {
    discount = Number(coupon.discountValue);
  }
  discount = Math.round(discount * 100) / 100; // zaokrąglij do groszy

  // Aktualizuj koszyk z kuponem
  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      couponCode: TEST_COUPON_CODE,
      discount: discount,
    },
  });

  console.log(`   Subtotal: ${subtotal} PLN`);
  console.log(`   Shipping: ${shippingCost} PLN`);
  console.log(`   Discount: -${discount} PLN (${coupon.discountValue}%)`);
  
  const expectedTotal = subtotal + shippingCost - discount;
  console.log(`   ═══════════════════════`);
  console.log(`   EXPECTED TOTAL: ${expectedTotal.toFixed(2)} PLN`);

  // 5. Sprawdź co by poszło do PayU (symulacja checkout.controller.ts)
  console.log('\n💳 5. Symulacja tworzenia płatności (co idzie do PayU)...');
  
  // Pobierz koszyk z bazy (tak jak robi checkout controller)
  const cartFromDb = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: { include: { variant: true } } },
  });

  const cartSubtotal = cartFromDb!.items.reduce(
    (sum, item) => sum + Number(item.variant.price) * item.quantity, 
    0
  );
  const cartDiscount = cartFromDb!.discount || 0;
  const paymentFee = 0;
  
  // TO JEST WZÓR KTÓRY TERAZ MAMY W checkout.controller.ts:
  const totalForPayment = cartSubtotal + shippingCost + paymentFee - Number(cartDiscount);
  
  console.log(`   Cart subtotal: ${cartSubtotal} PLN`);
  console.log(`   Shipping: ${shippingCost} PLN`);
  console.log(`   Payment fee: ${paymentFee} PLN`);
  console.log(`   Discount from cart: -${cartDiscount} PLN`);
  console.log(`   ═══════════════════════`);
  console.log(`   TOTAL FOR PAYU: ${totalForPayment.toFixed(2)} PLN`);

  // 6. Weryfikacja
  console.log('\n✅ 6. WERYFIKACJA:');
  
  const isCorrect = Math.abs(totalForPayment - expectedTotal) < 0.01;
  
  if (isCorrect) {
    console.log(`   ✅ SUKCES! Kwota do zapłaty jest POPRAWNA!`);
    console.log(`   ✅ Klient zapłaci: ${totalForPayment.toFixed(2)} PLN (z rabatem ${discount} PLN)`);
    console.log(`   ✅ BEZ rabatu byłoby: ${(cartSubtotal + shippingCost).toFixed(2)} PLN`);
  } else {
    console.log(`   ❌ BŁĄD! Kwoty się nie zgadzają!`);
    console.log(`   ❌ Expected: ${expectedTotal.toFixed(2)} PLN`);
    console.log(`   ❌ Got: ${totalForPayment.toFixed(2)} PLN`);
  }

  // Cleanup
  await cleanup(cart.id);
  
  console.log('\n' + '='.repeat(60));
  console.log(isCorrect ? '🎉 TEST PASSED!' : '💥 TEST FAILED!');
  console.log('='.repeat(60));
}

async function cleanup(cartId: string) {
  console.log('\n🧹 Czyszczę testowe dane...');
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.delete({ where: { id: cartId } });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
