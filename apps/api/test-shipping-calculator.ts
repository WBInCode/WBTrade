/**
 * Test file for Shipping Calculator Service
 * 
 * Run with: npx tsx test-shipping-calculator.ts
 */

import { shippingCalculatorService, CartItemForShipping, SHIPPING_PRICES } from './src/services/shipping-calculator.service';
import { prisma } from './src/db';

async function testShippingCalculator() {
  console.log('🧪 Testing Shipping Calculator Service\n');
  console.log('='.repeat(60));
  
  // Test 1: Find products with different tags for testing
  console.log('\n📦 Looking for products with tags...\n');
  
  const productsWithTags = await prisma.product.findMany({
    where: {
      tags: { isEmpty: false }
    },
    take: 20,
    include: {
      variants: {
        take: 1,
        select: { id: true, sku: true }
      }
    }
  });
  
  console.log(`Found ${productsWithTags.length} products with tags:\n`);
  
  for (const product of productsWithTags) {
    console.log(`  - ${product.name}`);
    console.log(`    Tags: ${product.tags.join(', ') || 'none'}`);
    console.log(`    Variant: ${product.variants[0]?.id || 'none'}`);
    console.log('');
  }
  
  // Check if we have any products at all
  const allProducts = await prisma.product.findMany({
    take: 5,
    include: {
      variants: {
        take: 1,
        select: { id: true }
      }
    }
  });
  
  console.log(`\n📊 All products sample (${allProducts.length}):\n`);
  for (const product of allProducts) {
    console.log(`  - ${product.name}`);
    console.log(`    Tags: [${product.tags.join(', ')}]`);
    console.log(`    Variant: ${product.variants[0]?.id || 'none'}`);
    console.log('');
  }
  
  // Create test items from existing products
  const testItems: CartItemForShipping[] = [];
  
  for (const product of allProducts) {
    if (product.variants[0]) {
      testItems.push({
        variantId: product.variants[0].id,
        quantity: 2,
      });
    }
  }
  
  if (testItems.length === 0) {
    console.log('❌ No products with variants found for testing');
    return;
  }
  
  // Test the shipping calculator
  console.log('\n' + '='.repeat(60));
  console.log('🧮 Testing shipping calculation...\n');
  
  try {
    const result = await shippingCalculatorService.calculateShipping(testItems, 'inpost_kurier');
    
    console.log('📦 Calculation Result:');
    console.log(`  Total Packages: ${result.totalPackages}`);
    console.log(`  Total Paczkomat Packages: ${result.totalPaczkomatPackages}`);
    console.log(`  Shipping Cost (courier): ${result.shippingCost.toFixed(2)} PLN`);
    console.log(`  Paczkomat Cost: ${result.paczkomatCost.toFixed(2)} PLN`);
    console.log(`  Paczkomat Available: ${result.isPaczkomatAvailable ? 'Yes' : 'No'}`);
    
    console.log('\n📊 Cost Breakdown:');
    for (const item of result.breakdown) {
      console.log(`  - ${item.description}: ${item.cost.toFixed(2)} PLN (${item.packageCount} packages)`);
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      for (const warning of result.warnings) {
        console.log(`  - ${warning}`);
      }
    }
    
    console.log('\n📦 Package Details:');
    for (const pkg of result.packages) {
      console.log(`  Package ${pkg.id}:`);
      console.log(`    Type: ${pkg.type}`);
      console.log(`    Wholesaler: ${pkg.wholesaler || 'default'}`);
      console.log(`    Items: ${pkg.items.length}`);
      console.log(`    Paczkomat packages: ${pkg.paczkomatPackageCount}`);
      for (const item of pkg.items) {
        console.log(`      - ${item.productName} x${item.quantity} (gabaryt: ${item.isGabaryt})`);
      }
    }
    
    // Test available shipping methods
    console.log('\n' + '='.repeat(60));
    console.log('🚚 Available Shipping Methods:\n');
    
    const methods = await shippingCalculatorService.getAvailableShippingMethods(testItems);
    
    for (const method of methods) {
      console.log(`  ${method.name}: ${method.price.toFixed(2)} PLN`);
      console.log(`    Available: ${method.available ? '✅' : '❌'}`);
      if (method.message) {
        console.log(`    Note: ${method.message}`);
      }
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  await prisma.$disconnect();
}

// Also test specific scenarios
async function testSpecificScenarios() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Testing Specific Scenarios\n');
  
  // Scenario 1: Products from same wholesaler (should be 1 package)
  console.log('Scenario 1: Products from same wholesaler');
  console.log('Expected: 1 package, 1 shipping cost');
  console.log('');
  
  // Scenario 2: Products from different wholesalers (should be 2 packages)
  console.log('Scenario 2: Products from different wholesalers');
  console.log('Expected: 2 packages, 2x shipping cost');
  console.log('');
  
  // Scenario 3: Gabaryt products (each item = separate package)
  console.log('Scenario 3: Gabaryt products (2 units)');
  console.log('Expected: 2 packages, 2x gabaryt shipping cost');
  console.log('');
  
  // Scenario 4: Paczkomat limits
  console.log('Scenario 4: Paczkomat with "3 produkty w paczce" limit, ordering 5');
  console.log('Expected: 2 paczkomat packages');
  console.log('');
  
  // Show pricing
  console.log('\n📋 Current Shipping Prices:');
  for (const [key, value] of Object.entries(SHIPPING_PRICES)) {
    console.log(`  ${key}: ${value.toFixed(2)} PLN`);
  }
}

testShippingCalculator()
  .then(() => testSpecificScenarios())
  .catch(console.error);
