/**
 * SEED: Testowe zamówienie opóźnione (TYLKO DO TESTÓW LOKALNYCH)
 *
 * Tworzy testowe zamówienie z datą dostawy w przeszłości,
 * które natychmiast wyzwoli alert opóźnienia dostawy.
 *
 * Zamówienie jest wyraźnie oznaczone jako testowe:
 * - orderNumber: TEST-000-000-000
 * - Wszystkie dane osobowe: "Test"
 * - Numery: 000
 * - internalNotes: [TEST] Zamówienie testowe — nie wysyłać
 *
 * Uruchomienie:
 *   cd apps/api
 *   npx ts-node prisma/seed-test-delay-order.ts
 *
 * Usuwanie:
 *   npx ts-node prisma/seed-test-delay-order.ts --cleanup
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_ORDER_NUMBER = 'TEST-000-000-000';

async function cleanup() {
  console.log('🧹 Usuwanie testowego zamówienia...');

  const order = await prisma.order.findUnique({
    where: { orderNumber: TEST_ORDER_NUMBER },
  });

  if (!order) {
    console.log('ℹ️  Nie znaleziono testowego zamówienia — brak danych do usunięcia.');
    return;
  }

  // Usuwanie alertów opóźnień powiązanych z zamówieniem
  await prisma.deliveryDelayAlert.deleteMany({ where: { orderId: order.id } });
  // Usuwanie ticketów supportu powiązanych z zamówieniem
  const tickets = await prisma.supportTicket.findMany({ where: { orderId: order.id }, select: { id: true } });
  for (const t of tickets) {
    await prisma.supportMessage.deleteMany({ where: { ticketId: t.id } });
  }
  await prisma.supportTicket.deleteMany({ where: { orderId: order.id } });
  // Usuwanie powiadomień użytkownika powiązanych z zamówieniem
  if (order.userId) {
    await prisma.userNotification.deleteMany({
      where: { userId: order.userId, type: 'delivery_delay' },
    });
  }
  // Usuwanie historii statusów
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
  // Usuwanie pozycji zamówienia
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  // Usuwanie zamówienia
  await prisma.order.delete({ where: { id: order.id } });

  // Usuwanie testowego adresu
  await prisma.address.deleteMany({
    where: {
      firstName: 'Test',
      lastName: 'Test',
      street: 'Testowa 000',
      city: 'Testowo',
    },
  });

  console.log('✅ Testowe zamówienie i powiązane dane usunięte.');
}

async function seed() {
  console.log('🧪 Tworzenie testowego zamówienia opóźnionego...');
  console.log('⚠️  To zamówienie jest WYŁĄCZNIE do testów lokalnych — nie trafia do żadnego zewnętrznego systemu.\n');

  // Sprawdź czy już istnieje
  const existing = await prisma.order.findUnique({
    where: { orderNumber: TEST_ORDER_NUMBER },
  });
  if (existing) {
    console.log(`⚠️  Zamówienie ${TEST_ORDER_NUMBER} już istnieje. Najpierw uruchom z --cleanup.`);
    return;
  }

  // Znajdź konto testowe
  const testUser = await prisma.user.findUnique({
    where: { email: 'testowywbtrade@gmail.com' },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!testUser) {
    console.error('❌ Brak konta testowywbtrade@gmail.com w bazie.');
    return;
  }

  // Znajdź istniejący wariant dla OrderItem (wymagany przez relację)
  const anyVariant = await prisma.productVariant.findFirst({
    select: { id: true, sku: true, name: true, price: true, productId: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!anyVariant) {
    console.error('❌ Brak wariantów produktów w bazie. Najpierw uruchom seed produktów.');
    return;
  }

  // Pobierz nazwę produktu
  const product = await prisma.product.findUnique({
    where: { id: anyVariant.productId },
    select: { name: true },
  });
  const productName = product?.name || 'Produkt testowy';

  // Utwórz testowy adres
  const testAddress = await prisma.address.create({
    data: {
      firstName: 'Test',
      lastName: 'Test',
      street: 'Testowa 000',
      city: 'Testowo',
      postalCode: '00-000',
      country: 'PL',
      phone: '000000000',
      type: 'SHIPPING',
    },
  });

  // Data dostawy: wczoraj (gwarantuje natychmiastowe wykrycie opóźnienia)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(12, 0, 0, 0);

  // Utwórz zamówienie testowe — przypisane do konta
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: TEST_ORDER_NUMBER,
      userId: testUser.id,
      status: 'PROCESSING',
      shippingMethod: 'Kurier DPD',
      paymentMethod: 'Test — brak płatności',
      paymentStatus: 'PAID',
      subtotal: 0,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      shippingAddressId: testAddress.id,
      billingAddressId: testAddress.id,
      estimatedDeliveryDate: yesterday,
      internalNotes: '[TEST] Zamówienie testowe do weryfikacji alertu opóźnienia dostawy — NIE WYSYŁAĆ, NIE REALIZOWAĆ',
      customerNotes: 'ZAMÓWIENIE TESTOWE 000',
      items: {
        create: {
          variantId: anyVariant.id,
          productName: `[TEST] ${productName}`,
          variantName: `[TEST] ${anyVariant.name}`,
          sku: `TEST-000-${anyVariant.sku}`,
          quantity: 1,
          unitPrice: 0,
          total: 0,
        },
      },
      statusHistory: {
        create: {
          status: 'PROCESSING',
          note: '[TEST] Zamówienie testowe utworzone automatycznie do testów alertu opóźnienia',
        },
      },
    },
  });

  // Utwórz alert opóźnienia od razu (status: pending)
  const alert = await prisma.deliveryDelayAlert.create({
    data: {
      orderId: testOrder.id,
      status: 'pending',
    },
  });

  console.log('✅ Testowe zamówienie utworzone pomyślnie!\n');
  console.log('📋 Podsumowanie:');
  console.log(`   Numer zamówienia:    ${TEST_ORDER_NUMBER}`);
  console.log(`   ID zamówienia:       ${testOrder.id}`);
  console.log(`   Status:              PROCESSING`);
  console.log(`   Planowana dostawa:   ${yesterday.toLocaleDateString('pl-PL')} (WCZORAJ — opóźnione)`);
  console.log(`   Klient:              ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);
  console.log(`   ID alertu:           ${alert.id}`);
  console.log(`   Status alertu:       pending`);
  console.log('');
  console.log('🔔 Alert powinien być widoczny w panelu admina:');
  console.log('   http://localhost:3001/delivery-delays');
  console.log('');
  console.log('🧹 Aby usunąć testowe dane:');
  console.log('   npx ts-node prisma/seed-test-delay-order.ts --cleanup');
}

async function main() {
  const isCleanup = process.argv.includes('--cleanup');

  try {
    if (isCleanup) {
      await cleanup();
    } else {
      await seed();
    }
  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
