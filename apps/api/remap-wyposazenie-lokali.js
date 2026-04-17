/**
 * Skrypt do re-mapowania kategorii produktów z "Wyposażenie lokali"
 * 
 * Pobiera produkty z kategorii "Wyposażenie lokali" na stronie,
 * sprawdza ich aktualną kategorię na Baselinker (via API),
 * i przypisuje do odpowiedniej kategorii na stronie.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BL_API_URL = 'https://api.baselinker.com/connector.php';
const BL_TOKEN = process.env.BASELINKER_API_TOKEN;

// Mapowanie prefix -> inventory_id
const PREFIX_TO_INVENTORY = {
  'hp-': 22954,
  'leker-': 22952,
  'btp-': 22953,
  'dofirmy-': 26423,
  'outlet-': 23662,
  '': 11235, // brak prefiksu = Główny
};

async function blRequest(method, params = {}) {
  const body = new URLSearchParams();
  body.append('token', BL_TOKEN);
  body.append('method', method);
  body.append('parameters', JSON.stringify(params));

  const res = await fetch(BL_API_URL, {
    method: 'POST',
    body,
  });

  const data = await res.json();
  if (data.status === 'ERROR') {
    throw new Error(`BL API Error: ${data.error_code} - ${data.error_message}`);
  }
  return data;
}

function parseBlProductId(baselinkerProductId) {
  // Format: "hp-212560807" -> { prefix: "hp-", numId: 212560807 }
  const match = baselinkerProductId.match(/^(hp-|leker-|btp-|dofirmy-|outlet-)?(\d+)$/);
  if (!match) return null;
  return { prefix: match[1] || '', numId: parseInt(match[2]) };
}

async function main() {
  console.log('=== Re-mapowanie produktów z "Wyposażenie lokali" ===\n');

  // 1. Pobierz kategorie z WSZYSTKICH inwentarzy BL
  const blCategoryMap = new Map(); // category_id -> name
  const inventoryIds = [...new Set(Object.values(PREFIX_TO_INVENTORY))];
  
  console.log('Pobieranie kategorii z Baselinker...');
  for (const invId of inventoryIds) {
    try {
      const catResponse = await blRequest('getInventoryCategories', { inventory_id: invId });
      const cats = catResponse.categories || [];
      for (const cat of cats) {
        blCategoryMap.set(cat.category_id, cat.name);
      }
    } catch (e) {
      console.log(`  ⚠️ Nie udało się pobrać kategorii z inventory ${invId}: ${e.message}`);
    }
  }
  console.log(`Znaleziono ${blCategoryMap.size} unikalnych kategorii na BL\n`);

  // 3. Pobierz kategorię "Wyposażenie lokali" ze strony
  const wyposazenieCat = await prisma.category.findFirst({
    where: { slug: 'wyposazenie-lokali' },
    select: { id: true, name: true, slug: true },
  });
  if (!wyposazenieCat) {
    console.error('❌ Kategoria "wyposazenie-lokali" nie istnieje!');
    process.exit(1);
  }
  console.log(`Kategoria źródłowa: "${wyposazenieCat.name}" (${wyposazenieCat.id})\n`);

  // 4. Pobierz wszystkie produkty z tej kategorii
  const products = await prisma.product.findMany({
    where: { categoryId: wyposazenieCat.id },
    select: {
      id: true,
      name: true,
      sku: true,
      baselinkerProductId: true,
      baselinkerCategoryPath: true,
    },
  });
  console.log(`Znaleziono ${products.length} produktów w "Wyposażenie lokali"\n`);

  if (products.length === 0) {
    console.log('✅ Brak produktów do re-mapowania.');
    process.exit(0);
  }

  // 5. Pobierz dane z BL dla tych produktów (pogrupowane wg prefiksu/inwentarza)
  const productsWithBlId = products.filter((p) => p.baselinkerProductId);
  console.log(`${productsWithBlId.length} produktów ma baselinkerProductId\n`);

  // Grupuj produkty wg prefiksu
  const byPrefix = {};
  for (const p of productsWithBlId) {
    const parsed = parseBlProductId(p.baselinkerProductId);
    if (!parsed) continue;
    if (!byPrefix[parsed.prefix]) byPrefix[parsed.prefix] = [];
    byPrefix[parsed.prefix].push({ ...p, numId: parsed.numId });
  }

  console.log('Produkty wg źródła:');
  for (const [prefix, items] of Object.entries(byPrefix)) {
    const invId = PREFIX_TO_INVENTORY[prefix];
    console.log(`  ${prefix || '(główny)'}: ${items.length} produktów (inventory: ${invId})`);
  }
  console.log();

  // Pobierz dane z BL dla każdej grupy
  const allBlProducts = {}; // numId -> blProduct
  
  for (const [prefix, items] of Object.entries(byPrefix)) {
    const invId = PREFIX_TO_INVENTORY[prefix];
    if (!invId) {
      console.log(`  ⚠️ Brak inventory dla prefiksu "${prefix}"`);
      continue;
    }
    
    const blIds = items.map((i) => i.numId);
    console.log(`Pobieranie z BL (${prefix || 'główny'}, inv: ${invId}): ${blIds.length} produktów...`);
    
    for (let i = 0; i < blIds.length; i += 1000) {
      const chunk = blIds.slice(i, i + 1000);
      console.log(`  Chunk ${Math.floor(i / 1000) + 1}: ${chunk.length} produktów...`);
      const response = await blRequest('getInventoryProductsData', {
        inventory_id: invId,
        products: chunk,
      });
      
      const prods = response.products || {};
      for (const [id, prod] of Object.entries(prods)) {
        allBlProducts[`${prefix}${id}`] = prod;
      }
    }
  }
  console.log(`\nPobrano dane dla ${Object.keys(allBlProducts).length} produktów z BL\n`);

  // 6. Pobierz wszystkie kategorie ze strony (z baselinkerCategoryId)
  const siteCategories = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { id: true, name: true, slug: true, baselinkerCategoryId: true },
  });
  
  // Mapa: blCategoryId -> siteCategory
  const siteCatByBlId = new Map();
  for (const cat of siteCategories) {
    siteCatByBlId.set(cat.baselinkerCategoryId, cat);
    // Wyciągnij numeryczny ID (np. "hp-12345" -> "12345")
    const numMatch = cat.baselinkerCategoryId.match(/(\d+)$/);
    if (numMatch) {
      siteCatByBlId.set(numMatch[1], cat);
      siteCatByBlId.set(parseInt(numMatch[1]), cat);
    }
  }

  // 7. Mapuj produkty na nowe kategorie
  const updates = []; // { productId, productName, sku, oldCat, newCatId, newCatName }
  const noMapping = [];
  const stayInWyposazenie = [];

  for (const product of productsWithBlId) {
    // Dopasuj BL produkt po pełnym baselinkerProductId (np. "hp-212560807")
    const parsed = parseBlProductId(product.baselinkerProductId);
    if (!parsed) {
      noMapping.push({ sku: product.sku, reason: 'Nieprawidłowy format ID' });
      continue;
    }
    
    const lookupKey = `${parsed.prefix}${parsed.numId}`;
    const blProduct = allBlProducts[lookupKey];

    if (!blProduct) {
      noMapping.push({ sku: product.sku, reason: 'Nie znaleziono na BL' });
      continue;
    }

    const blCatId = blProduct.category_id;
    const blCatName = blCategoryMap.get(blCatId) || `ID:${blCatId}`;

    // Szukaj odpowiedniej kategorii na stronie
    let targetCat = siteCatByBlId.get(String(blCatId)) || siteCatByBlId.get(blCatId);

    // Próbuj z prefiksami
    if (!targetCat) {
      for (const prefix of ['', 'hp-', 'btp-', 'leker-', 'outlet-']) {
        const key = prefix + blCatId;
        targetCat = siteCatByBlId.get(key);
        if (targetCat) break;
      }
    }

    if (!targetCat) {
      noMapping.push({
        sku: product.sku,
        name: product.name.substring(0, 50),
        reason: `BL cat: "${blCatName}" (ID: ${blCatId}) - brak mapowania`,
      });
      continue;
    }

    if (targetCat.id === wyposazenieCat.id) {
      stayInWyposazenie.push({ sku: product.sku });
      continue;
    }

    updates.push({
      productId: product.id,
      sku: product.sku,
      productName: product.name.substring(0, 60),
      oldCat: wyposazenieCat.name,
      newCatId: targetCat.id,
      newCatName: targetCat.name,
      blCatName,
    });
  }

  // 8. Podsumowanie
  console.log('=== PODSUMOWANIE ===\n');
  console.log(`Produkty do przeniesienia: ${updates.length}`);
  console.log(`Pozostają w "Wyposażenie lokali": ${stayInWyposazenie.length}`);
  console.log(`Brak mapowania: ${noMapping.length}\n`);

  if (noMapping.length > 0) {
    console.log('⚠️  Produkty bez mapowania:');
    for (const nm of noMapping) {
      console.log(`  ❓ ${nm.sku} | ${nm.name || ''} | ${nm.reason}`);
    }
    console.log();
  }

  // Grupuj update'y po nowej kategorii
  const byCategory = {};
  for (const upd of updates) {
    if (!byCategory[upd.newCatName]) byCategory[upd.newCatName] = [];
    byCategory[upd.newCatName].push(upd);
  }

  console.log('📦 Przeniesienia:');
  for (const [catName, items] of Object.entries(byCategory)) {
    console.log(`\n  → ${catName} (${items.length} produktów):`);
    for (const item of items) {
      console.log(`    ${item.sku} | ${item.productName} | BL: ${item.blCatName}`);
    }
  }

  if (updates.length === 0) {
    console.log('\n✅ Nic do zaktualizowania.');
    process.exit(0);
  }

  // 9. Wykonaj aktualizacje
  console.log(`\n🔄 Aktualizowanie ${updates.length} produktów...\n`);

  let successCount = 0;
  for (const [catName, items] of Object.entries(byCategory)) {
    const ids = items.map((i) => i.productId);
    const targetCatId = items[0].newCatId;

    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: targetCatId },
    });

    console.log(`  ✅ ${catName}: ${result.count} produktów zaktualizowanych`);
    successCount += result.count;
  }

  console.log(`\n✅ Łącznie zaktualizowano: ${successCount}/${updates.length} produktów`);

  // 10. Ile zostało w Wyposażenie lokali?
  const remaining = await prisma.product.count({
    where: { categoryId: wyposazenieCat.id },
  });
  console.log(`\n📊 Pozostało w "Wyposażenie lokali": ${remaining} produktów`);
}

main()
  .catch((e) => {
    console.error('❌ Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
