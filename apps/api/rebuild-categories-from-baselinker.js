/**
 * Skrypt do przebudowy drzewka kategorii na podstawie Baselinker
 * 
 * 1. Pobiera kategorie ze wszystkich 4 magazynów (Leker, HP, BTP, Ikonka)
 * 2. Buduje nowe drzewko kategorii
 * 3. Zamienia istniejące kategorie na nowe
 * 4. Przypisuje produkty do nowych kategorii
 * 
 * Użycie:
 *   node rebuild-categories-from-baselinker.js           - pełna synchronizacja
 *   node rebuild-categories-from-baselinker.js --test    - test na 10 produktach
 *   node rebuild-categories-from-baselinker.js --dry-run - tylko podgląd zmian
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_TOKEN = process.env.BASELINKER_API_TOKEN;

// Argumenty z linii poleceń
const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');
const DRY_RUN = args.includes('--dry-run');
const TEST_LIMIT = 10;

// Magazyny z których synchronizujemy produkty
const WAREHOUSES = [
  { id: 22951, name: 'Ikonka', prefix: '' },
  { id: 22952, name: 'Leker', prefix: 'leker-' },
  { id: 22953, name: 'BTP', prefix: 'btp-' },
  { id: 22954, name: 'HP', prefix: 'hp-' },
];

async function callBaselinker(method, parameters = {}) {
  const response = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-BLToken': BASELINKER_TOKEN,
    },
    body: new URLSearchParams({
      method,
      parameters: JSON.stringify(parameters),
    }),
  });

  const data = await response.json();
  if (data.status === 'ERROR') {
    throw new Error(`Baselinker API error: ${data.error_message}`);
  }
  return data;
}

// Pobierz kategorie z magazynu
async function getInventoryCategories(inventoryId) {
  const result = await callBaselinker('getInventoryCategories', {
    inventory_id: inventoryId,
  });
  return result.categories || [];
}

// Pobierz listę ID produktów z magazynu
async function getProductIdsList(inventoryId, page = 1) {
  const result = await callBaselinker('getInventoryProductsList', {
    inventory_id: inventoryId,
    page,
  });
  return Object.keys(result.products || {}).map(id => parseInt(id));
}

// Pobierz szczegóły produktów
async function getProductsData(inventoryId, productIds) {
  const result = await callBaselinker('getInventoryProductsData', {
    inventory_id: inventoryId,
    products: productIds,
  });
  return result.products || {};
}

// Funkcja do generowania slug z nazwy
function generateSlug(name, prefix = '') {
  // Oczyść nazwę z prefiksów typu "Dziecko|" 
  const cleanName = name.includes('|') ? name.split('|').pop().trim() : name;
  
  const slug = cleanName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // usuń akcenty
    .replace(/ł/g, 'l')
    .replace(/ą/g, 'a')
    .replace(/ę/g, 'e')
    .replace(/ś/g, 's')
    .replace(/ć/g, 'c')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ż/g, 'z')
    .replace(/ź/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
  
  return prefix ? `${prefix}${slug}` : slug;
}

// Oczyść nazwę kategorii z prefiksów
function cleanCategoryName(name) {
  if (!name) return name;
  // Jeśli nazwa zawiera "|", weź ostatnią część
  return name.includes('|') ? name.split('|').pop().trim() : name;
}

// Buduj ścieżkę kategorii
function buildCategoryPath(categoryId, categoriesMap) {
  const category = categoriesMap.get(categoryId);
  if (!category) return null;
  
  const path = [];
  let current = category;
  
  while (current) {
    path.unshift(current.name);
    if (current.parent_id && current.parent_id !== 0) {
      current = categoriesMap.get(current.parent_id);
    } else {
      current = null;
    }
  }
  
  return path.join(' > ');
}

async function main() {
  console.log('═'.repeat(70));
  console.log('🔄 PRZEBUDOWA KATEGORII Z BASELINKER');
  console.log('═'.repeat(70));
  
  if (TEST_MODE) {
    console.log(`\n⚠️  TRYB TESTOWY - tylko ${TEST_LIMIT} produktów z każdego magazynu`);
  }
  if (DRY_RUN) {
    console.log('\n⚠️  TRYB DRY-RUN - żadne zmiany nie będą zapisane');
  }
  
  // Krok 1: Pobierz wszystkie kategorie ze wszystkich magazynów
  console.log('\n📂 KROK 1: Pobieranie kategorii z magazynów...\n');
  
  const allCategories = new Map(); // category_id -> category data
  const warehouseCategories = new Map(); // warehouse_id -> Map of categories
  
  for (const warehouse of WAREHOUSES) {
    console.log(`   📦 ${warehouse.name}...`);
    const categories = await getInventoryCategories(warehouse.id);
    
    const catMap = new Map();
    for (const cat of categories) {
      catMap.set(cat.category_id, cat);
      
      // Dodaj do globalnej mapy jeśli nie ma
      if (!allCategories.has(cat.category_id)) {
        allCategories.set(cat.category_id, {
          ...cat,
          warehouses: [warehouse.name],
        });
      } else {
        // Dodaj magazyn do listy
        allCategories.get(cat.category_id).warehouses.push(warehouse.name);
      }
    }
    warehouseCategories.set(warehouse.id, catMap);
    
    console.log(`      ✅ ${categories.length} kategorii`);
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n   📊 Łącznie unikalnych kategorii: ${allCategories.size}`);
  
  // Krok 2: Pobierz produkty i ich kategorie
  console.log('\n📦 KROK 2: Pobieranie produktów i ich kategorii...\n');
  
  const productCategories = new Map(); // baselinkerProductId -> { categoryId, categoryPath, warehouse }
  const categoryProductCounts = new Map(); // category_id -> count
  
  for (const warehouse of WAREHOUSES) {
    console.log(`   📦 ${warehouse.name}...`);
    
    // Pobierz ID produktów
    let productIds = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const ids = await getProductIdsList(warehouse.id, page);
      productIds.push(...ids);
      
      hasMore = ids.length === 1000;
      if (TEST_MODE && productIds.length >= TEST_LIMIT) {
        productIds = productIds.slice(0, TEST_LIMIT);
        hasMore = false;
      }
      page++;
      
      if (hasMore) await new Promise(r => setTimeout(r, 200));
    }
    
    console.log(`      Znaleziono ${productIds.length} produktów`);
    
    if (productIds.length === 0) continue;
    
    // Pobierz szczegóły produktów
    const BATCH_SIZE = 100;
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      const productsData = await getProductsData(warehouse.id, batch);
      
      for (const [productId, data] of Object.entries(productsData)) {
        const blProductId = warehouse.prefix ? `${warehouse.prefix}${productId}` : productId;
        const categoryId = data.category_id;
        
        if (categoryId && categoryId !== 0) {
          const catMap = warehouseCategories.get(warehouse.id);
          const categoryPath = buildCategoryPath(categoryId, catMap);
          
          productCategories.set(blProductId, {
            categoryId,
            categoryPath,
            warehouse: warehouse.name,
            sku: data.sku,
            name: data.name,
          });
          
          // Zlicz produkty w kategorii
          categoryProductCounts.set(categoryId, (categoryProductCounts.get(categoryId) || 0) + 1);
        }
      }
      
      const progress = Math.min(100, Math.round((i + batch.length) / productIds.length * 100));
      process.stdout.write(`\r      Postęp: ${progress}%`);
      
      await new Promise(r => setTimeout(r, 300));
    }
    console.log('');
  }
  
  console.log(`\n   📊 Produkty z kategoriami: ${productCategories.size}`);
  console.log(`   📊 Kategorie z produktami: ${categoryProductCounts.size}`);
  
  // Krok 3: Zbuduj drzewko kategorii
  console.log('\n🌳 KROK 3: Budowanie drzewka kategorii...\n');
  
  // Znajdź tylko kategorie które mają produkty
  const usedCategories = new Set(categoryProductCounts.keys());
  
  // Dodaj rodziców do używanych kategorii
  for (const catId of [...usedCategories]) {
    let current = allCategories.get(catId);
    while (current && current.parent_id && current.parent_id !== 0) {
      usedCategories.add(current.parent_id);
      current = allCategories.get(current.parent_id);
    }
  }
  
  console.log(`   Kategorie do utworzenia: ${usedCategories.size}`);
  
  // Posortuj kategorie - najpierw rodzice, potem dzieci
  const sortedCategories = [];
  const processed = new Set();
  
  function addCategoryWithParents(catId) {
    if (processed.has(catId)) return;
    
    const cat = allCategories.get(catId);
    if (!cat) return;
    
    // Najpierw dodaj rodzica
    if (cat.parent_id && cat.parent_id !== 0) {
      addCategoryWithParents(cat.parent_id);
    }
    
    if (usedCategories.has(catId)) {
      sortedCategories.push(cat);
      processed.add(catId);
    }
  }
  
  for (const catId of usedCategories) {
    addCategoryWithParents(catId);
  }
  
  // Wyświetl drzewko
  console.log('\n   📋 Struktura kategorii:\n');
  
  const rootCategories = sortedCategories.filter(c => !c.parent_id || c.parent_id === 0);
  
  function printTree(categories, parentId = null, indent = 0) {
    const children = categories.filter(c => 
      (parentId === null && (!c.parent_id || c.parent_id === 0)) ||
      c.parent_id === parentId
    );
    
    for (const cat of children) {
      const count = categoryProductCounts.get(cat.category_id) || 0;
      const countStr = count > 0 ? ` (${count} produktów)` : '';
      const displayName = cleanCategoryName(cat.name);
      console.log(`   ${'  '.repeat(indent)}├─ ${displayName}${countStr}`);
      printTree(categories, cat.category_id, indent + 1);
    }
  }
  
  printTree(sortedCategories);
  
  if (DRY_RUN) {
    console.log('\n\n⚠️  TRYB DRY-RUN - żadne zmiany nie zostały zapisane');
    console.log('\n📊 PODSUMOWANIE CO BY SIĘ ZMIENIŁO:');
    console.log(`   - Utworzono by ${sortedCategories.length} kategorii`);
    console.log(`   - Zaktualizowano by ${productCategories.size} produktów`);
    
    // Pokaż przykładowe produkty
    console.log('\n📦 Przykładowe produkty do aktualizacji:');
    let count = 0;
    for (const [blId, info] of productCategories) {
      if (count++ >= 10) break;
      console.log(`   - ${blId}: ${info.name?.substring(0, 50)}...`);
      console.log(`     Kategoria: ${info.categoryPath}`);
    }
    
    await prisma.$disconnect();
    return;
  }
  
  // Krok 4: Utwórz nowe kategorie w bazie
  console.log('\n💾 KROK 4: Tworzenie kategorii w bazie danych...\n');
  
  const categoryIdMap = new Map(); // baselinkerCategoryId -> dbCategoryId
  
  for (const cat of sortedCategories) {
    const cleanName = cleanCategoryName(cat.name);
    const slug = generateSlug(cat.name);
    
    // Znajdź ID rodzica w bazie
    let parentId = null;
    if (cat.parent_id && cat.parent_id !== 0) {
      parentId = categoryIdMap.get(cat.parent_id);
    }
    
    // Sprawdź czy kategoria już istnieje
    let dbCategory = await prisma.category.findFirst({
      where: {
        baselinkerCategoryId: String(cat.category_id),
      },
    });
    
    if (dbCategory) {
      // Zaktualizuj istniejącą
      dbCategory = await prisma.category.update({
        where: { id: dbCategory.id },
        data: {
          name: cleanName,
          slug: slug,
          parentId: parentId,
          isActive: true,
        },
      });
      console.log(`   ♻️  Zaktualizowano: ${cleanName}`);
    } else {
      // Utwórz nową
      try {
        dbCategory = await prisma.category.create({
          data: {
            name: cleanName,
            slug: slug + '-' + cat.category_id, // Dodaj ID aby uniknąć duplikatów
            parentId: parentId,
            baselinkerCategoryId: String(cat.category_id),
            baselinkerCategoryPath: buildCategoryPath(cat.category_id, allCategories),
            isActive: true,
          },
        });
        console.log(`   ✅ Utworzono: ${cleanName}`);
      } catch (err) {
        // Jeśli slug istnieje, dodaj losowy suffix
        dbCategory = await prisma.category.create({
          data: {
            name: cleanName,
            slug: slug + '-' + Date.now(),
            parentId: parentId,
            baselinkerCategoryId: String(cat.category_id),
            baselinkerCategoryPath: buildCategoryPath(cat.category_id, allCategories),
            isActive: true,
          },
        });
        console.log(`   ✅ Utworzono (z suffix): ${cleanName}`);
      }
    }
    
    categoryIdMap.set(cat.category_id, dbCategory.id);
  }
  
  console.log(`\n   📊 Utworzono/zaktualizowano ${categoryIdMap.size} kategorii`);
  
  // Krok 5: Przypisz produkty do kategorii
  console.log('\n🔗 KROK 5: Przypisywanie produktów do kategorii...\n');
  
  let updated = 0;
  let notFound = 0;
  
  // Grupuj produkty po kategorii dla wydajności
  const productsByCategory = new Map();
  for (const [blId, info] of productCategories) {
    const dbCategoryId = categoryIdMap.get(info.categoryId);
    if (dbCategoryId) {
      if (!productsByCategory.has(dbCategoryId)) {
        productsByCategory.set(dbCategoryId, []);
      }
      productsByCategory.get(dbCategoryId).push(blId);
    }
  }
  
  for (const [dbCategoryId, productIds] of productsByCategory) {
    const result = await prisma.product.updateMany({
      where: {
        baselinkerProductId: { in: productIds },
      },
      data: {
        categoryId: dbCategoryId,
      },
    });
    
    updated += result.count;
    notFound += productIds.length - result.count;
  }
  
  console.log(`   ✅ Zaktualizowano: ${updated} produktów`);
  console.log(`   ⚠️  Nie znaleziono w bazie: ${notFound} produktów`);
  
  // Podsumowanie
  console.log('\n' + '═'.repeat(70));
  console.log('📊 PODSUMOWANIE');
  console.log('═'.repeat(70));
  console.log(`   Kategorie utworzone/zaktualizowane: ${categoryIdMap.size}`);
  console.log(`   Produkty zaktualizowane: ${updated}`);
  console.log(`   Produkty nie znalezione: ${notFound}`);
  
  if (TEST_MODE) {
    console.log('\n⚠️  To był test na ograniczonej liczbie produktów.');
    console.log('   Uruchom bez --test dla pełnej synchronizacji.');
  }
  
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('\n❌ Błąd:', err);
  prisma.$disconnect();
  process.exit(1);
});
