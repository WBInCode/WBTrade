/**
 * Sprawdź stany magazynowe produktów HP
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Stany magazynowe produktów HP\n');
  console.log('='.repeat(70));
  
  // Pobierz warianty HP wraz ze stanami magazynowymi
  const hpVariants = await prisma.productVariant.findMany({
    where: { baselinkerVariantId: { startsWith: 'hp-' } },
    include: {
      product: {
        select: {
          name: true,
          sku: true,
          baselinkerProductId: true
        }
      },
      inventory: {
        include: {
          location: true
        }
      }
    },
    orderBy: {
      sku: 'asc'
    }
  });
  
  console.log(`\n🏥 Znaleziono ${hpVariants.length} wariantów HP\n`);
  
  let totalStock = 0;
  let totalReserved = 0;
  let withStock = 0;
  let withoutStock = 0;
  
  hpVariants.forEach((variant, i) => {
    const inventory = variant.inventory[0]; // Pierwszy magazyn
    const stock = inventory ? inventory.quantity : 0;
    const reserved = inventory ? inventory.reserved : 0;
    const location = inventory ? inventory.location.name : 'Brak';
    
    if (stock > 0) withStock++;
    else withoutStock++;
    
    totalStock += stock;
    totalReserved += reserved;
    
    console.log(`${i + 1}. ${variant.product.name.substring(0, 55)}`);
    console.log(`   SKU: ${variant.product.sku}`);
    console.log(`   📦 Stan: ${stock} szt. | Zarezerwowane: ${reserved} szt.`);
    console.log(`   📍 Lokalizacja: ${location}`);
    console.log('');
  });
  
  console.log('='.repeat(70));
  console.log('\n📈 Podsumowanie stanów HP:\n');
  console.log(`   📦 Łączny stan: ${totalStock} sztuk`);
  console.log(`   🔒 Łącznie zarezerwowane: ${totalReserved} sztuk`);
  console.log(`   ✅ Produktów ze stanem > 0: ${withStock}`);
  console.log(`   ⚠️  Produktów bez stanu: ${withoutStock}`);
  console.log(`   📊 Średni stan na produkt: ${(totalStock / hpVariants.length).toFixed(1)} szt.`);
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
