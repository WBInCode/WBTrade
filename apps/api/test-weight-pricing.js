require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cennik wg wagi
const WEIGHT_SHIPPING_PRICES = {
  2: 20.28,    // do 2 kg
  5: 22.13,    // do 5 kg
  10: 23.97,   // do 10 kg
  20: 25.20,   // do 20 kg
  31.5: 28.28, // do 31,5 kg
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
  console.log('=== TEST CENNIKA DOSTAWY WG WAGI ===\n');
  
  // Pobierz przykładowe produkty z tagami wagi
  const products = await prisma.product.findMany({
    where: { tags: { isEmpty: false } },
    select: { sku: true, name: true, tags: true }
  });
  
  const withWeight = products.filter(p => p.tags.some(t => WEIGHT_KG_REGEX.test(t)));
  
  console.log('Produktów z tagiem wagi: ' + withWeight.length);
  
  // Grupuj po cenie dostawy
  const byPrice = {};
  withWeight.forEach(p => {
    const price = getWeightShippingPrice(p.tags);
    const weightTag = p.tags.find(t => WEIGHT_KG_REGEX.test(t));
    if (price) {
      const key = `${weightTag} -> ${price.toFixed(2)} zł`;
      if (!byPrice[key]) byPrice[key] = [];
      byPrice[key].push(p);
    }
  });
  
  console.log('\n=== MAPOWANIE TAG WAGI -> CENA DOSTAWY ===\n');
  Object.entries(byPrice)
    .sort((a, b) => {
      const priceA = parseFloat(a[0].split('->')[1]);
      const priceB = parseFloat(b[0].split('->')[1]);
      return priceA - priceB;
    })
    .forEach(([key, prods]) => {
      console.log(`${key}: ${prods.length} produktów`);
    });
  
  console.log('\n=== PRZYKŁADY PRODUKTÓW ===\n');
  
  // Pokaż po 2 produkty z każdej wagi
  const tiers = ['do 2 kg', 'do 5 kg', 'do 10 kg', 'do 20 kg', 'do 31,5 kg'];
  tiers.forEach(tier => {
    const matching = withWeight.filter(p => p.tags.includes(tier));
    if (matching.length > 0) {
      const price = getWeightShippingPrice(matching[0].tags);
      console.log(`\n--- ${tier} (${price?.toFixed(2)} zł) ---`);
      matching.slice(0, 2).forEach(p => {
        console.log(`  SKU: ${p.sku}`);
        console.log(`  Nazwa: ${p.name.substring(0, 60)}...`);
        console.log(`  Tagi: ${p.tags.join(', ')}`);
      });
    }
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
