/**
 * ============================================
 * SYNC CEN Z XML BTP → BAZA WBTrade
 * ============================================
 *
 * Skrypt pobiera plik XML z cenami z BTP (format InventoryReport):
 *   https://ext.btp.link/Gateway/ExportData/InventoryReport?Format=Xml&...
 *
 * Następnie:
 * 1. Parsuje XML → wyciąga EAN + UnitRetailPrice (cena detaliczna brutto)
 * 2. Mapuje produkty w bazie po polu barcode (EAN)
 * 3. Stosuje mnożnik cen z Settings (price_rules_btp)
 * 4. Zaokrągla do .99
 * 5. Zapisuje nową cenę + historię zmian
 *
 * Uruchomienie:
 *   node sync-btp-xml-prices.js
 *   node sync-btp-xml-prices.js --dry-run    (podgląd bez zapisu)
 *
 * Do crona (raz dziennie o 6:00):
 *   0 6 * * * cd /path/to/apps/api && node sync-btp-xml-prices.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { loadPriceRules, applyPriceMultiplier } = require('./lib/price-rules');

const prisma = new PrismaClient();

const BTP_XML_URL =
  'https://ext.btp.link/Gateway/ExportData/InventoryReport?Format=Xml' +
  '&u=7C93A576-737A-4E62-B0AD-C2CB40FAB893' +
  '&uc=A694FB15-1C0E-4A1C-81B8-6423BB43547A';

const DRY_RUN = process.argv.includes('--dry-run');
const WAREHOUSE_KEY = 'btp';

// ============================================
// XML PARSING
// ============================================

/**
 * Pobiera i parsuje XML z BTP.
 * Format: <Line><Line-Item><EAN>...</EAN><UnitRetailPrice>...</UnitRetailPrice></Line-Item></Line>
 * Zwraca mapę: EAN → { retailPrice, netPrice, quantity, name }
 */
