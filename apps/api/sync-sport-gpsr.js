/**
 * sync-sport-gpsr.js
 * 
 * Imports GPSR manufacturer data from Hurtownia Sportowa XML feeds
 * and links products in DB (SKU = HS-{product_id}).
 * 
 * Data sources:
 *   - gpsr.xml: producer address/contact data
 *   - partner_b2b_full XML: product→producer mapping + brand name
 * 
 * Usage:
 *   node sync-sport-gpsr.js --dry-run    # preview
 *   node sync-sport-gpsr.js              # full sync
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

const GPSR_URL = 'https://b2bhurtowniasportowa.net/public/storage/gpsr/gpsr.xml';
const PRODUCTS_URL = 'https://b2bhurtowniasportowa.net/v2/xml/download/format/partner_b2b_full/key/66befd48d0b9e3800ca5d6dc03784db3/lang/pl';

function slugify(name) {
  const polishMap = { 'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ź':'z','ż':'z',
                      'Ą':'a','Ć':'c','Ę':'e','Ł':'l','Ń':'n','Ó':'o','Ś':'s','Ź':'z','Ż':'z' };
  return name.toLowerCase()
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, c => polishMap[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    let data = '';
    https.get(url, (res) => {
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ============================================================
// 1. Parse GPSR XML → producer ID → contact data
// ============================================================
function parseGpsrXml(xml) {
  const producers = {};
  const producerPattern = /<producer>([\s\S]*?)<\/producer>/g;
  let match;
  while ((match = producerPattern.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([^<\\]]*?)(?:\\]\\]>)?<\\/${tag}>`));
      return m ? m[1].trim() : null;
    };
    const id = get('id');
    if (!id) continue;
    producers[id] = {
      name: get('name'),
      street: get('street'),
      city: get('city'),
      postalCode: get('postal_code'),
      countryCode: get('country_code'),
      email: get('email'),
      phone: get('phone'),
    };
  }
  return producers;
}

// ============================================================
// 2. Stream products XML → collect product_id → producer_id + brand
// ============================================================
function streamProducts(url) {
  return new Promise((resolve, reject) => {
    const productMap = {}; // product_id → { gpsrProducerId, brand }
    let buffer = '';
    let processed = 0;

    https.get(url, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        let startIdx;
        while ((startIdx = buffer.indexOf('<product>')) !== -1) {
          const endIdx = buffer.indexOf('</product>', startIdx);
          if (endIdx === -1) { buffer = buffer.substring(startIdx); break; }
          const productXml = buffer.substring(startIdx, endIdx + '</product>'.length);
          buffer = buffer.substring(endIdx + '</product>'.length);
          processed++;

          const idMatch = productXml.match(/<id>(\d+)<\/id>/);
          const brandMatch = productXml.match(/<producer><!\[CDATA\[([^\]]*)\]\]><\/producer>/);
          
          // Get GPSR producer ID from nested <gpsr> section
          const gpsrSection = productXml.match(/<gpsr>([\s\S]*?)<\/gpsr>/);
          let gpsrProdId = '0';
          if (gpsrSection) {
            const prodM = gpsrSection[1].match(/<producer>(\d+)<\/producer>/);
            if (prodM) gpsrProdId = prodM[1];
          }

          if (idMatch && (gpsrProdId !== '0' || brandMatch)) {
            productMap[idMatch[1]] = {
              gpsrProducerId: gpsrProdId !== '0' ? gpsrProdId : null,
              brand: brandMatch ? brandMatch[1].trim() : null,
            };
          }

          if (processed % 10000 === 0) {
            process.stdout.write(`\rParsed ${processed} products, ${Object.keys(productMap).length} with brand/GPSR...`);
          }
        }
      });
      res.on('end', () => {
        const withGpsr = Object.values(productMap).filter(p => p.gpsrProducerId).length;
        const brandOnly = Object.values(productMap).filter(p => !p.gpsrProducerId && p.brand).length;
        console.log(`\nParsed ${processed} products total.`);
        console.log(`  With GPSR producer: ${withGpsr}`);
        console.log(`  Brand only (no GPSR): ${brandOnly}`);
        resolve(productMap);
      });
    }).on('error', reject);
  });
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  try {
    console.log(DRY_RUN ? '=== DRY RUN ===\n' : '=== SYNC START ===\n');

    // Step 1: Parse GPSR data
    console.log('1. Pobieranie gpsr.xml...');
    const gpsrXml = await fetchText(GPSR_URL);
    const gpsrProducers = parseGpsrXml(gpsrXml);
    console.log(`   Załadowano ${Object.keys(gpsrProducers).length} producentów GPSR\n`);

    // Step 2: Stream products to get product→producer mapping
    console.log('2. Pobieranie i parsowanie pełnego XML produktów...');
    const productMap = await streamProducts(PRODUCTS_URL);

    // Step 3: Group products
    // A) Products with GPSR producer ID → use GPSR data for manufacturer
    // B) Products with brand only → match/create manufacturer by brand name
    const gpsrGroups = {}; // gpsrId → { brand, productIds[] }
    const brandGroups = {}; // brand → [productIds]
    
    for (const [productId, { gpsrProducerId, brand }] of Object.entries(productMap)) {
      if (gpsrProducerId) {
        if (!gpsrGroups[gpsrProducerId]) {
          gpsrGroups[gpsrProducerId] = { brand, productIds: [] };
        }
        gpsrGroups[gpsrProducerId].productIds.push(productId);
      } else if (brand && brand !== 'Inny' && brand !== 'No name') {
        if (!brandGroups[brand]) brandGroups[brand] = [];
        brandGroups[brand].push(productId);
      }
    }

    console.log(`\n3. Tworzenie/aktualizacja producentów w bazie...\n`);

    // Pre-load existing manufacturers
    const existingMfgs = await prisma.manufacturer.findMany();
    const existingByName = {};
    const existingSlugs = new Set();
    for (const m of existingMfgs) {
      existingByName[m.name.toLowerCase()] = m;
      existingSlugs.add(m.slug);
    }
    console.log(`   Istniejących producentów w DB: ${existingMfgs.length}`);

    let created = 0, updated = 0, skipped = 0;
    const gpsrIdToDbMfg = {}; // gpsrProducerId → DB manufacturer

    // --- Phase 3A: GPSR producers (with address data) ---
    console.log('\n   --- Producenci z danymi GPSR ---');
    for (const [gpsrId, { brand, productIds }] of Object.entries(gpsrGroups)) {
      const gpsrData = gpsrProducers[gpsrId];
      if (!gpsrData) {
        skipped += productIds.length;
        continue;
      }

      const addressParts = [gpsrData.street, `${gpsrData.postalCode || ''} ${gpsrData.city || ''}`.trim(), gpsrData.countryCode].filter(Boolean);
      const address = addressParts.join(', ');

      const mfgName = gpsrData.name || brand || `Producer ${gpsrId}`;
      const nameLower = mfgName.toLowerCase();
      const existing = existingByName[nameLower];

      if (existing) {
        const needsUpdate = (!existing.address && address) || (!existing.email && gpsrData.email) || (!existing.phone && gpsrData.phone);
        if (needsUpdate && !DRY_RUN) {
          await prisma.manufacturer.update({
            where: { id: existing.id },
            data: {
              ...(address && !existing.address ? { address } : {}),
              ...(gpsrData.email && !existing.email ? { email: gpsrData.email } : {}),
              ...(gpsrData.phone && !existing.phone ? { phone: gpsrData.phone } : {}),
            },
          });
          updated++;
        } else if (needsUpdate) {
          updated++;
        }
        gpsrIdToDbMfg[gpsrId] = existing;
      } else {
        let slug = slugify(mfgName);
        let suffix = 1;
        while (existingSlugs.has(slug)) { slug = slugify(mfgName) + '-' + suffix++; }
        existingSlugs.add(slug);

        if (!DRY_RUN) {
          const newMfg = await prisma.manufacturer.create({
            data: { name: mfgName, slug, address: address || null, email: gpsrData.email || null, phone: gpsrData.phone || null },
          });
          gpsrIdToDbMfg[gpsrId] = newMfg;
          existingByName[nameLower] = newMfg;
        } else {
          gpsrIdToDbMfg[gpsrId] = { id: 'dry-run', name: mfgName };
        }
        created++;
        console.log(`   + ${mfgName} (${productIds.length} produktów)`);
      }
    }

    // --- Phase 3B: Brand-only producers (no GPSR address data) ---
    console.log('\n   --- Producenci wg nazwy marki (bez GPSR) ---');
    const brandToDbMfg = {};
    let brandCreated = 0, brandMatched = 0;

    for (const [brand, productIds] of Object.entries(brandGroups)) {
      const nameLower = brand.toLowerCase();
      const existing = existingByName[nameLower];

      if (existing) {
        brandToDbMfg[brand] = existing;
        brandMatched++;
      } else {
        let slug = slugify(brand);
        let suffix = 1;
        while (existingSlugs.has(slug)) { slug = slugify(brand) + '-' + suffix++; }
        existingSlugs.add(slug);

        if (!DRY_RUN) {
          const newMfg = await prisma.manufacturer.create({
            data: { name: brand, slug },
          });
          brandToDbMfg[brand] = newMfg;
          existingByName[nameLower] = newMfg;
        } else {
          brandToDbMfg[brand] = { id: 'dry-run', name: brand };
        }
        brandCreated++;
        console.log(`   + ${brand} (${productIds.length} produktów, bez danych adresowych)`);
      }
    }

    console.log(`\n   GPSR: Utworzono ${created}, Zaktualizowano ${updated}`);
    console.log(`   Marki: Dopasowano ${brandMatched}, Utworzono ${brandCreated}`);

    // Step 4: Link products
    console.log(`\n4. Łączenie produktów z producentami...\n`);

    let linked = 0, notFound = 0;

    // 4A: Link GPSR products
    for (const [gpsrId, { productIds }] of Object.entries(gpsrGroups)) {
      const dbMfg = gpsrIdToDbMfg[gpsrId];
      if (!dbMfg) continue;

      const skus = productIds.map(pid => `HS-${pid}`);
      for (let i = 0; i < skus.length; i += 500) {
        const batch = skus.slice(i, i + 500);
        if (!DRY_RUN) {
          const result = await prisma.product.updateMany({
            where: { sku: { in: batch }, manufacturerId: null },
            data: { manufacturerId: dbMfg.id },
          });
          linked += result.count;
          notFound += batch.length - result.count;
        } else {
          const count = await prisma.product.count({ where: { sku: { in: batch }, manufacturerId: null } });
          linked += count;
          notFound += batch.length - count;
        }
      }
    }

    // 4B: Link brand-only products
    for (const [brand, productIds] of Object.entries(brandGroups)) {
      const dbMfg = brandToDbMfg[brand];
      if (!dbMfg) continue;

      const skus = productIds.map(pid => `HS-${pid}`);
      for (let i = 0; i < skus.length; i += 500) {
        const batch = skus.slice(i, i + 500);
        if (!DRY_RUN) {
          const result = await prisma.product.updateMany({
            where: { sku: { in: batch }, manufacturerId: null },
            data: { manufacturerId: dbMfg.id },
          });
          linked += result.count;
          notFound += batch.length - result.count;
        } else {
          const count = await prisma.product.count({ where: { sku: { in: batch }, manufacturerId: null } });
          linked += count;
          notFound += batch.length - count;
        }
      }
    }

    console.log(`\n=== PODSUMOWANIE ===`);
    console.log(`Producentów GPSR w xml: ${Object.keys(gpsrProducers).length}`);
    console.log(`Produktów w XML ogółem: ${Object.keys(productMap).length}`);
    console.log(`  - z GPSR: ${Object.values(productMap).filter(p => p.gpsrProducerId).length}`);
    console.log(`  - tylko marka: ${Object.values(productMap).filter(p => !p.gpsrProducerId && p.brand).length}`);
    console.log(`Producentów GPSR utworzonych: ${created}`);
    console.log(`Producentów GPSR zaktualizowanych: ${updated}`);
    console.log(`Producentów wg marki dopasowanych: ${brandMatched}`);
    console.log(`Producentów wg marki utworzonych: ${brandCreated}`);
    console.log(`Produktów połączonych: ${linked}`);
    console.log(`Produktów nie znalezionych w DB: ${notFound}`);
    console.log(DRY_RUN ? '\n(DRY RUN — nic nie zapisano)' : '\nGotowe!');

  } catch (err) {
    console.error('Błąd:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
