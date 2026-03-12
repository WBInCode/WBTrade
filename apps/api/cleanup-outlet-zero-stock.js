/**
 * Skrypt czyszczenia produktów outlet ze stanem 0
 * 
 * 1. Ustawia stan 0 dla produktów outlet nieznalezionych w BL (usunięte z outlet)
 * 2. Znajduje wszystkie produkty outlet ze stanem magazynowym = 0
 * 3. Usuwa je z bazy (z odpowiednim czyszczeniem powiązanych rekordów)
 * 
 * Użycie:
 *   node cleanup-outlet-zero-stock.js --dry-run   (tylko podgląd)
 *   node cleanup-outlet-zero-stock.js              (usuwanie na żywo)
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
require('dotenv').config();

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

const BL_TOKEN = process.env.BASELINKER_API_TOKEN;
const OUTLET_INVENTORY_ID = '23662';

function callBaselinker(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = `token=${BL_TOKEN}&method=${method}&parameters=${encodeURIComponent(JSON.stringify(params))}`;
    const req = https.request({
      hostname: 'api.baselinker.com',
      path: '/connector.php',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('============================================================');
  console.log('  CZYSZCZENIE PRODUKTÓW OUTLET ZE STANEM 0');
  console.log(`  Tryb: ${isDryRun ? '🔍 DRY RUN (bez zmian)' : '🟢 LIVE (usuwanie z bazy)'}`);
  console.log('============================================================\n');

  // 1. Pobierz stany z BL
  console.log('📊 Pobieranie stanów z Baselinker...');
  const stockResp = await callBaselinker('getInventoryProductsStock', { inventory_id: OUTLET_INVENTORY_ID });
  const blStocks = stockResp.products || {};
  const blProductIds = new Set(Object.keys(blStocks));
  console.log(`   Produkty w BL outlet: ${blProductIds.size}`);

  // 2. Pobierz produkty outlet z bazy
  console.log('\n🔍 Pobieranie produktów outlet z bazy...');
  const outletProducts = await prisma.product.findMany({
    where: {
      baselinkerProductId: { startsWith: 'outlet-' }
    },
    include: {
      variants: {
        include: {
          inventory: true,
          orderItems: { select: { id: true }, take: 1 },
          cartItems: { select: { id: true } },
          stockMovements: { select: { id: true } },
          wishlistItems: { select: { id: true } },
          shoppingListItems: { select: { id: true } },
        }
      },
      images: { select: { id: true } },
      wishlistItems: { select: { id: true } },
      shoppingListItems: { select: { id: true } },
    }
  });
  console.log(`   Produkty outlet w bazie: ${outletProducts.length}`);

  // 3. Identyfikuj produkty ze stanem 0
  const zeroStockProducts = [];
  const hasOrdersProducts = [];
  const activeProducts = [];
  let orphanedCount = 0;

  for (const product of outletProducts) {
    const blIdRaw = product.baselinkerProductId.replace('outlet-', '');
    const inBL = blProductIds.has(blIdRaw);
    
    // Oblicz łączny stan magazynowy
    let totalStock = 0;
    for (const variant of product.variants) {
      for (const inv of variant.inventory) {
        totalStock += inv.quantity;
      }
    }

    // Jeśli nie ma w BL — produkty usunięte z outlet
    if (!inBL) {
      orphanedCount++;
      // Traktuj jak stan 0
      totalStock = 0;
    }

    if (totalStock === 0) {
      // Sprawdź czy warianty mają zamówienia
      const hasOrders = product.variants.some(v => v.orderItems.length > 0);
      if (hasOrders) {
        hasOrdersProducts.push(product);
      } else {
        zeroStockProducts.push(product);
      }
    } else {
      activeProducts.push(product);
    }
  }

  console.log(`\n============================================================`);
  console.log(`  📊 PODSUMOWANIE`);
  console.log(`============================================================`);
  console.log(`  Produkty outlet ogółem:          ${outletProducts.length}`);
  console.log(`  Aktywne (stan > 0):              ${activeProducts.length}`);
  console.log(`  Ze stanem 0 (do usunięcia):      ${zeroStockProducts.length}`);
  console.log(`  Ze stanem 0 ale z zamówieniami:  ${hasOrdersProducts.length}`);
  console.log(`  W tym osierocone (brak w BL):    ${orphanedCount}`);

  // 4. Wyświetl produkty do usunięcia
  if (zeroStockProducts.length > 0) {
    console.log(`\n  🗑️  PRODUKTY DO USUNIĘCIA (${zeroStockProducts.length}):`);
    console.log(`  ${'─'.repeat(56)}`);
    for (const p of zeroStockProducts) {
      const variantCount = p.variants.length;
      console.log(`    ${p.sku.padEnd(26)} | ${variantCount} var. | ${p.name.substring(0, 40)}`);
    }
  }

  if (hasOrdersProducts.length > 0) {
    console.log(`\n  ⚠️  PRODUKTY Z ZAMÓWIENIAMI (dezaktywacja zamiast usunięcia):`);
    console.log(`  ${'─'.repeat(56)}`);
    for (const p of hasOrdersProducts) {
      console.log(`    ${p.sku.padEnd(26)} | ${p.name.substring(0, 40)}`);
    }
  }

  if (isDryRun) {
    console.log(`\n🔍 DRY RUN — żadne zmiany nie zostały wprowadzone`);
    console.log(`   Uruchom bez --dry-run aby usunąć produkty\n`);
    await prisma.$disconnect();
    return;
  }

  // 5. USUWANIE — Produkty bez zamówień
  if (zeroStockProducts.length > 0) {
    console.log(`\n💾 Usuwanie ${zeroStockProducts.length} produktów...`);
    
    let deletedProducts = 0;
    let deletedVariants = 0;
    let deletedCartItems = 0;
    let deletedStockMovements = 0;
    let clearedWishlistRefs = 0;
    let clearedShoppingListRefs = 0;

    for (const product of zeroStockProducts) {
      const variantIds = product.variants.map(v => v.id);

      await prisma.$transaction(async (tx) => {
        // Usuń CartItems powiązane z wariantami
        const cartResult = await tx.cartItem.deleteMany({
          where: { variantId: { in: variantIds } }
        });
        deletedCartItems += cartResult.count;

        // Usuń StockMovements powiązane z wariantami
        const smResult = await tx.stockMovement.deleteMany({
          where: { variantId: { in: variantIds } }
        });
        deletedStockMovements += smResult.count;

        // Wyczyść referencje wariantów w WishlistItems
        const wishResult = await tx.wishlistItem.updateMany({
          where: { variantId: { in: variantIds } },
          data: { variantId: null }
        });
        clearedWishlistRefs += wishResult.count;

        // Wyczyść referencje wariantów w ShoppingListItems
        const slResult = await tx.shoppingListItem.updateMany({
          where: { variantId: { in: variantIds } },
          data: { variantId: null }
        });
        clearedShoppingListRefs += slResult.count;

        // Usuń produkt (cascade: variants, images, priceHistory, wishlistItems, shoppingListItems, saleCampaignProducts)
        // Variant cascade: inventory, priceHistory, saleCampaignProducts
        await tx.product.delete({ where: { id: product.id } });
        
        deletedVariants += variantIds.length;
        deletedProducts++;
      });

      process.stdout.write(`   Usunięto: ${deletedProducts}/${zeroStockProducts.length}\r`);
    }

    console.log(`\n   ✅ Usunięto ${deletedProducts} produktów (${deletedVariants} wariantów)`);
    if (deletedCartItems > 0) console.log(`      Usunięto ${deletedCartItems} pozycji koszyka`);
    if (deletedStockMovements > 0) console.log(`      Usunięto ${deletedStockMovements} ruchów magazynowych`);
    if (clearedWishlistRefs > 0) console.log(`      Wyczyszczono ${clearedWishlistRefs} referencji wishlist`);
    if (clearedShoppingListRefs > 0) console.log(`      Wyczyszczono ${clearedShoppingListRefs} referencji listy zakupów`);
  }

  // 6. DEZAKTYWACJA — Produkty z zamówieniami
  if (hasOrdersProducts.length > 0) {
    console.log(`\n💾 Dezaktywacja ${hasOrdersProducts.length} produktów z zamówieniami...`);
    
    for (const product of hasOrdersProducts) {
      await prisma.$transaction(async (tx) => {
        // Ustaw stan 0 we wszystkich inventory
        for (const variant of product.variants) {
          await tx.inventory.updateMany({
            where: { variantId: variant.id },
            data: { quantity: 0 }
          });
        }
        // Ustaw status DRAFT
        await tx.product.update({
          where: { id: product.id },
          data: { status: 'DRAFT' }
        });
      });
    }
    console.log(`   ✅ Dezaktywowano ${hasOrdersProducts.length} produktów (stan=0, status=DRAFT)`);
  }

  // 7. Podsumowanie
  const remaining = await prisma.product.count({
    where: { baselinkerProductId: { startsWith: 'outlet-' } }
  });
  console.log(`\n============================================================`);
  console.log(`  ✅ ZAKOŃCZONO`);
  console.log(`  Produkty outlet pozostałe w bazie: ${remaining}`);
  console.log(`============================================================\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Błąd:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
