/**
 * Test PayU Payment Methods - Create Test Orders
 * 
 * This script creates 4 test orders with different payment methods
 * and simulates PayU webhooks to test how payment methods appear in Baselinker.
 * 
 * Usage: npx tsx scripts/test-payment-methods-orders.ts
 */

import { randomUUID, randomInt } from 'crypto';
import { config } from 'dotenv';
config();

import { prisma } from '../src/db';
import { paymentService } from '../src/services/payment.service';
import { baselinkerOrdersService } from '../src/services/baselinker-orders.service';

// Test payment methods to simulate
const TEST_PAYMENT_METHODS = [
  {
    name: 'BLIK',
    payuType: 'BLIK',
    payuValue: undefined,
    expectedInBaselinker: 'BLIK',
  },
  {
    name: 'Karta płatnicza',
    payuType: 'CARD_TOKEN',
    payuValue: 'TOK_XXXX1234',
    expectedInBaselinker: 'Karta płatnicza',
  },
  {
    name: 'Google Pay',
    payuType: 'GPAY',
    payuValue: undefined,
    expectedInBaselinker: 'Google Pay',
  },
  {
    name: 'Przelew bankowy (mBank)',
    payuType: 'PBL',
    payuValue: 'm',
    expectedInBaselinker: 'Przelew mBank',
  },
];

async function getTestUser() {
  // Find or create a test user
  let user = await prisma.user.findFirst({
    where: { email: 'test-payment@example.com' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test-payment@example.com',
        firstName: 'Test',
        lastName: 'Payment',
        password: 'test-password-not-used',
      },
    });
    console.log('Created test user:', user.id);
  }

  return user;
}

async function getOrCreateTestAddress(userId: string) {
  let address = await prisma.address.findFirst({
    where: { userId, isDefault: true },
  });

  if (!address) {
    address = await prisma.address.create({
      data: {
        userId,
        firstName: 'Jan',
        lastName: 'Testowy',
        street: 'ul. Testowa 123',
        city: 'Warszawa',
        postalCode: '00-001',
        country: 'PL',
        phone: '+48123456789',
        isDefault: true,
      },
    });
    console.log('Created test address:', address.id);
  }

  return address;
}

async function getTestProduct() {
  // Find any product with price > 0
  const variant = await prisma.productVariant.findFirst({
    where: {
      price: { gt: 0 },
    },
    include: {
      product: true,
    },
  });

  if (!variant) {
    throw new Error('No products found. Please sync products first.');
  }

  return variant;
}

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const random = randomInt(10000).toString().padStart(4, '0');
  return `TEST-${year}-${random}`;
}

async function createTestOrder(
  user: any,
  address: any,
  variant: any,
  paymentMethod: string
) {
  const orderNumber = generateOrderNumber();
  const price = Number(variant.price);
  const shipping = 14.99;
  const total = price + shipping;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: user.id,
      shippingAddressId: address.id,
      billingAddressId: address.id,
      shippingMethod: 'inpost_kurier',
      paymentMethod: paymentMethod, // Will be updated by webhook
      subtotal: price,
      shipping: shipping,
      tax: 0,
      total: total,
      status: 'OPEN',
      paymentStatus: 'PENDING',
      items: {
        create: [
          {
            variantId: variant.id,
            productName: variant.product.name,
            variantName: variant.name || 'Domyślny',
            sku: variant.sku,
            quantity: 1,
            unitPrice: price,
            total: price,
          },
        ],
      },
    },
    include: {
      items: true,
      user: true,
      shippingAddress: true,
    },
  });

  console.log(`  Created order: ${order.orderNumber} (${order.id})`);
  return order;
}

