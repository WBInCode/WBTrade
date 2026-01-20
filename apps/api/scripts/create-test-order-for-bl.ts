/**
 * Create Test Order for Baselinker Sync Testing
 * 
 * Tworzy testowe zamówienie i opcjonalnie symuluje płatność + sync do Baselinkera.
 * 
 * Użycie:
 *   npx ts-node scripts/create-test-order-for-bl.ts
 *   npx ts-node scripts/create-test-order-for-bl.ts --pay  (od razu opłać i sync)
 */

import { prisma } from '../src/db';
import { baselinkerOrdersService } from '../src/services/baselinker-orders.service';

async function main() {
  const shouldPay = process.argv.includes('--pay');

  console.log('🛒 Tworzę testowe zamówienie dla testu Baselinker sync...\n');

  // 1. Znajdź produkt z Baselinkera do zamówienia
  const product = await prisma.product.findFirst({
    where: {
      baselinkerProductId: { not: null },
      status: 'ACTIVE',
    },
    include: {
      variants: {
        take: 1,
        include: {
          inventory: true,
        },
      },
    },
  });

  if (!product || product.variants.length === 0) {
    console.log('❌ Nie znaleziono produktu z Baselinkera!');
    console.log('   Najpierw zsynchronizuj produkty z Baselinkera.');
    return;
  }

  const variant = product.variants[0];
  console.log(`📦 Produkt: ${product.name}`);
  console.log(`   Baselinker ID: ${product.baselinkerProductId}`);
  console.log(`   Wariant: ${variant.name} (${variant.id})`);
  console.log(`   Cena: ${variant.price} PLN`);
  console.log(`   Stan: ${variant.inventory[0]?.quantity || 0} szt.`);

  // 2. Znajdź lub stwórz testowego użytkownika
  let testUser = await prisma.user.findFirst({
    where: { email: 'test-baselinker@wbtrade.pl' },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'test-baselinker@wbtrade.pl',
        password: '$2b$10$test', // nie używany
        firstName: 'Test',
        lastName: 'Baselinker',
        phone: '+48123456789',
        role: 'CUSTOMER',
      },
    });
    console.log('\n👤 Utworzono testowego użytkownika');
  }

  // 3. Stwórz adres dostawy
  let address = await prisma.address.findFirst({
    where: { userId: testUser.id },
  });

  if (!address) {
    address = await prisma.address.create({
      data: {
        userId: testUser.id,
        firstName: 'Test',
        lastName: 'Baselinker',
        street: 'ul. Testowa 123',
        city: 'Warszawa',
        postalCode: '00-001',
        country: 'PL',
        phone: '+48123456789',
        isDefault: true,
        type: 'SHIPPING',
      },
    });
    console.log('📍 Utworzono adres dostawy');
  }

  // 4. Stwórz zamówienie
  const orderNumber = `TEST-BL-${Date.now().toString(36).toUpperCase()}`;
  const unitPrice = Number(variant.price);
  const quantity = 1;
  const subtotal = unitPrice * quantity;
  const shipping = 15.99;
  const total = subtotal + shipping;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: testUser.id,
      status: 'OPEN',
      paymentStatus: 'PENDING',
      shippingAddressId: address.id,
      shippingMethod: 'inpost_paczkomat',
      paymentMethod: 'payu',
      subtotal,
      shipping,
      tax: 0,
      total,
      customerNotes: 'Testowe zamówienie dla testu Baselinker sync',
      items: {
        create: {
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name || 'Default',
          sku: variant.sku || product.sku,
          quantity,
          unitPrice,
          total: unitPrice * quantity,
        },
      },
      statusHistory: {
        create: {
          status: 'OPEN',
          note: 'Testowe zamówienie utworzone',
        },
      },
    },
    include: {
      items: true,
    },
  });

  console.log(`\n✅ Zamówienie utworzone!`);
  console.log(`   Numer: ${order.orderNumber}`);
  console.log(`   ID: ${order.id}`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Płatność: ${order.paymentStatus}`);
  console.log(`   Suma: ${order.total} PLN`);

  // 5. Opcjonalnie - symuluj płatność i sync
  if (shouldPay) {
    console.log('\n💳 Symuluję płatność...');
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'CONFIRMED',
        note: '[TEST] Płatność zasymulowana',
      },
    });

    console.log('   ✅ Płatność zasymulowana (status: PAID)');

    console.log('\n🚀 Synchronizuję do Baselinkera...');
    const result = await baselinkerOrdersService.syncOrderToBaselinker(order.id);

    if (result.success) {
      console.log(`   ✅ Sukces! Baselinker Order ID: ${result.baselinkerOrderId}`);
      console.log('\n🎉 Sprawdź teraz w panelu Baselinkera:');
      console.log('   https://panel.baselinker.com/orders.html');
      console.log('\n   Zamówienie powinno się tam pojawić i stan magazynowy');
      console.log('   produktu powinien zostać zmniejszony o 1 szt.!');
    } else {
      console.log(`   ❌ Błąd: ${result.error}`);
    }
  } else {
    console.log('\n💡 Następne kroki:');
    console.log('   1. Zasymuluj płatność w panelu admina, LUB');
    console.log('   2. Uruchom ponownie z --pay:');
    console.log(`      npx ts-node scripts/create-test-order-for-bl.ts --pay`);
    console.log('   3. Lub ręcznie:');
    console.log(`      npx ts-node scripts/test-baselinker-order-sync.ts ${order.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
