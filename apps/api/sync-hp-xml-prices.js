/**
 * ============================================
 * SYNC CEN Z XML HP → BAZA WBTrade
 * ============================================
 *
 * Skrypt pobiera plik XML z cenami z Hurtowni Przemysłowej (HP):
 *   https://www.hurtowniaprzemyslowa.pl/xml/baselinker.xml
 *
 * Następnie:
 * 1. Parsuje XML → wyciąga EAN (z <a name="EAN">) + price (atrybut <o price="...">)
 * 2. Mapuje produkty w bazie po polu barcode (EAN)
 * 3. Stosuje mnożnik cen z Settings (price_rules_hp)
 * 4. Zaokrągla do .99
 * 5. Zapisuje nową cenę + historię zmian
 *
 * Uruchomienie:
 *   node sync-hp-xml-prices.js
 *   node sync-hp-xml-prices.js --dry-run    (podgląd bez zapisu)
 *
 * Do crona (raz dziennie o 6:00):
 *   0 6 * * * cd /path/to/apps/api && node sync-hp-xml-prices.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { loadPriceRules, applyPriceMultiplier } = require('./lib/price-rules');

const prisma = new PrismaClient();

const HP_XML_URL = 'https://www.hurtowniaprzemyslowa.pl/xml/baselinker.xml';

const DRY_RUN = process.argv.includes('--dry-run');
const WAREHOUSE_KEY = 'hp';

// ============================================
// XML PARSING
// ============================================

/**
 * Pobiera i parsuje XML z HP.
 * Format: <o id="..." price="123.45" ...>
 *           <attrs>
 *             <a name="EAN"><![CDATA[ 1234567890123 ]]></a>
 *           </attrs>
 *         </o>
 * Zwraca mapę: EAN → { price, name }
 */
async function fetchHpXmlPrices() {
  console.log(`📥 Pobieranie XML z HP...`);

  const response = await fetch(HP_XML_URL, {
    headers: { 'User-Agent': 'WBTrade-PriceSync/1.0' },
    signal: AbortSignal.timeout(120000), // 120s timeout (duży plik)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xmlText = await response.text();
  console.log(`   Pobrano ${(xmlText.length / 1024 / 1024).toFixed(1)} MB`);

  const priceMap = new Map();

  // Match each <o ...> block
  // <o id="..." price="123.45" ...> ... </o>
  const productRegex = /<o\b([^>]*)>([\s\S]*?)<\/o>/g;
  let match;
  let totalItems = 0;
  let withEan = 0;

  while ((match = productRegex.exec(xmlText)) !== null) {
    totalItems++;
    const attrs = match[1];
    const body = match[2];

    // Wyciągnij cenę z atrybutu price="..."
    const priceMatch = attrs.match(/\bprice="([^"]+)"/);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1]);
    if (!price || price <= 0) continue;

    // Wyciągnij EAN z <a name="EAN"><![CDATA[ ... ]]></a>
    const eanMatch = body.match(/<a\s+name="EAN"[^>]*>\s*(?:<!\[CDATA\[)?\s*([^\]<]+?)\s*(?:\]\]>)?\s*<\/a>/i);
    if (!eanMatch) continue;
    const ean = eanMatch[1].trim();
    if (!ean || ean === '') continue;

    withEan++;

    // Wyciągnij nazwę z <name><![CDATA[ ... ]]></name>
    const nameMatch = body.match(/<name>\s*(?:<!\[CDATA\[)?\s*([\s\S]*?)\s*(?:\]\]>)?\s*<\/name>/i);
    const name = nameMatch ? nameMatch[1].trim() : '';

    priceMap.set(ean, { price, name });
  }

  console.log(`   Pozycje w XML: ${totalItems}`);
  console.log(`   Z EAN i ceną: ${withEan}`);

  return priceMap;
}

// ============================================
// PRICE CALCULATION
// ============================================

function priceTo99(price) {
  return price <= 0 ? 0 : Math.floor(price) + 0.99;
}

function calculateFinalPrice(rawPrice, priceRules) {
  // Cena z XML → mnożnik → zaokrąglenie do .99
  const afterMultiplier = applyPriceMultiplier(rawPrice, WAREHOUSE_KEY, priceRules);
  return priceTo99(afterMultiplier);
}

// ============================================
// MAIN SYNC
// ============================================

async function syncHpXmlPrices() {
  const startTime = Date.now();

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(DRY_RUN
    ? '  🔍 DRY RUN — Podgląd zmian cen z XML HP'
    : '  💰 SYNC CEN Z XML HP → BAZA');
  console.log('═══════════════════════════════════════════');
  console.log('');

  // 1. Pobierz i sparsuj XML
  const xmlPrices = await fetchHpXmlPrices();

  // 2. Załaduj reguły cenowe (mnożniki)
  const priceRules = await loadPriceRules(prisma);
  const hpRules = priceRules[WAREHOUSE_KEY] || [];
  console.log(`\n📊 Reguły cenowe HP: ${hpRules.length} reguł`);
  for (const rule of hpRules) {
    console.log(`   ${rule.priceFrom}–${rule.priceTo} zł: ×${rule.multiplier} +${rule.addToPrice} zł`);
  }

  // 3. Pobierz produkty HP z bazy (po baselinkerProductId starting with "hp-")
  const hpProducts = await prisma.product.findMany({
    where: {
      baselinkerProductId: { startsWith: 'hp-' },
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

  console.log(`\n🗄️  Produkty HP w bazie: ${hpProducts.length}`);
  console.log(`📦 Produkty w XML z ceną: ${xmlPrices.size}`);

  // 4. Mapuj i oblicz nowe ceny
  let matched = 0;
  let priceChanged = 0;
  let priceUnchanged = 0;
  let notFound = 0;
  let errors = 0;

  const changes = [];

  for (const product of hpProducts) {
    const ean = product.barcode?.trim();
    if (!ean) continue;

    const xmlData = xmlPrices.get(ean);
    if (!xmlData) {
      notFound++;
      continue;
    }

    matched++;

    const currentPrice = parseFloat(product.price);
    const newPrice = calculateFinalPrice(xmlData.price, priceRules);

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
      xmlPrice: xmlData.price,
      variants: product.variants,
    };

    changes.push(change);

    // W dry-run wyświetlamy sample
    if (DRY_RUN && priceChanged <= 20) {
      console.log(`   ${product.name.substring(0, 50).padEnd(50)} | ${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)} zł (XML: ${xmlData.price})`);
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
            reason: `Sync z XML HP (cena XML: ${change.xmlPrice} zł)`,
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
        where: { key: 'last_sync_hp_xml' },
        update: { value: new Date().toISOString() },
        create: { key: 'last_sync_hp_xml', value: new Date().toISOString() },
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
  console.log(`  Produkty HP w bazie:      ${hpProducts.length}`);
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
  syncHpXmlPrices()
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

module.exports = { syncHpXmlPrices };