async function fetchBtpXmlPrices() {
  console.log(`📥 Pobieranie XML z BTP...`);

  const response = await fetch(BTP_XML_URL, {
    headers: { 'User-Agent': 'WBTrade-PriceSync/1.0' },
    signal: AbortSignal.timeout(60000), // 60s timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xmlText = await response.text();
  console.log(`   Pobrano ${(xmlText.length / 1024 / 1024).toFixed(1)} MB`);

  const priceMap = new Map();

  // Match each <Line-Item>...</Line-Item> block
  const lineItemRegex = /<Line-Item>([\s\S]*?)<\/Line-Item>/g;
  let match;
  let totalItems = 0;
  let withEan = 0;

  while ((match = lineItemRegex.exec(xmlText)) !== null) {
    totalItems++;
    const block = match[1];

    const ean = extractTagValue(block, 'EAN');
    if (!ean || ean.trim() === '') continue;
    withEan++;

    const retailPrice = parseFloat(extractTagValue(block, 'UnitRetailPrice')) || 0;
    const netPrice = parseFloat(extractTagValue(block, 'UnitNetPrice')) || 0;
    const quantity = parseFloat(extractTagValue(block, 'QuantityOnHand')) || 0;
    const name = extractTagValue(block, 'ItemDescription') || '';

    if (retailPrice > 0) {
      priceMap.set(ean.trim(), { retailPrice, netPrice, quantity, name });
    }
  }

  console.log(`   Pozycje w XML: ${totalItems}`);
  console.log(`   Z EAN i ceną: ${withEan}`);

  return priceMap;
}

function extractTagValue(block, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const m = block.match(regex);
  return m ? m[1].trim() : null;
}

// ============================================
// PRICE CALCULATION
// ============================================

function priceTo99(price) {
  return price <= 0 ? 0 : Math.floor(price) + 0.99;
}

function calculateFinalPrice(bruttoFromXml, priceRules) {
  // Cena brutto z XML → mnożnik → zaokrąglenie do .99
  const afterMultiplier = applyPriceMultiplier(bruttoFromXml, WAREHOUSE_KEY, priceRules);
  return priceTo99(afterMultiplier);
}

// ============================================
// MAIN SYNC
// ============================================

async function syncBtpXmlPrices() {
  const startTime = Date.now();

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(DRY_RUN
    ? '  🔍 DRY RUN — Podgląd zmian cen z XML BTP'
    : '  💰 SYNC CEN Z XML BTP → BAZA');
  console.log('═══════════════════════════════════════════');
  console.log('');

  // 1. Pobierz i sparsuj XML
  const xmlPrices = await fetchBtpXmlPrices();

  // 2. Załaduj reguły cenowe (mnożniki)
  const priceRules = await loadPriceRules(prisma);
  const btpRules = priceRules[WAREHOUSE_KEY] || [];
  console.log(`\n📊 Reguły cenowe BTP: ${btpRules.length} reguł`);
  for (const rule of btpRules) {
    console.log(`   ${rule.priceFrom}–${rule.priceTo} zł: ×${rule.multiplier} +${rule.addToPrice} zł`);
  }

  // 3. Pobierz produkty BTP z bazy (po baselinkerProductId starting with "btp-")
  const btpProducts = await prisma.product.findMany({
    where: {
      baselinkerProductId: { startsWith: 'btp-' },
      barcode: { not: null },
    },
    select: {
      id: true,
      name: true,
      barcode: true,
      price: true,
      baselinkerProductId: true,
      variants: {
        select: { id: true, price: true, barcode: true },
      },
    },
  });

  console.log(`\n🗄️  Produkty BTP w bazie: ${btpProducts.length}`);
  console.log(`📦 Produkty w XML z ceną: ${xmlPrices.size}`);

  // 4. Mapuj i oblicz nowe ceny
  let matched = 0;
  let priceChanged = 0;
  let priceUnchanged = 0;
  let notFound = 0;
  let errors = 0;

  const changes = [];

  for (const product of btpProducts) {
    const ean = product.barcode?.trim();
    if (!ean) continue;

    const xmlData = xmlPrices.get(ean);
    if (!xmlData) {
      notFound++;
      continue;
    }

    matched++;

    const currentPrice = parseFloat(product.price);
    const newPrice = calculateFinalPrice(xmlData.retailPrice, priceRules);

    if (Math.abs(currentPrice - newPrice) < 0.01) {
      priceUnchanged++;
      continue;
    }

    priceChanged++;

    const change = {
      productId: product.id,
      name: product.name,
      ean,
      oldPrice: currentPrice,
      newPrice,
      xmlRetailPrice: xmlData.retailPrice,
      variants: product.variants,
    };

    changes.push(change);

    // W dry-run wyświetlamy sample
    if (DRY_RUN && priceChanged <= 20) {
      console.log(`   ${product.name.substring(0, 50).padEnd(50)} | ${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)} zł (XML brutto: ${xmlData.retailPrice})`);
    }
  }

  // 5. Zapisz do bazy (jeśli nie dry-run)
  if (!DRY_RUN && changes.length > 0) {
    console.log(`\n💾 Zapisywanie ${changes.length} zmian cen...`);

    let saved = 0;
    for (const change of changes) {
      try {
        await prisma.product.update({
          where: { id: change.productId },
          data: { price: change.newPrice },
        });

        for (const variant of change.variants) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { price: change.newPrice },
          });
        }

        await prisma.priceHistory.create({
          data: {
            productId: change.productId,
            variantId: change.variants[0]?.id || null,
            oldPrice: change.oldPrice,
            newPrice: change.newPrice,
            source: 'BASELINKER',
            reason: `Sync z XML BTP (brutto XML: ${change.xmlRetailPrice} zł)`,
          },
        });

        saved++;
        if (saved % 100 === 0) {
          console.log(`   ... zapisano ${saved}/${changes.length}`);
        }
      } catch (err) {
        errors++;
        if (errors <= 5) {
          console.error(`   ✗ Błąd dla ${change.ean}: ${err.message}`);
        }
      }
    }

    console.log(`   ✅ Zapisano: ${saved} | Błędy: ${errors}`);

    // Zapisz timestamp ostatniej synchronizacji
    try {
      await prisma.settings.upsert({
        where: { key: 'last_sync_btp_xml' },
        update: { value: new Date().toISOString() },
        create: { key: 'last_sync_btp_xml', value: new Date().toISOString() },
      });
    } catch (e) {
      console.warn('  Ostrzeżenie: nie udało się zapisać timestampu synchronizacji:', e.message);
    }
  }

  // 6. Podsumowanie
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  PODSUMOWANIE');
  console.log('═══════════════════════════════════════════');
  console.log(`  Produkty BTP w bazie:     ${btpProducts.length}`);
  console.log(`  Zmapowane po EAN:         ${matched}`);
  console.log(`  Cena zmieniona:           ${priceChanged}`);
  console.log(`  Cena bez zmian:           ${priceUnchanged}`);
  console.log(`  Brak w XML:               ${notFound}`);
  console.log(`  Błędy:                    ${errors}`);
  console.log(`  Czas:                     ${elapsed}s`);
  console.log(`  Tryb:                     ${DRY_RUN ? 'DRY RUN (bez zapisu)' : 'ZAPIS DO BAZY'}`);
  console.log('═══════════════════════════════════════════');
  console.log('');

  if (DRY_RUN && priceChanged > 20) {
    console.log(`   (... wyświetlono 20 z ${priceChanged} zmian)`);
  }

  return { matched, priceChanged, priceUnchanged, notFound, errors, elapsedSec: parseFloat(elapsed) };
}

// ============================================
// RUN (standalone) / EXPORT (worker)
// ============================================

if (require.main === module) {
  syncBtpXmlPrices()
    .then(() => {
      console.log('✅ Zakończono.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Błąd krytyczny:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

module.exports = { syncBtpXmlPrices };
