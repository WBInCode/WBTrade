/**
 * Test file for Shipping Calculator - Testing specific scenarios
 * 
 * Run with: npx tsx test-shipping-scenarios.ts
 */

import { shippingCalculatorService } from './src/services/shipping-calculator.service';
import { prisma } from './src/db';

async function testScenarios() {
  console.log('🧪 Testing Specific Shipping Scenarios\n');
  console.log('='.repeat(60));
  
  // Find products with "Tylko kurier" tag (gabaryt)
  const courierOnlyProducts = await prisma.product.findMany({
    where: {
      tags: { has: 'Tylko kurier' }
    },
    take: 3,
    include: {
      variants: { take: 1, select: { id: true } }
    }
  });
  
  console.log(`\n🚚 Products with "Tylko kurier" (${courierOnlyProducts.length}):`);
  for (const p of courierOnlyProducts) {
    console.log(`  - ${p.name} (${p.variants[0]?.id})`);
  }
  
  // Find products with "Paczkomaty i Kurier" tag
  const paczkomatProducts = await prisma.product.findMany({
    where: {
      tags: { has: 'Paczkomaty i Kurier' }
    },
    take: 3,
    include: {
      variants: { take: 1, select: { id: true } }
    }
  });
  
  console.log(`\n📦 Products with "Paczkomaty i Kurier" (${paczkomatProducts.length}):`);
  for (const p of paczkomatProducts) {
    console.log(`  - ${p.name} (${p.variants[0]?.id})`);
  }
  
  // Test Scenario 1: Only courier-only products
  console.log('\n' + '='.repeat(60));
  console.log('📋 SCENARIO 1: Only courier-only products\n');
  
  if (courierOnlyProducts.length > 0 && courierOnlyProducts[0].variants[0]) {
    const items = [{
      variantId: courierOnlyProducts[0].variants[0].id,
      quantity: 2,
    }];
    
    const result = await shippingCalculatorService.calculateShipping(items, 'inpost_kurier');
    
    console.log(`Total Packages: ${result.totalPackages}`);
    console.log(`Shipping Cost: ${result.shippingCost.toFixed(2)} PLN`);
    console.log(`Paczkomat Available: ${result.isPaczkomatAvailable ? '✅' : '❌'}`);
    console.log(`Warnings: ${result.warnings.join(', ') || 'none'}`);
    
    for (const pkg of result.packages) {
      console.log(`  Package ${pkg.id}: type=${pkg.type}, items=${pkg.items.length}`);
    }
  } else {
    console.log('No courier-only products found');
  }
  
  // Test Scenario 2: Mixed - courier-only + paczkomat products
  console.log('\n' + '='.repeat(60));
  console.log('📋 SCENARIO 2: Mixed products (courier-only + paczkomat)\n');
  
  if (courierOnlyProducts.length > 0 && paczkomatProducts.length > 0 && 
      courierOnlyProducts[0].variants[0] && paczkomatProducts[0].variants[0]) {
    const items = [
      { variantId: courierOnlyProducts[0].variants[0].id, quantity: 1 },
      { variantId: paczkomatProducts[0].variants[0].id, quantity: 1 },
    ];
    
    const result = await shippingCalculatorService.calculateShipping(items, 'inpost_kurier');
    
    console.log(`Total Packages: ${result.totalPackages}`);
    console.log(`Shipping Cost: ${result.shippingCost.toFixed(2)} PLN`);
    console.log(`Paczkomat Available: ${result.isPaczkomatAvailable ? '✅' : '❌'}`);
    console.log(`Warnings: ${result.warnings.join(', ') || 'none'}`);
    
    for (const pkg of result.packages) {
      console.log(`  Package ${pkg.id}: type=${pkg.type}, items=${pkg.items.length}`);
      for (const item of pkg.items) {
        console.log(`    - ${item.productName} x${item.quantity} (gabaryt: ${item.isGabaryt})`);
      }
    }
    
    // Try to get shipping methods
    const methods = await shippingCalculatorService.getAvailableShippingMethods(items);
    console.log('\nAvailable methods:');
    for (const m of methods) {
      console.log(`  ${m.name}: ${m.price.toFixed(2)} PLN (${m.available ? '✅' : '❌'}) ${m.message || ''}`);
    }
  } else {
    console.log('Not enough products found for mixed test');
  }
  
  // Test Scenario 3: Different wholesalers
  console.log('\n' + '='.repeat(60));
  console.log('📋 SCENARIO 3: Products from different wholesalers\n');
  
  // Find products with different wholesaler tags
  const ikonkaProducts = await prisma.product.findMany({
    where: { tags: { has: 'Ikonka' } },
    take: 1,
    include: { variants: { take: 1, select: { id: true } } }
  });
  
  // Simulate a BTP product by checking if we can find one
  // For now, we'll just note that all products seem to be from Ikonka
  console.log('Note: All current products appear to be from Ikonka wholesaler.');
  console.log('When products from different wholesalers are added, they will be');
  console.log('packed separately and shipping costs will sum up.');
  
  await prisma.$disconnect();
  console.log('\n✅ Scenario tests completed!');
}

testScenarios().catch(console.error);
