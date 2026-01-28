/**
 * Omnibus Backfill Script
 * 
 * Inicjalizuje pole lowestPrice30Days dla wszystkich istniejących produktów i wariantów.
 * Dla produktów bez historii cen, lowestPrice30Days = obecna cena.
 * 
 * Użycie:
 *   cd apps/api
 *   npx ts-node src/scripts/omnibus-backfill.ts
 * 
 * UWAGA: Uruchom ten skrypt TYLKO RAZ po wdrożeniu modelu PriceHistory.
 */

import { prisma } from '../db';

async function backfillOmnibusData() {
  console.log('🚀 Rozpoczynam backfill danych Omnibus...\n');

  // ==================================================
  // KROK 1: Inicjalizacja produktów bez lowestPrice30Days
  // ==================================================
  console.log('📦 KROK 1: Inicjalizacja produktów...');
  
  const productsToUpdate = await prisma.product.findMany({
    where: {
      lowestPrice30Days: null,
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  console.log(`   Znaleziono ${productsToUpdate.length} produktów bez lowestPrice30Days`);

  let productUpdatedCount = 0;
  for (const product of productsToUpdate) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        lowestPrice30Days: product.price,
        lowestPrice30DaysAt: new Date(),
      },
    });
    productUpdatedCount++;
    
    if (productUpdatedCount % 100 === 0) {
      console.log(`   Zaktualizowano ${productUpdatedCount}/${productsToUpdate.length} produktów...`);
    }
  }
  
  console.log(`   ✅ Zaktualizowano ${productUpdatedCount} produktów\n`);

  // ==================================================
  // KROK 2: Inicjalizacja wariantów bez lowestPrice30Days
  // ==================================================
  console.log('🎨 KROK 2: Inicjalizacja wariantów...');
  
  const variantsToUpdate = await prisma.productVariant.findMany({
    where: {
      lowestPrice30Days: null,
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  console.log(`   Znaleziono ${variantsToUpdate.length} wariantów bez lowestPrice30Days`);

  let variantUpdatedCount = 0;
  for (const variant of variantsToUpdate) {
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: {
        lowestPrice30Days: variant.price,
        lowestPrice30DaysAt: new Date(),
      },
    });
    variantUpdatedCount++;
    
    if (variantUpdatedCount % 100 === 0) {
      console.log(`   Zaktualizowano ${variantUpdatedCount}/${variantsToUpdate.length} wariantów...`);
    }
  }
  
  console.log(`   ✅ Zaktualizowano ${variantUpdatedCount} wariantów\n`);

  // ==================================================
  // PODSUMOWANIE
  // ==================================================
  console.log('📊 PODSUMOWANIE:');
  console.log(`   Produkty zaktualizowane: ${productUpdatedCount}`);
  console.log(`   Warianty zaktualizowane: ${variantUpdatedCount}`);
  console.log('\n✅ Backfill zakończony pomyślnie!');
  console.log('\n⚠️  WAŻNE: Od teraz każda zmiana ceny będzie rejestrowana w tabeli PriceHistory');
  console.log('   i lowestPrice30Days będzie automatycznie przeliczany.\n');
}

// Główna funkcja
async function main() {
  try {
    await backfillOmnibusData();
  } catch (error) {
    console.error('❌ Błąd podczas backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
