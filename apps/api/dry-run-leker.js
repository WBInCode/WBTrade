/**
 * DRY RUN: Pełna synchronizacja magazynu Leker
 * Sprawdza co by się stało bez zapisu do bazy
 */

require('dotenv').config();
require('dotenv').config({ path: '../../.env' });

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const INVENTORY_ID = '22952'; // Leker

async function getApiToken() {
  try {
    const config = await prisma.baselinkerConfig.findFirst();
    if (config) {
      const key = process.env.BASELINKER_ENCRYPTION_KEY;
      if (key) {
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          Buffer.from(key, 'hex'),
          Buffer.from(config.encryptionIv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(config.authTag, 'hex'));
        let token = decipher.update(config.apiTokenEncrypted, 'hex', 'utf8');
        token += decipher.final('utf8');
        return token;
      }
    }
  } catch (e) { /* fallback */ }
  const token = process.env.BASELINKER_API_TOKEN;
  if (token) return token;
  throw new Error('Brak tokenu Baselinker');
}

async function blRequest(token, method, params = {}) {
  const body = new URLSearchParams();
  body.append('method', method);
  body.append('parameters', JSON.stringify(params));

  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'X-BLToken': token, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return res.json();
}

async function main() {
  console.log('=== DRY RUN: Pełna synchronizacja magazynu Leker (ID: 22952) ===\n');

  const token = await getApiToken();
  console.log('✅ Token API pobrany');

  // 1. Get all products (lightweight list)
  console.log('1. Pobieranie listy produktów z Baselinker...');
  let allProducts = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await blRequest(token, 'getInventoryProductsList', {
      inventory_id: parseInt(INVENTORY_ID),
      page,
    });
    if (res.status === 'ERROR') {
      console.error('   Błąd API:', res.error_message);
      return;
    }
    const products = Object.entries(res.products || {}).map(([id, p]) => ({
      id: parseInt(id),
      ...p,
    }));
    allProducts.push(...products);
    hasMore = products.length === 1000;
    page++;
    if (page > 1) {
      console.log(`   ...strona ${page - 1}, łącznie: ${allProducts.length}`);
    }
  }
  console.log(`   Produktów w Baselinker Leker: ${allProducts.length}`);

  // 2. Check DB matches
  console.log('\n2. Sprawdzanie bazy danych...');

  const totalInDb = await prisma.product.count({
    where: { baselinkerProductId: { not: null } },
  });

  // Products with leker- prefix
  const lekerPrefixed = await prisma.product.count({
    where: { baselinkerProductId: { startsWith: 'leker-' } },
  });

  // Products matching direct IDs (no prefix - main inventory)
  const blIdStrings = allProducts.map((p) => p.id.toString());
  const lekerPrefixedIds = allProducts.map((p) => `leker-${p.id}`);

  const matchedByPrefix = await prisma.product.count({
    where: { baselinkerProductId: { in: lekerPrefixedIds } },
  });

  const matchedDirect = await prisma.product.count({
    where: { baselinkerProductId: { in: blIdStrings } },
  });

  console.log(`   Produktów w DB (łącznie baselinker): ${totalInDb}`);
  console.log(`   Produktów z prefiksem leker- w DB: ${lekerPrefixed}`);
  console.log(`   Dopasowane z prefiksem leker-{blId}: ${matchedByPrefix}`);
  console.log(`   Dopasowane bez prefiksu (direct ID): ${matchedDirect}`);

  // 3. Sample products from BL
  console.log('\n3. Przykładowe produkty z Baselinker (pierwsze 10):');
  for (const p of allProducts.slice(0, 10)) {
    const price = p.price_brutto || 0;
    console.log(
      `   [${p.id}] ${(p.name || 'brak nazwy').substring(0, 60)} | cena: ${price} zł | sku: ${p.sku || 'brak'}`
    );
  }

  // 4. Check price rules
  console.log('\n4. Reguły cenowe (price rules):');
  const priceRulesSetting = await prisma.settings.findUnique({
    where: { key: 'price_rules_leker' },
  });
  if (priceRulesSetting) {
    const rules = JSON.parse(priceRulesSetting.value);
    console.log(`   Znaleziono ${rules.length} reguł:`);
    for (const rule of rules.slice(0, 5)) {
      console.log(`   - ${rule.minPrice || 0}-${rule.maxPrice || '∞'} zł: mnożnik ${rule.multiplier}, +${rule.addToPrice || 0} zł`);
    }
  } else {
    console.log('   Brak reguł - domyślny mnożnik 1.0');
  }

  // 5. Sample what would change
  console.log('\n5. Symulacja zmian (pierwsze 5 istniejących):');
  const sampleExisting = await prisma.product.findMany({
    where: { baselinkerProductId: { in: lekerPrefixedIds.slice(0, 100) } },
    select: { baselinkerProductId: true, name: true, price: true, sku: true },
    take: 5,
  });

  for (const dbProd of sampleExisting) {
    const blId = dbProd.baselinkerProductId.replace('leker-', '');
    const blProd = allProducts.find((p) => p.id.toString() === blId);
    if (blProd) {
      const nameChanged = dbProd.name !== blProd.name;
      const priceChanged = Math.abs(parseFloat(dbProd.price) - (blProd.price_brutto || 0)) > 0.01;
      const changes = [];
      if (nameChanged) changes.push(`nazwa: "${dbProd.name}" → "${blProd.name}"`);
      if (priceChanged) changes.push(`cena: ${dbProd.price} → ${blProd.price_brutto}`);
      if (changes.length === 0) changes.push('brak zmian');
      console.log(`   [${blId}] ${dbProd.sku}: ${changes.join(', ')}`);
    }
  }

  // 6. Summary
  const existingToUpdate = matchedByPrefix + matchedDirect;
  const newToCreate = Math.max(0, allProducts.length - existingToUpdate);

  const batchSize = 10;
  const batches = Math.ceil(allProducts.length / batchSize);
  const estimatedSeconds = batches * 3;
  const minutes = Math.floor(estimatedSeconds / 60);
  const seconds = estimatedSeconds % 60;

  console.log('\n=== PODSUMOWANIE DRY RUN ===');
  console.log(`Tryb: full-resync (pobierz i zaktualizuj WSZYSTKIE)`);
  console.log(`Magazyn: Leker (ID: ${INVENTORY_ID})`);
  console.log(`Produktów w Baselinker: ${allProducts.length}`);
  console.log(`Istniejących w DB (do aktualizacji): ${existingToUpdate}`);
  console.log(`Nowych (do utworzenia): ~${newToCreate}`);
  console.log(`Szacowany czas synchronizacji: ~${minutes}m ${seconds}s`);
  console.log(`\n✅ To był DRY RUN — żadne dane nie zostały zmienione.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
