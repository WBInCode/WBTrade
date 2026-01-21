/**
 * Test script to create a paid order with Paczkomat and sync to Baselinker
 * 
 * Usage: npx ts-node scripts/test-paczkomat-order.ts
 */

import { PrismaClient } from '@prisma/client';
import { baselinkerOrdersService } from '../src/services/baselinker-orders.service';

const prisma = new PrismaClient();

// Test Paczkomat data (WAW96HP - Warszawa, Świętokrzyska 30)
const TEST_PACZKOMAT = {
  code: 'WAW96HP',
  address: 'Świętokrzyska 30, 00-116 Warszawa',
};

// Test customer data
const TEST_CUSTOMER = {
  email: 'test-paczkomat@wbtrade.pl',
  firstName: 'Test',
  lastName: 'Paczkomat',
  phone: '+48123456789',
};

// Test shipping address
const TEST_ADDRESS = {
  firstName: 'Test',
  lastName: 'Paczkomat',
  street: 'Testowa 1',
  city: 'Warszawa',
  postalCode: '00-001',
  country: 'PL',
  phone: '+48123456789',
};

async function createTestPaczkomatOrder() {
  console.log('🚀 Creating test order with Paczkomat...\n');

  try {
    // 1. Find or create test user
    let user = await prisma.user.findUnique({
      where: { email: TEST_CUSTOMER.email },
    });

    if (!user) {
      console.log('Creating test user...');
      user = await prisma.user.create({
        data: {
          email: TEST_CUSTOMER.email,
          firstName: TEST_CUSTOMER.firstName,
          lastName: TEST_CUSTOMER.lastName,
          phone: TEST_CUSTOMER.phone,
          password: 'test-hash-not-for-login',
        },
      });
      console.log(`✅ Created user: ${user.id}`);
    } else {
      console.log(`✅ Using existing user: ${user.id}`);
    }

    // 2. Create shipping address
    const shippingAddress = await prisma.address.create({
      data: {
        userId: user.id,
        type: 'SHIPPING',
        ...TEST_ADDRESS,
        isDefault: false,
      },
    });
    console.log(`✅ Created shipping address: ${shippingAddress.id}`);

    // 3. Find a product to order
    const product = await prisma.product.findFirst({
      where: {
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

    if (!product || !product.variants || !product.variants[0]) {
      console.error('❌ No available product found!');
      return;
    }

    const variant = product.variants[0];
    const unitPrice = Number(variant.price);
    const quantity = 1;
    const shippingCost = 15.99; // InPost Paczkomat price

    console.log(`✅ Using product: ${product.name} (${variant.sku}) - ${unitPrice} PLN`);

    // 4. Generate order number
    const orderNumber = `TEST-PACZKOMAT-${Date.now()}`;

    // 5. Create the order with Paczkomat data
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        shippingAddressId: shippingAddress.id,
        shippingMethod: 'inpost_paczkomat',
        paymentMethod: 'payu',
        
        // PACZKOMAT DATA - THIS IS WHAT WE'RE TESTING
        paczkomatCode: TEST_PACZKOMAT.code,
        paczkomatAddress: TEST_PACZKOMAT.address,
        
        packageShipping: [{
          packageId: 'standard-1',
          method: 'inpost_paczkomat',
          price: shippingCost,
          paczkomatCode: TEST_PACZKOMAT.code,
          paczkomatAddress: TEST_PACZKOMAT.address,
        }],
        
        status: 'PROCESSING', // Already paid
        paymentStatus: 'PAID', // Mark as paid so it syncs to Baselinker
        
        subtotal: unitPrice * quantity,
        shipping: shippingCost,
        tax: 0,
        total: (unitPrice * quantity) + shippingCost,
        
        items: {
          create: {
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            sku: variant.sku,
            quantity,
            unitPrice,
            total: unitPrice * quantity,
          },
        },
        
        statusHistory: {
          create: {
            status: 'PROCESSING',
            note: 'TEST: Zamówienie testowe z paczkomatem - opłacone',
          },
        },
      },
      include: {
        items: true,
        user: true,
        shippingAddress: true,
      },
    });

    console.log('\n📦 ORDER CREATED:');
    console.log('================');
    console.log(`Order ID:        ${order.id}`);
    console.log(`Order Number:    ${order.orderNumber}`);
    console.log(`Status:          ${order.status}`);
    console.log(`Payment Status:  ${order.paymentStatus}`);
    console.log(`Shipping Method: ${order.shippingMethod}`);
    console.log(`\n🏪 PACZKOMAT DATA:`);
    console.log(`Code:            ${order.paczkomatCode}`);
    console.log(`Address:         ${order.paczkomatAddress}`);
    console.log(`\nPackage Shipping: ${JSON.stringify(order.packageShipping, null, 2)}`);
    console.log(`\n💰 Total: ${order.total} PLN`);

    // 6. Sync to Baselinker
    console.log('\n📤 Syncing to Baselinker...');
    
    try {
      const syncResult = await baselinkerOrdersService.syncOrderToBaselinker(order.id, { force: true });
      
      console.log('\n✅ BASELINKER SYNC RESULT:');
      console.log('==========================');
      console.log(`Success:           ${syncResult.success}`);
      console.log(`Baselinker ID:     ${syncResult.baselinkerOrderId || 'N/A'}`);
      
      if (syncResult.success) {
        console.log('\n🎉 Order successfully synced to Baselinker!');
        console.log('Check Baselinker panel to verify Paczkomat data:');
        console.log(`- delivery_point_id: ${TEST_PACZKOMAT.code}`);
        console.log(`- delivery_point_name: ${TEST_PACZKOMAT.code}`);
        console.log(`- delivery_point_address: ${TEST_PACZKOMAT.address}`);
      }
    } catch (syncError) {
      console.error('\n❌ Baselinker sync error:', syncError);
    }

    // 7. Fetch the updated order to show Baselinker ID
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        orderNumber: true,
        baselinkerOrderId: true,
        paczkomatCode: true,
        paczkomatAddress: true,
      },
    });

    console.log('\n📋 FINAL ORDER STATE:');
    console.log(JSON.stringify(updatedOrder, null, 2));

    return order;

  } catch (error) {
    console.error('❌ Error creating test order:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
createTestPaczkomatOrder()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
