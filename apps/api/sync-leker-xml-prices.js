/**
 * ============================================
 * SYNC CEN Z XML LEKER → BAZA WBTrade
 * ============================================
 * 
 * Skrypt pobiera plik XML z cenami brutto z Lekera:
 *   https://b2b.leker.pl/xml/drop_pln_pl_light.xml
 * 
 * Następnie:
 * 1. Parsuje XML → wyciąga EAN + cena brutto
 * 2. Mapuje produkty w bazie po polu barcode (EAN)
 * 3. Stosuje mnożnik cen z Settings (price_rules_leker)
 * 4. Zaokrągla do .99
 * 5. Zapisuje nową cenę + historię zmian
 * 
 * Uruchomienie:
 *   node sync-leker-xml-prices.js
 *   node sync-leker-xml-prices.js --dry-run    (podgląd bez zapisu)
 * 
 * Do crona (raz dziennie o 10:00):
 *   0 10 * * * cd /path/to/apps/api && node sync-leker-xml-prices.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { loadPriceRules, applyPriceMultiplier } = require('./lib/price-rules');

const prisma = new PrismaClient();

const LEKER_XML_URL = 'https://b2b.leker.pl/xml/drop_pln_pl_light.xml';
const DRY_RUN = process.argv.includes('--dry-run');
const WAREHOUSE_KEY = 'leker';

// ============================================
// XML PARSING
// ============================================

/**
 * Pobiera i parsuje XML z Lekera.
 * Zwraca mapę: EAN → { brutto, netto, name, stock, id }
 */
