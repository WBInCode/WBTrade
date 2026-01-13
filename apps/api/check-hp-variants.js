/**
 * Sprawdź warianty produktów HP
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Sprawdzanie wariantów produktów HP\n');
  console.log('='.repeat(60));
  
  // Sprawdź warianty z prefiksem hp-
  const hpVariants = await prisma.productVariant.findMany({
    where: { baselinkerVariantId: { startsWith: 'hp-' } },
    include: {
      product: {
        select: {
          name: true,
          sku: true,
          baselinkerProductId: true
        }
      }
    }
  });
  
  console.log(`\n📊 Znaleziono ${hpVariants.length} wariantów HP\n`);
  
  if (hpVariants.length > 0) {
    console.log('📋 Lista wariantów HP:\n');
    
    hpVariants.forEach((v, i) => {
      console.log(`${i + 1}. Wariant: ${v.name}`);
      console.log(`   SKU Wariantu: ${v.sku}`);
      console.log(`   Baselinker Variant ID: ${v.baselinkerVariantId}`);
      console.log(`   Produkt: ${v.product.name.substring(0, 60)}`);
      console.log(`   SKU Produktu: ${v.product.sku}`);
      console.log(`   Product Baselinker ID: ${v.product.baselinkerProductId}\n`);
    });
  } else {
    console.log('⚠️  Brak wariantów HP w tabeli product_variants!\n');
    
    // Sprawdź produkty HP
    const hpProducts = await prisma.product.count({
      where: { baselinkerProductId: { startsWith: 'hp-' } }
    });
    
    console.log(`Produktów HP w tabeli products: ${hpProducts}`);
    console.log('\n❌ Problem: Produkty HP istnieją ale nie mają wariantów!\n');
  }
  
  console.log('='.repeat(60));
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
