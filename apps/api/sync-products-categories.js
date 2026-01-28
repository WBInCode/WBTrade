/**
 * Skrypt do synchronizacji kategorii produktów z Baselinker
 * 
 * Pobiera produkty z magazynów Ikonka, Leker, BTP i HP,
 * znajduje ich kategorie i aktualizuje w bazie danych.
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_TOKEN = process.env.BASELINKER_API_TOKEN;

// Magazyny z których synchronizujemy produkty
// prefix: jak jest zapisany baselinkerProductId w bazie (np. "hp-" dla HP)
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

async function getProductIdsList(inventoryId, page = 1) {
  const result = await callBaselinker('getInventoryProductsList', {
    inventory_id: inventoryId,
    page,
  });

  return Object.keys(result.products || {}).map(id => parseInt(id));
}

async function getProductsData(inventoryId, productIds) {
  const result = await callBaselinker('getInventoryProductsData', {
    inventory_id: inventoryId,
    products: productIds,
  });

  return result.products || {};
}

async function syncProductsCategories() {
  console.log('🚀 Rozpoczynam synchronizację kategorii produktów...\n');

  // 1. Pobierz mapę kategorii z bazy (baselinkerCategoryId -> id)
  const categories = await prisma.category.findMany({
    where: {
      baselinkerCategoryId: { not: null },
    },
    select: {
      id: true,
      name: true,
      baselinkerCategoryId: true,
    },
  });

  const categoryMap = new Map();
  for (const cat of categories) {
    // baselinkerCategoryId jest String, ale w API Baselinker to Int
    // Zapisujemy jako Int żeby łatwiej porównywać z API
    categoryMap.set(parseInt(cat.baselinkerCategoryId), cat);
  }

  console.log(`📂 Załadowano ${categories.length} kategorii z Baselinker\n`);

  // 2. Iteruj po wszystkich magazynach
  let totalUpdated = 0;
  let totalNotFoundInDb = 0;
  let totalNoCategory = 0;
  let totalCategoryNotFound = 0;
  let totalErrors = 0;
  const missingCategories = new Map();

  for (const warehouse of WAREHOUSES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Magazyn: ${warehouse.name} (ID: ${warehouse.id})`);
    console.log('='.repeat(60));

    // Pobierz wszystkie ID produktów z tego magazynu
    let allProductIds = [];
    let page = 1;
    let hasMore = true;

    console.log('   Pobieranie listy produktów...');

    while (hasMore) {
      const productIds = await getProductIdsList(warehouse.id, page);
      
      if (productIds.length > 0) {
        allProductIds.push(...productIds);
      }

      hasMore = productIds.length === 1000;
      page++;

      if (hasMore) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`   ✅ Znaleziono ${allProductIds.length} produktów\n`);

    if (allProductIds.length === 0) continue;

    // 3. Pobierz szczegóły produktów w partiach i aktualizuj kategorie
    let updated = 0;
    let notFoundInDb = 0;
    let noCategory = 0;
    let categoryNotFound = 0;
    let errors = 0;

    const BATCH_SIZE = 100;

    for (let i = 0; i < allProductIds.length; i += BATCH_SIZE) {
      const batch = allProductIds.slice(i, i + BATCH_SIZE);
      
      try {
        // Pobierz szczegóły produktów (w tym category_id)
        const productsData = await getProductsData(warehouse.id, batch);
        
        // Grupuj produkty po category_id
        const productsByCategory = new Map();
        
        for (const [productId, data] of Object.entries(productsData)) {
          const catId = data.category_id;
          
          if (!catId || catId === 0) {
            noCategory++;
            continue;
          }
          
          if (!productsByCategory.has(catId)) {
            productsByCategory.set(catId, []);
          }
          // Dodaj prefix dla danego magazynu (np. "hp-" dla HP)
          const dbProductId = warehouse.prefix ? `${warehouse.prefix}${productId}` : productId;
          productsByCategory.get(catId).push(dbProductId);
        }

        // Aktualizuj produkty dla każdej kategorii
        for (const [blCategoryId, productIds] of productsByCategory) {
          const category = categoryMap.get(blCategoryId);

          if (!category) {
            if (!missingCategories.has(blCategoryId)) {
              missingCategories.set(blCategoryId, 0);
            }
            missingCategories.set(blCategoryId, missingCategories.get(blCategoryId) + productIds.length);
            categoryNotFound += productIds.length;
            continue;
          }

          // Aktualizuj produkty w bazie - baselinkerProductId to String!
          const result = await prisma.product.updateMany({
            where: {
              baselinkerProductId: { in: productIds }, // productIds już są stringami
            },
            data: {
              categoryId: category.id,
            },
          });

          updated += result.count;
          notFoundInDb += productIds.length - result.count;
        }

        const progress = Math.round((i + batch.length) / allProductIds.length * 100);
        process.stdout.write(`\r   Postęp: ${progress}% | Zaktualizowano: ${updated} | Bez kategorii: ${noCategory}`);

      } catch (err) {
        console.error(`\n   ❌ Błąd: ${err.message}`);
        errors += batch.length;
      }

      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n   📊 ${warehouse.name}: zaktualizowano ${updated}, bez kategorii: ${noCategory}, nie w bazie: ${notFoundInDb}`);
    
    totalUpdated += updated;
    totalNotFoundInDb += notFoundInDb;
    totalNoCategory += noCategory;
    totalCategoryNotFound += categoryNotFound;
    totalErrors += errors;
  }

  // 4. Podsumowanie
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 PODSUMOWANIE CAŁKOWITE');
  console.log('='.repeat(60));
  console.log(`✅ Zaktualizowano:              ${totalUpdated} produktów`);
  console.log(`⚠️  Bez kategorii w Baselinker: ${totalNoCategory} produktów`);
  console.log(`⚠️  Kategoria nie w bazie:      ${totalCategoryNotFound} produktów`);
  console.log(`⚠️  Produkt nie w bazie:        ${totalNotFoundInDb} produktów`);
  console.log(`❌ Błędy:                       ${totalErrors} produktów`);
  console.log('='.repeat(60));

  if (missingCategories.size > 0) {
    console.log('\n⚠️  Brakujące kategorie Baselinker (ID -> liczba produktów):');
    for (const [catId, count] of missingCategories) {
      console.log(`   - ${catId}: ${count} produktów`);
    }
  }

  // 5. Statystyki końcowe
  const productsWithBLCategory = await prisma.product.count({
    where: {
      category: { baselinkerCategoryId: { not: null } },
    },
  });

  const productsWithoutBLCategory = await prisma.product.count({
    where: {
      OR: [
        { categoryId: null },
        { category: { baselinkerCategoryId: null } },
      ],
    },
  });

  const totalProducts = await prisma.product.count();

  console.log(`\n📈 STATYSTYKI BAZY DANYCH:`);
  console.log(`   Produkty z kategorią Baselinker: ${productsWithBLCategory}`);
  console.log(`   Produkty bez kategorii Baselinker: ${productsWithoutBLCategory}`);
  console.log(`   Razem produktów: ${totalProducts}`);
}

// Uruchom
syncProductsCategories()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
