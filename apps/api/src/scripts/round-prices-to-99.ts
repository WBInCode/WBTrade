/**
 * Skrypt jednorazowy do zaokrąglenia wszystkich cen produktów do .99
 * 
 * Użycie: npx tsx src/scripts/round-prices-to-99.ts [--dry-run]
 * 
 * Opcje:
 *   --dry-run  Tylko symulacja, bez zmian w bazie
 */

import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

const isDryRun = process.argv.includes('--dry-run');

/**
 * Round price to .99 ending (e.g., 12.34 → 12.99, 50.00 → 50.99)
 */
function roundPriceTo99(price: number): number {
  if (price <= 0) return 0;
  return Math.floor(price) + 0.99;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Zaokrąglanie cen produktów do .99');
  console.log('='.repeat(60));
  console.log(`Tryb: ${isDryRun ? 'DRY RUN (bez zmian)' : 'PRODUKCJA (zmiany w bazie)'}`);
  console.log('');

  try {
    // 1. Pobierz wszystkie warianty z cenami
    const variants = await prisma.productVariant.findMany({
      select: {
        id: true,
        sku: true,
        price: true,
        lowestPrice30Days: true,
        compareAtPrice: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`Znaleziono ${variants.length} wariantów do sprawdzenia\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const variant of variants) {
      const currentPrice = Number(variant.price);
      const newPrice = roundPriceTo99(currentPrice);
      
      // Sprawdź czy cena już kończy się na .99
      const isAlready99 = Math.abs(currentPrice - newPrice) < 0.01;
      
      if (isAlready99) {
        skipped++;
        continue;
      }

      // Zaokrąglij też lowestPrice30Days i compareAtPrice
      const newLowestPrice = variant.lowestPrice30Days 
        ? roundPriceTo99(Number(variant.lowestPrice30Days))
        : null;
      
      const newCompareAtPrice = variant.compareAtPrice 
        ? roundPriceTo99(Number(variant.compareAtPrice))
        : null;

      console.log(`[${variant.sku}] ${variant.product.name}`);
      console.log(`  Cena: ${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)}`);
      if (newLowestPrice) {
        console.log(`  Najniższa 30 dni: ${Number(variant.lowestPrice30Days).toFixed(2)} → ${newLowestPrice.toFixed(2)}`);
      }
      if (newCompareAtPrice) {
        console.log(`  Cena porównawcza: ${Number(variant.compareAtPrice).toFixed(2)} → ${newCompareAtPrice.toFixed(2)}`);
      }

      if (!isDryRun) {
        try {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              price: new Prisma.Decimal(newPrice),
              lowestPrice30Days: newLowestPrice ? new Prisma.Decimal(newLowestPrice) : undefined,
              compareAtPrice: newCompareAtPrice ? new Prisma.Decimal(newCompareAtPrice) : undefined,
            },
          });
          updated++;
        } catch (err) {
          console.error(`  BŁĄD: ${err}`);
          errors++;
        }
      } else {
        updated++;
      }
    }

    // 2. Zaktualizuj też ceny w tabeli Product (jeśli istnieje)
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    console.log(`\nSprawdzanie ${products.length} produktów głównych...\n`);

    let productUpdated = 0;
    for (const product of products) {
      if (!product.price) continue;
      
      const currentPrice = Number(product.price);
      const newPrice = roundPriceTo99(currentPrice);
      
      const isAlready99 = Math.abs(currentPrice - newPrice) < 0.01;
      
      if (isAlready99) continue;

      console.log(`[Product] ${product.name}: ${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)}`);

      if (!isDryRun) {
        try {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              price: new Prisma.Decimal(newPrice),
            },
          });
          productUpdated++;
        } catch (err) {
          console.error(`  BŁĄD: ${err}`);
          errors++;
        }
      } else {
        productUpdated++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('PODSUMOWANIE:');
    console.log('='.repeat(60));
    console.log(`Warianty:`);
    console.log(`  - Zaktualizowane: ${updated}`);
    console.log(`  - Pominięte (już .99): ${skipped}`);
    console.log(`  - Błędy: ${errors}`);
    console.log(`Produkty główne:`);
    console.log(`  - Zaktualizowane: ${productUpdated}`);
    
    if (isDryRun) {
      console.log('\n⚠️  To był DRY RUN - żadne zmiany nie zostały zapisane.');
      console.log('    Uruchom bez --dry-run aby zapisać zmiany.');
    } else {
      console.log('\n✅ Zmiany zostały zapisane w bazie danych.');
    }

  } catch (error) {
    console.error('Błąd:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
