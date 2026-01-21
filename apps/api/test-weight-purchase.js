/**
 * Test zakupu produktów z różnymi wagami
 * Sprawdza czy cennik dostawy wg wagi działa poprawnie
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cennik wg wagi (zaokrąglony do .99)
const WEIGHT_SHIPPING_PRICES = {
  2: 20.99,    // do 2 kg
  5: 22.99,    // do 5 kg
  10: 23.99,   // do 10 kg
  20: 25.99,   // do 20 kg
  31.5: 28.99, // do 31,5 kg
};

const SHIPPING_PRICES = {
  inpost_paczkomat: 15.99,
  inpost_kurier: 19.99,
};

const WEIGHT_KG_REGEX = /^do\s*(\d+(?:[,\.]\d+)?)\s*kg$/i;

function getWeightKg(tags) {
  for (const tag of tags) {
    const match = tag.match(WEIGHT_KG_REGEX);
    if (match && match[1]) {
      const weight = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(weight) && weight > 0) {
        return weight;
      }
    }
  }
  return null;
}

function getWeightShippingPrice(tags) {
  const weight = getWeightKg(tags);
  if (weight === null) return null;
  
  const tiers = [2, 5, 10, 20, 31.5];
  for (const tier of tiers) {
    if (weight <= tier) {
      return WEIGHT_SHIPPING_PRICES[tier];
    }
  }
  return WEIGHT_SHIPPING_PRICES[31.5];
}

async function main() {
  console.log('=== TEST ZAKUPU PRODUKTÓW Z RÓŻNYMI WAGAMI ===\n');
  
  // Znajdź po jednym produkcie z każdą wagą
  const products = await prisma.product.findMany({
    where: { 
      tags: { isEmpty: false }
    },
    select: {
      id: true,
      sku: true,
      name: true,
      tags: true,
      variants: {
        take: 1,
        select: { id: true, price: true }
      }
    }
  });
  
  const weightTiers = ['do 2 kg', 'do 5 kg', 'do 10 kg', 'do 20 kg', 'do 31,5 kg'];
  const testProducts = [];
  
  for (const tier of weightTiers) {
    const product = products.find(p => 
      p.tags.includes(tier) && 
      p.variants.length > 0
    );
    if (product) {
      testProducts.push({
        tier,
        product,
        expectedShippingPrice: getWeightShippingPrice(product.tags)
      });
    }
  }
  
  console.log('=== PRODUKTY TESTOWE ===\n');
  testProducts.forEach(({ tier, product, expectedShippingPrice }) => {
    console.log(`${tier}:`);
    console.log(`  SKU: ${product.sku}`);
    console.log(`  Nazwa: ${product.name.substring(0, 50)}...`);
    console.log(`  Cena produktu: ${product.variants[0]?.price} zł`);
    console.log(`  Oczekiwana cena wysyłki: ${expectedShippingPrice?.toFixed(2)} zł`);
    console.log(`  Tagi: ${product.tags.join(', ')}`);
    console.log('');
  });
  
  // Symulacja koszyka - pojedyncze produkty
  console.log('=== SYMULACJA KOSZYKÓW ===\n');
  
  for (const { tier, product, expectedShippingPrice } of testProducts) {
    const variant = product.variants[0];
    if (!variant) continue;
    
    console.log(`--- Koszyk: 1x "${product.name.substring(0, 40)}..." (${tier}) ---`);
    console.log(`  VariantId: ${variant.id}`);
    console.log(`  Cena produktu: ${variant.price} zł`);
    console.log(`  Oczekiwana wysyłka (kurier): ${expectedShippingPrice?.toFixed(2)} zł`);
    console.log(`  Oczekiwana wysyłka (paczkomat): ${SHIPPING_PRICES.inpost_paczkomat} zł`);
    
    // Sprawdź czy produkt ma tag "Tylko kurier"
    const courierOnly = product.tags.some(t => /tylko\s*kurier/i.test(t));
    console.log(`  Tylko kurier: ${courierOnly ? 'TAK' : 'NIE'}`);
    console.log(`  SUMA (kurier): ${(parseFloat(variant.price) + expectedShippingPrice).toFixed(2)} zł`);
    console.log('');
  }
  
  // Symulacja koszyka z wieloma produktami o różnych wagach
  console.log('=== KOSZYK Z WIELOMA PRODUKTAMI ===\n');
  
  if (testProducts.length >= 2) {
    const cart = testProducts.slice(0, 3).map(t => ({
      tier: t.tier,
      sku: t.product.sku,
      variantId: t.product.variants[0]?.id,
      price: parseFloat(t.product.variants[0]?.price || 0),
      shippingPrice: t.expectedShippingPrice,
      wholesaler: t.product.tags.find(tag => /^(Ikonka|BTP|HP|Leker|Gastro|Horeca|Hurtownia)/i.test(tag)) || 'default'
    }));
    
    console.log('Produkty w koszyku:');
    cart.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.sku} (${item.tier}) - ${item.price} zł + wysyłka ${item.shippingPrice?.toFixed(2)} zł [${item.wholesaler}]`);
    });
    
    // Grupuj po hurtowni
    const byWholesaler = {};
    cart.forEach(item => {
      if (!byWholesaler[item.wholesaler]) byWholesaler[item.wholesaler] = [];
      byWholesaler[item.wholesaler].push(item);
    });
    
    console.log('\nPaczki (grupowane po hurtowni):');
    let totalShipping = 0;
    Object.entries(byWholesaler).forEach(([wholesaler, items]) => {
      // Najwyższa cena wagi w paczce
      const maxShipping = Math.max(...items.map(i => i.shippingPrice || SHIPPING_PRICES.inpost_kurier));
      totalShipping += maxShipping;
      console.log(`  Paczka ${wholesaler}: ${items.length} produktów, wysyłka: ${maxShipping.toFixed(2)} zł`);
    });
    
    const totalProducts = cart.reduce((sum, item) => sum + item.price, 0);
    console.log(`\nPODSUMOWANIE:`);
    console.log(`  Suma produktów: ${totalProducts.toFixed(2)} zł`);
    console.log(`  Suma wysyłek: ${totalShipping.toFixed(2)} zł`);
    console.log(`  RAZEM: ${(totalProducts + totalShipping).toFixed(2)} zł`);
  }
  
  // Wygeneruj JSON do testowania API
  console.log('\n=== DANE DO TESTOWANIA API ===\n');
  
  const apiTestData = testProducts.map(t => ({
    variantId: t.product.variants[0]?.id,
    quantity: 1
  })).filter(t => t.variantId);
  
  console.log('POST /api/shipping/calculate');
  console.log('Body:');
  console.log(JSON.stringify({ items: apiTestData }, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