async function simulatePayUWebhook(
  orderId: string,
  payuOrderId: string,
  payMethod: { type: string; value?: string },
  amount: number
) {
  // Simulate the webhook payload that PayU would send
  const webhookPayload = {
    order: {
      orderId: payuOrderId,
      extOrderId: `${orderId}_${Date.now()}`,
      orderCreateDate: new Date().toISOString(),
      notifyUrl: `${process.env.APP_URL}/api/webhooks/payu`,
      customerIp: '127.0.0.1',
      merchantPosId: process.env.PAYU_POS_ID || 'TEST',
      description: `Zamówienie testowe`,
      currencyCode: 'PLN',
      totalAmount: Math.round(amount * 100).toString(),
      status: 'COMPLETED',
      payMethod: payMethod,
      products: [
        { name: 'Test Product', unitPrice: Math.round(amount * 100).toString(), quantity: '1' }
      ],
      buyer: {
        email: 'test-payment@example.com',
        phone: '+48123456789',
        firstName: 'Jan',
        lastName: 'Testowy'
      }
    },
    properties: [
      { name: 'PAYMENT_ID', value: `PAY_${Date.now()}` }
    ]
  };

  // Process the webhook using the payment service
  // We need to bypass signature validation for testing
  const payload = JSON.stringify(webhookPayload);
  
  // Directly call the PayU provider's processWebhook method
  const { PayUProvider } = await import('../src/providers/payment/payu.provider');
  const provider = new PayUProvider({
    merchantId: process.env.PAYU_POS_ID || 'TEST',
    apiKey: process.env.PAYU_MD5_KEY || 'TEST',
    sandbox: true,
  });

  const result = await provider.processWebhook(webhookPayload);
  
  console.log(`  Webhook result: status=${result.status}, paymentMethod=${result.paymentMethodUsed}`);

  // Manually update the order (simulating what payment.service would do)
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      paymentMethod: result.paymentMethodUsed || 'PayU',
    },
  });

  return result;
}

async function syncToBaselinker(orderId: string) {
  try {
    const result = await baselinkerOrdersService.syncOrderToBaselinker(orderId, { force: true });
    if (result.success) {
      console.log(`  ✅ Synced to Baselinker: BL Order ID = ${result.baselinkerOrderId}`);
    } else {
      console.log(`  ⚠️ Baselinker sync skipped: ${result.error}`);
    }
    return result;
  } catch (error) {
    console.log(`  ❌ Baselinker sync error:`, error);
    return { success: false, error: String(error) };
  }
}

async function main() {
  console.log('=====================================');
  console.log('  PayU Payment Methods - Test Orders');
  console.log('=====================================\n');

  try {
    // 1. Get test user and address
    console.log('📋 Setting up test data...');
    const user = await getTestUser();
    const address = await getOrCreateTestAddress(user.id);
    const variant = await getTestProduct();
    
    console.log(`  User: ${user.email}`);
    console.log(`  Product: ${variant.product.name} (${variant.price} PLN)`);
    console.log();

    // 2. Create test orders for each payment method
    const results: Array<{
      method: string;
      orderId: string;
      orderNumber: string;
      paymentMethod: string;
      baselinkerOrderId?: string;
    }> = [];

    for (const method of TEST_PAYMENT_METHODS) {
      console.log(`\n💳 Testing: ${method.name}`);
      console.log('-'.repeat(40));

      // Create order
      const order = await createTestOrder(user, address, variant, 'payu');

      // Simulate PayU webhook with specific payment method
      const payuOrderId = `PAYU_${Date.now()}_${randomUUID().substring(0, 8)}`;
      await simulatePayUWebhook(
        order.id,
        payuOrderId,
        { type: method.payuType, value: method.payuValue },
        Number(order.total)
      );

      // Refresh order to see updated payment method
      const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });

      console.log(`  Order payment method: ${updatedOrder?.paymentMethod}`);
      console.log(`  Expected in Baselinker: ${method.expectedInBaselinker}`);

      // Sync to Baselinker
      const syncResult = await syncToBaselinker(order.id);

      results.push({
        method: method.name,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: updatedOrder?.paymentMethod || 'unknown',
        baselinkerOrderId: syncResult.success ? syncResult.baselinkerOrderId : undefined,
      });
    }

    // 3. Summary
    console.log('\n\n=====================================');
    console.log('  SUMMARY');
    console.log('=====================================\n');

    console.log('| Method               | Order Number      | Payment Method       | Baselinker ID |');
    console.log('|---------------------|-------------------|---------------------|---------------|');
    for (const r of results) {
      console.log(
        `| ${r.method.padEnd(19)} | ${r.orderNumber.padEnd(17)} | ${r.paymentMethod.padEnd(19)} | ${(r.baselinkerOrderId || 'N/A').padEnd(13)} |`
      );
    }

    console.log('\n✅ Test completed!');
    console.log('Check Baselinker to see how each payment method appears in orders.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
