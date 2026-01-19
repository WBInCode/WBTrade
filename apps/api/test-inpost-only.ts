/**
 * Test script for InPost-only shipping restriction
 * Tests the new logic for products with "Paczkomaty i Kurier" tag
 * 
 * Run: npx ts-node test-inpost-only.ts
 */

import { PrismaClient } from '@prisma/client';
import { shippingCalculatorService } from './src/services/shipping-calculator.service';

const prisma = new PrismaClient();

async function testInPostOnlyLogic() {
  console.log('🧪 Testing InPost-only shipping restriction\n');
  console.log('='.repeat(70));
  
  // Find products with different tags
  console.log('\n📦 Looking for products with different shipping tags...\n');
  
  // 1. Products with "Paczkomaty i Kurier" tag (should be InPost only)
  const inpostOnlyProducts = await prisma.product.findMany({
    where: {
      OR: [
        { tags: { has: 'Paczkomaty i Kurier' } },
        { tags: { has: 'paczkomaty i kurier' } },
        { tags: { has: 'Paczkomat i Kurier' } },
        { tags: { has: 'paczkomat i kurier' } },
      ]
    },
    take: 3,
    include: {
      variants: { take: 1, select: { id: true } }
    }
  });
  
  console.log(`🔒 Products with "Paczkomaty i Kurier" tag (${inpostOnlyProducts.length}):`);
  for (const p of inpostOnlyProducts) {
    console.log(`  - ${p.name}`);
    console.log(`    Tags: ${p.tags.join(', ')}`);
    console.log(`    Variant: ${p.variants[0]?.id || 'none'}`);
  }
  
  // 2. Products with "Tylko kurier" or gabaryt (should be gabaryt shipping)
  const gabarytProducts = await prisma.product.findMany({
    where: {
      OR: [
        { tags: { has: 'Tylko kurier' } },
        { tags: { has: 'gabaryt' } },
        { tags: { has: 'Gabaryt' } },
      ]
    },
    take: 3,
    include: {
      variants: { take: 1, select: { id: true } }
    }
  });
  
  console.log(`\n📦 Products with "Tylko kurier" / "gabaryt" tag (${gabarytProducts.length}):`);
  for (const p of gabarytProducts) {
    console.log(`  - ${p.name}`);
    console.log(`    Tags: ${p.tags.join(', ')}`);
    console.log(`    Variant: ${p.variants[0]?.id || 'none'}`);
  }
  
  // 3. Regular products (should have all shipping methods)
  const regularProducts = await prisma.product.findMany({
    where: {
      AND: [
        { NOT: { tags: { has: 'Paczkomaty i Kurier' } } },
        { NOT: { tags: { has: 'paczkomaty i kurier' } } },
        { NOT: { tags: { has: 'Tylko kurier' } } },
        { NOT: { tags: { has: 'gabaryt' } } },
        { NOT: { tags: { has: 'Gabaryt' } } },
      ]
    },
    take: 3,
    include: {
      variants: { take: 1, select: { id: true } }
    }
  });
  
  console.log(`\n🛒 Regular products without special tags (${regularProducts.length}):`);
  for (const p of regularProducts) {
    console.log(`  - ${p.name}`);
    console.log(`    Tags: ${p.tags.slice(0, 5).join(', ')}${p.tags.length > 5 ? '...' : ''}`);
    console.log(`    Variant: ${p.variants[0]?.id || 'none'}`);
  }
  
  // ============================================
  // TEST SCENARIOS
  // ============================================
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 RUNNING TEST SCENARIOS');
  console.log('='.repeat(70));
  
  // SCENARIO 1: InPost-only product
  console.log('\n\n🔒 SCENARIO 1: Product with "Paczkomaty i Kurier" tag');
  console.log('-'.repeat(50));
  
  if (inpostOnlyProducts.length > 0 && inpostOnlyProducts[0].variants[0]) {
    const items = [{
      variantId: inpostOnlyProducts[0].variants[0].id,
      quantity: 1,
    }];
    
    console.log(`Testing with: ${inpostOnlyProducts[0].name}`);
    
    const result = await shippingCalculatorService.getShippingOptionsPerPackage(items);
    
    console.log(`\nPackages: ${result.packagesWithOptions.length}`);
    for (const pkgOpt of result.packagesWithOptions) {
      console.log(`\n  Package ${pkgOpt.package.id}:`);
      console.log(`    Type: ${pkgOpt.package.type}`);
      console.log(`    isInPostOnly: ${pkgOpt.package.isInPostOnly}`);
      console.log(`    isPaczkomatAvailable: ${pkgOpt.package.isPaczkomatAvailable}`);
      console.log(`\n    Available shipping methods:`);
      for (const method of pkgOpt.shippingMethods) {
        const status = method.available ? '✅' : '❌';
        console.log(`      ${status} ${method.name} (${method.price.toFixed(2)} PLN)${method.message ? ` - ${method.message}` : ''}`);
      }
    }
    
    // Verify expected behavior
    const pkg = result.packagesWithOptions[0];
    const inpostMethods = pkg.shippingMethods.filter(m => 
      (m.id === 'inpost_paczkomat' || m.id === 'inpost_kurier') && m.available
    );
    const otherMethods = pkg.shippingMethods.filter(m => 
      !['inpost_paczkomat', 'inpost_kurier', 'wysylka_gabaryt'].includes(m.id) && m.available
    );
    
    console.log('\n  🧪 Verification:');
    if (pkg.package.isInPostOnly && inpostMethods.length === 2 && otherMethods.length === 0) {
      console.log('    ✅ PASS: Only InPost methods available (Paczkomat + Kurier)');
    } else if (!pkg.package.isInPostOnly) {
      console.log('    ⚠️  WARNING: isInPostOnly is false - tag may not be recognized');
      console.log(`    Product tags: ${inpostOnlyProducts[0].tags.join(', ')}`);
    } else {
      console.log('    ❌ FAIL: Non-InPost methods are available');
      console.log(`    Available other methods: ${otherMethods.map(m => m.name).join(', ')}`);
    }
  } else {
    console.log('⚠️  No products with "Paczkomaty i Kurier" tag found in database');
    console.log('    Creating mock test...\n');
    
    // Test the regex pattern directly
    const testTags = [
      'Paczkomaty i Kurier',
      'paczkomaty i kurier', 
      'Paczkomat i Kurier',
      'paczkomat i kurier',
      'Paczkomaty i kurier',
    ];
    
    const INPOST_ONLY_PATTERN = /^paczkomaty?\s*i\s*kurier$/i;
    
    console.log('  Testing INPOST_ONLY regex pattern:');
    for (const tag of testTags) {
      const matches = INPOST_ONLY_PATTERN.test(tag);
      console.log(`    "${tag}" → ${matches ? '✅ matches' : '❌ no match'}`);
    }
  }
  
  // SCENARIO 2: Regular product (all methods should be available)
  console.log('\n\n🛒 SCENARIO 2: Regular product (all methods)');
  console.log('-'.repeat(50));
  
  if (regularProducts.length > 0 && regularProducts[0].variants[0]) {
    const items = [{
      variantId: regularProducts[0].variants[0].id,
      quantity: 1,
    }];
    
    console.log(`Testing with: ${regularProducts[0].name}`);
    
    const result = await shippingCalculatorService.getShippingOptionsPerPackage(items);
    
    console.log(`\nPackages: ${result.packagesWithOptions.length}`);
    for (const pkgOpt of result.packagesWithOptions) {
      console.log(`\n  Package ${pkgOpt.package.id}:`);
      console.log(`    Type: ${pkgOpt.package.type}`);
      console.log(`    isInPostOnly: ${pkgOpt.package.isInPostOnly}`);
      console.log(`\n    Available shipping methods:`);
      for (const method of pkgOpt.shippingMethods) {
        const status = method.available ? '✅' : '❌';
        console.log(`      ${status} ${method.name} (${method.price.toFixed(2)} PLN)`);
      }
    }
    
    // Verify expected behavior
    const pkg = result.packagesWithOptions[0];
    const availableMethods = pkg.shippingMethods.filter(m => m.available);
    
    console.log('\n  🧪 Verification:');
    if (!pkg.package.isInPostOnly && availableMethods.length >= 6) {
      console.log('    ✅ PASS: All shipping methods available');
    } else {
      console.log('    ❌ FAIL: Not all methods available');
      console.log(`    Available: ${availableMethods.length}, Expected: 6+`);
    }
  } else {
    console.log('⚠️  No regular products found in database');
  }
  
  // SCENARIO 3: Gabaryt product
  console.log('\n\n📦 SCENARIO 3: Gabaryt product (only wysylka_gabaryt)');
  console.log('-'.repeat(50));
  
  if (gabarytProducts.length > 0 && gabarytProducts[0].variants[0]) {
    const items = [{
      variantId: gabarytProducts[0].variants[0].id,
      quantity: 1,
    }];
    
    console.log(`Testing with: ${gabarytProducts[0].name}`);
    
    const result = await shippingCalculatorService.getShippingOptionsPerPackage(items);
    
    console.log(`\nPackages: ${result.packagesWithOptions.length}`);
    for (const pkgOpt of result.packagesWithOptions) {
      console.log(`\n  Package ${pkgOpt.package.id}:`);
      console.log(`    Type: ${pkgOpt.package.type}`);
      console.log(`    isPaczkomatAvailable: ${pkgOpt.package.isPaczkomatAvailable}`);
      console.log(`\n    Available shipping methods:`);
      for (const method of pkgOpt.shippingMethods) {
        const status = method.available ? '✅' : '❌';
        console.log(`      ${status} ${method.name} (${method.price.toFixed(2)} PLN)${method.message ? ` - ${method.message}` : ''}`);
      }
    }
    
    // Verify expected behavior
    const pkg = result.packagesWithOptions[0];
    const availableMethods = pkg.shippingMethods.filter(m => m.available);
    
    console.log('\n  🧪 Verification:');
    if (pkg.package.type === 'gabaryt' && availableMethods.length === 1 && availableMethods[0].id === 'wysylka_gabaryt') {
      console.log('    ✅ PASS: Only wysylka_gabaryt available for gabaryt');
    } else {
      console.log('    ⚠️  Result differs from expected');
      console.log(`    Package type: ${pkg.package.type}`);
      console.log(`    Available methods: ${availableMethods.map(m => m.id).join(', ')}`);
    }
  } else {
    console.log('⚠️  No gabaryt products found in database');
  }
  
  // SCENARIO 4: Mixed cart - InPost-only + regular product
  console.log('\n\n🔀 SCENARIO 4: Mixed cart (InPost-only + regular)');
  console.log('-'.repeat(50));
  
  if (inpostOnlyProducts.length > 0 && regularProducts.length > 0 && 
      inpostOnlyProducts[0].variants[0] && regularProducts[0].variants[0]) {
    const items = [
      { variantId: inpostOnlyProducts[0].variants[0].id, quantity: 1 },
      { variantId: regularProducts[0].variants[0].id, quantity: 1 },
    ];
    
    console.log(`Testing with:`);
    console.log(`  - ${inpostOnlyProducts[0].name} (InPost-only)`);
    console.log(`  - ${regularProducts[0].name} (regular)`);
    
    // Test getAvailableShippingMethods (global cart level)
    const globalMethods = await shippingCalculatorService.getAvailableShippingMethods(items);
    
    console.log('\n  Global shipping methods for entire cart:');
    for (const method of globalMethods) {
      const status = method.available ? '✅' : '❌';
      console.log(`    ${status} ${method.name} (${method.price.toFixed(2)} PLN)${method.message ? ` - ${method.message}` : ''}`);
    }
    
    // Verify
    const availableGlobal = globalMethods.filter(m => m.available);
    const inpostOnlyGlobal = availableGlobal.every(m => 
      m.id === 'inpost_paczkomat' || m.id === 'inpost_kurier' || m.id === 'wysylka_gabaryt'
    );
    
    console.log('\n  🧪 Verification:');
    if (inpostOnlyGlobal) {
      console.log('    ✅ PASS: Mixed cart restricts to InPost only (due to InPost-only product)');
    } else {
      console.log('    ⚠️  Non-InPost methods available in mixed cart');
      console.log(`    Available: ${availableGlobal.map(m => m.id).join(', ')}`);
    }
  } else {
    console.log('⚠️  Insufficient products for mixed cart test');
  }
  
  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`
  Tag "Paczkomaty i Kurier" → Only InPost (Paczkomat + Kurier) available
  Tag "gabaryt" / "Tylko kurier" → Only "Wysyłka gabaryt" available
  No special tag → All shipping methods available
  Mixed cart with InPost-only → Entire cart restricted to InPost
  `);
  
  await prisma.$disconnect();
}

testInPostOnlyLogic().catch(async (error) => {
  console.error('Test failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
