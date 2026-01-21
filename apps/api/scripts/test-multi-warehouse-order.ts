/**
 * Test script to create a paid order with 2 products from different warehouses
 * - Product 1: Ikonka warehouse with "Paczkomaty i Kurier" tag -> InPost Paczkomat
 * - Product 2: Ikonka warehouse with "Tylko kurier" tag -> DPD Kurier
 * 
 * Usage: npx ts-node scripts/test-multi-warehouse-order.ts
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
  email: 'test-multi-warehouse@wbtrade.pl',
  firstName: 'Test',
  lastName: 'MultiWarehouse',
  phone: '+48123456789',
};

// Test shipping address
const TEST_ADDRESS = {
  firstName: 'Test',
  lastName: 'MultiWarehouse',
  street: 'Testowa 1',
  city: 'Warszawa',
  postalCode: '00-001',
  country: 'PL',
  phone: '+48123456789',
};

async function createTestMultiWarehouseOrder() {
  console.log('🚀 Creating test order with 2 products from different warehouses...\n');

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

    // 3. Find product from Ikonka warehouse with "Paczkomaty i Kurier" tag (for Paczkomat)
    const ikonkaProduct = await prisma.product.findFirst({
      where: {
        status: 'ACTIVE',
        tags: { hasEvery: ['Ikonka', 'Paczkomaty i Kurier'] },
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

    if (!ikonkaProduct || !ikonkaProduct.variants || !ikonkaProduct.variants[0]) {
      console.error('❌ No Ikonka product with "Paczkomaty i Kurier" tag found!');
      return;
    }

    console.log(`\n📦 IKONKA PRODUCT (Paczkomat - tag "Paczkomaty i Kurier"):`);
    console.log(`   Name: ${ikonkaProduct.name}`);
    console.log(`   SKU: ${ikonkaProduct.variants[0].sku}`);
    console.log(`   Price: ${ikonkaProduct.variants[0].price} PLN`);
    console.log(`   Tags: ${ikonkaProduct.tags.join(', ')}`);

    // 4. Find product with "Tylko kurier" tag (for DPD)
    const dpdProduct = await prisma.product.findFirst({
      where: {
        status: 'ACTIVE',
        tags: { has: 'Tylko kurier' },
        id: { not: ikonkaProduct.id },
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

    if (!dpdProduct || !dpdProduct.variants || !dpdProduct.variants[0]) {
      console.error('❌ No product with "Tylko kurier" tag found!');
      return;
    }

    console.log(`\n📦 DPD PRODUCT (Kurier DPD - tag "Tylko kurier"):`);
    console.log(`   Name: ${dpdProduct.name}`);
    console.log(`   SKU: ${dpdProduct.variants[0].sku}`);
    console.log(`   Price: ${dpdProduct.variants[0].price} PLN`);
    console.log(`   Tags: ${dpdProduct.tags.join(', ')}`);

    const ikonkaVariant = ikonkaProduct.variants[0];
    const dpdVariant = dpdProduct.variants[0];
    
    const ikonkaPrice = Number(ikonkaVariant.price);
    const dpdPrice = Number(dpdVariant.price);
    const quantity = 1;
    
    const paczkomatShippingCost = 15.99; // InPost Paczkomat price
    const dpdShippingCost = 19.99; // DPD Kurier price
    const totalShipping = paczkomatShippingCost + dpdShippingCost;

    // 5. Generate order number
    const orderNumber = `TEST-DPD-INPOST-${Date.now()}`;

    // Get wholesaler from dpdProduct tags
    const dpdWholesaler = dpdProduct.tags.find((t: string) => 
      /^(Ikonka|BTP|HP|Gastro|Horeca|Hurtownia\s+Przemysłowa|Leker|Forcetop)$/i.test(t)
    ) || 'Ikonka';

    // 6. Package shipping data - 2 packages with different shipping methods
    const packageShipping = [
      {
        packageId: 'standard-1',
        wholesaler: 'Ikonka',
        method: 'inpost_paczkomat',
        price: paczkomatShippingCost,
        paczkomatCode: TEST_PACZKOMAT.code,
        paczkomatAddress: TEST_PACZKOMAT.address,
      },
      {
        packageId: 'standard-2',
        wholesaler: dpdWholesaler,
        method: 'dpd_kurier',
        price: dpdShippingCost,
      },
    ];

    console.log('\n📋 PACKAGE SHIPPING CONFIG:');
    console.log(JSON.stringify(packageShipping, null, 2));

    // 7. Create the order
    const subtotal = (ikonkaPrice * quantity) + (dpdPrice * quantity);
    const total = subtotal + totalShipping;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        shippingAddressId: shippingAddress.id,
        shippingMethod: 'mixed', // Mixed shipping methods
        paymentMethod: 'payu',
        
        // Paczkomat data for first package
        paczkomatCode: TEST_PACZKOMAT.code,
        paczkomatAddress: TEST_PACZKOMAT.address,
        
        // Full package shipping data
        packageShipping: packageShipping,
        
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        
        subtotal,
        shipping: totalShipping,
        tax: 0,
        total,
        
        items: {
          create: [
            {
              variantId: ikonkaVariant.id,
              productName: ikonkaProduct.name,
              variantName: ikonkaVariant.name,
              sku: ikonkaVariant.sku,
              quantity,
              unitPrice: ikonkaPrice,
              total: ikonkaPrice * quantity,
            },
            {
              variantId: dpdVariant.id,
              productName: dpdProduct.name,
              variantName: dpdVariant.name,
              sku: dpdVariant.sku,
              quantity,
              unitPrice: dpdPrice,
              total: dpdPrice * quantity,
            },
          ],
        },
        
        statusHistory: {
          create: {
            status: 'PROCESSING',
            note: 'TEST: Zamówienie InPost + DPD - Ikonka (paczkomat) + Tylko kurier (DPD)',
          },
        },
      },
      include: {
        items: true,
        user: true,
        shippingAddress: true,
      },
    });

    console.log('\n' + '='.repeat(60));
    console.log('📦 ORDER CREATED:');
    console.log('='.repeat(60));
    console.log(`Order ID:        ${order.id}`);
    console.log(`Order Number:    ${order.orderNumber}`);
    console.log(`Status:          ${order.status}`);
    console.log(`Payment Status:  ${order.paymentStatus}`);
    console.log(`\n📦 ITEMS (${order.items.length}):`);
    for (const item of order.items) {
      console.log(`   - ${item.productName} (${item.sku}) x${item.quantity} = ${item.total} PLN`);
    }
    console.log(`\n🚚 SHIPPING:`);
    console.log(`   Package 1: InPost Paczkomat - ${paczkomatShippingCost} PLN (tag: Paczkomaty i Kurier)`);
    console.log(`   Package 2: DPD Kurier - ${dpdShippingCost} PLN (tag: Tylko kurier)`);
    console.log(`   Total Shipping: ${totalShipping} PLN`);
    console.log(`\n🏪 PACZKOMAT (for InPost package):`);
    console.log(`   Code: ${order.paczkomatCode}`);
    console.log(`   Address: ${order.paczkomatAddress}`);
    console.log(`\n💰 TOTALS:`);
    console.log(`   Subtotal: ${order.subtotal} PLN`);
    console.log(`   Shipping: ${order.shipping} PLN`);
    console.log(`   Total: ${order.total} PLN`);

    // 8. Sync to Baselinker
    console.log('\n' + '='.repeat(60));
    console.log('📤 Syncing to Baselinker...');
    console.log('='.repeat(60));
    
    try {
      const syncResult = await baselinkerOrdersService.syncOrderToBaselinker(order.id, { force: true });
      
      console.log(`\nSuccess:           ${syncResult.success}`);
      console.log(`Baselinker ID:     ${syncResult.baselinkerOrderId || 'N/A'}`);
      
      if (syncResult.success) {
        console.log('\n🎉 Order successfully synced to Baselinker!');
        console.log('\nExpected Baselinker data:');
        console.log('- delivery_point_id: WAW96HP (for InPost Paczkomat package)');
        console.log('- delivery_point_address: Świętokrzyska 30, 00-116 Warszawa');
        console.log('- 2 products: 1x InPost Paczkomat, 1x DPD Kurier');
        console.log('- Uwagi powinny zawierać: SKU - INPOST PACZKOMAT | SKU - DPD KURIER');
        console.log('\n⚠️  Check the order in Baselinker panel to verify the data.');
      }
    } catch (syncError) {
      console.error('\n❌ Baselinker sync error:', syncError);
    }

    // 9. Fetch the updated order
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        orderNumber: true,
        baselinkerOrderId: true,
        paczkomatCode: true,
        paczkomatAddress: true,
        packageShipping: true,
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
createTestMultiWarehouseOrder()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