async function fetchLekerXmlPrices() {
  console.log(`📥 Pobieranie XML z: ${LEKER_XML_URL}`);
  
  const response = await fetch(LEKER_XML_URL, {
    headers: { 'User-Agent': 'WBTrade-PriceSync/1.0' },
    signal: AbortSignal.timeout(60000), // 60s timeout
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const xmlText = await response.text();
  console.log(`   Pobrano ${(xmlText.length / 1024 / 1024).toFixed(1)} MB`);
  
  // Parse XML using regex (lightweight, no extra dependencies)
  const priceMap = new Map();
  
  // Match each <p>...</p> product block
  const productRegex = /<p>([\s\S]*?)<\/p>/g;
  let match;
  let totalProducts = 0;
  let withEan = 0;
  
  while ((match = productRegex.exec(xmlText)) !== null) {
    totalProducts++;
    const block = match[1];
    
    const ean = extractTagValue(block, 'ean13');
    if (!ean || ean.trim() === '') continue;
    withEan++;
    
    const brutto = parseFloat(extractTagValue(block, 'brutto')) || 0;
    const netto = parseFloat(extractTagValue(block, 'netto')) || 0;
    const stock = parseInt(extractTagValue(block, 'stock')) || 0;
    const id = extractTagValue(block, 'id');
    const name = extractCdata(block, 'name');
    
    if (brutto > 0) {
      priceMap.set(ean.trim(), { brutto, netto, stock, id, name });
    }
  }
  
  console.log(`   Produkty w XML: ${totalProducts}`);
  console.log(`   Z EAN i ceną: ${withEan}`);
  
  return priceMap;
}

function extractTagValue(block, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const m = block.match(regex);
  return m ? m[1].trim() : null;
}

function extractCdata(block, tag) {
  const regex = new RegExp(`<${tag}>[\\s]*<!\\[CDATA\\[([^\\]]*?)\\]\\]>[\\s]*</${tag}>`);
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

async function syncLekerXmlPrices() {
  const startTime = Date.now();
  
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(DRY_RUN 
    ? '  🔍 DRY RUN — Podgląd zmian cen z XML Leker'
    : '  💰 SYNC CEN Z XML LEKER → BAZA');
  console.log('═══════════════════════════════════════════');
  console.log('');
  
  // 1. Pobierz i sparsuj XML
  const xmlPrices = await fetchLekerXmlPrices();
  
  // 2. Załaduj reguły cenowe (mnożniki)
  const priceRules = await loadPriceRules(prisma);
  const lekerRules = priceRules[WAREHOUSE_KEY] || [];
  console.log(`\n📊 Reguły cenowe Leker: ${lekerRules.length} reguł`);
  for (const rule of lekerRules) {
    console.log(`   ${rule.priceFrom}–${rule.priceTo} zł: ×${rule.multiplier} +${rule.addToPrice} zł`);
  }
  
  // 3. Pobierz produkty Leker z bazy (po baselinkerProductId starting with "leker-")
  const lekerProducts = await prisma.product.findMany({
    where: {
      baselinkerProductId: { startsWith: 'leker-' },
      barcode: { not: null },
    },
    select: {
      id: true,
      name: true,
      barcode: true,
      price: true,
      baselinkerProductId: true,
      variants: {
        select: { id: true, price: true, barcode: true }
      }
    }
  });
  
  console.log(`\n🗄️  Produkty Leker w bazie: ${lekerProducts.length}`);
  console.log(`📦 Produkty w XML z ceną: ${xmlPrices.size}`);
  
  // 4. Mapuj i oblicz nowe ceny
  let matched = 0;
  let priceChanged = 0;
  let priceUnchanged = 0;
  let notFound = 0;
  let errors = 0;
  
  const changes = []; // do wyświetlenia podsumowania
  
  for (const product of lekerProducts) {
    const ean = product.barcode?.trim();
    if (!ean) continue;
    
    const xmlData = xmlPrices.get(ean);
    if (!xmlData) {
      notFound++;
      continue;
    }
    
    matched++;
    
    const currentPrice = parseFloat(product.price);
    const newPrice = calculateFinalPrice(xmlData.brutto, priceRules);
    
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
      xmlBrutto: xmlData.brutto,
      variants: product.variants,
    };
    
    changes.push(change);
    
    // W dry-run wyświetlamy sample
    if (DRY_RUN && priceChanged <= 20) {
      console.log(`   ${product.name.substring(0, 50).padEnd(50)} | ${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)} zł (XML brutto: ${xmlData.brutto})`);
    }
  }
  
  // 5. Zapisz do bazy (jeśli nie dry-run)
  if (!DRY_RUN && changes.length > 0) {
    console.log(`\n💾 Zapisywanie ${changes.length} zmian cen...`);
    
    let saved = 0;
    for (const change of changes) {
      try {
        // Update product price
        await prisma.product.update({
          where: { id: change.productId },
          data: { price: change.newPrice }
        });
        
        // Update variant prices too
        for (const variant of change.variants) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { price: change.newPrice }
          });
        }
        
        // Record price history
        await prisma.priceHistory.create({
          data: {
            productId: change.productId,
            variantId: change.variants[0]?.id || null,
            oldPrice: change.oldPrice,
            newPrice: change.newPrice,
            source: 'BASELINKER',
            reason: `Sync z XML Leker (brutto XML: ${change.xmlBrutto} zł)`,
          }
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
  }
  
  // 6. Podsumowanie
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  PODSUMOWANIE');
  console.log('═══════════════════════════════════════════');
  console.log(`  Produkty Leker w bazie:    ${lekerProducts.length}`);
  console.log(`  Zmapowane po EAN:          ${matched}`);
  console.log(`  Cena zmieniona:            ${priceChanged}`);
  console.log(`  Cena bez zmian:            ${priceUnchanged}`);
  console.log(`  Brak w XML (nie znaleziono EAN): ${notFound}`);
  console.log(`  Błędy:                     ${errors}`);
  console.log(`  Czas:                      ${elapsed}s`);
  console.log(`  Tryb:                      ${DRY_RUN ? 'DRY RUN (bez zapisu)' : 'ZAPIS DO BAZY'}`);
  console.log('═══════════════════════════════════════════');
  console.log('');
  
  if (DRY_RUN && priceChanged > 20) {
    console.log(`   (... wyświetlono 20 z ${priceChanged} zmian)`);
  }
}

// ============================================
// RUN
// ============================================

syncLekerXmlPrices()
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
