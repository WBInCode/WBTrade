import { PrismaClient } from '@prisma/client';
import { ShippingCalculatorService } from '../src/services/shipping-calculator.service';

const prisma = new PrismaClient();
const service = new ShippingCalculatorService();

async function main() {
  console.log('Testing shipping calculation...\n');
  
  // Find variants for test products
  const frytownica = await prisma.productVariant.findFirst({
    where: { product: { name: { contains: 'Frytownica podwójna dwukomorowa z kranami' } } },
    select: { id: true, product: { select: { name: true, tags: true } } }
  });
  
  const szafka = await prisma.productVariant.findFirst({
    where: { product: { name: { contains: 'Szafka stalowa do kuchni' } } },
    select: { id: true, product: { select: { name: true, tags: true } } }
  });
  
  console.log('Frytownica:', frytownica?.product.name);
  console.log('  Tags:', frytownica?.product.tags);
  console.log('  Variant ID:', frytownica?.id);
  
  console.log('\nSzafka:', szafka?.product.name);
  console.log('  Tags:', szafka?.product.tags);
  console.log('  Variant ID:', szafka?.id);
  
  if (!frytownica || !szafka) {
    console.log('\nProducts not found!');
    return;
  }
  
  // Calculate shipping
  const items = [
    { variantId: frytownica.id, quantity: 1 },
    { variantId: szafka.id, quantity: 1 }
  ];
  
  console.log('\n--- Calculating shipping for cart ---');
  
  const result = await service.calculateShipping(items, 'inpost_kurier');
  
  console.log('\nTotal shipping cost:', result.shippingCost, 'PLN');
  console.log('Is Paczkomat available:', result.isPaczkomatAvailable);
  
  console.log('\nBreakdown:');
  for (const item of result.breakdown) {
    console.log(`  - ${item.description}: ${item.cost} PLN`);
  }
  
  console.log('\nPackages:');
  for (const pkg of result.packages) {
    console.log(`  - ${pkg.id}: type=${pkg.type}, gabarytPrice=${pkg.gabarytPrice}`);
    for (const item of pkg.items) {
      console.log(`      Item: ${item.productName}`);
    }
  }
  
  console.log('\nWarnings:', result.warnings);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
