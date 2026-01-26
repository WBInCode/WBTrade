/**
 * Synchronizacja produktów z katalogu OUTLET w Baselinkerze
 * 
 * Outlet to produkty ze zwrotów - wysyłane z własnego magazynu
 * 
 * INSTRUKCJA:
 * 1. Utwórz katalog "Outlet" w Baselinkerze (Magazyn -> Katalogi)
 * 2. Skopiuj ID katalogu i wstaw poniżej jako OUTLET_INVENTORY_ID
 * 3. Uruchom: node sync-outlet.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const MIN_DELAY = 2500;
let lastRequest = 0;

// =====================================================
// ⚠️  USTAW ID KATALOGU OUTLET Z BASELINKERA TUTAJ:
// =====================================================
const OUTLET_INVENTORY_ID = null; // np. 22999 - wstaw swoje ID po utworzeniu katalogu
// =====================================================

const OUTLET_CATEGORY_SLUG = 'outlet';
const OUTLET_SKU_PREFIX = 'OUT-'; // Prefiks dla SKU produktów outletowych

async function blRequest(apiToken, method, parameters = {}) {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < MIN_DELAY) await new Promise(r => setTimeout(r, MIN_DELAY - elapsed));
  lastRequest = Date.now();

  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(BASELINKER_API_URL, {
        method: 'POST',
        headers: {
          'X-BLToken': apiToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      const data = await response.json();

      if (data.status === 'ERROR') {
        if (data.error_message?.includes('Query limit')) {
          console.log('⏳ Rate limit, czekam 60s...');
          await new Promise(r => setTimeout(r, 60000));
          continue;
        }
        throw new Error(data.error_message);
      }
      return data;
    } catch (e) {
      if (attempt < 4) {
        console.log(`⚠️ Błąd, ponawiam (${attempt + 1}/5)...`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw e;
      }
    }
  }
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function getOutletCategory() {
  let category = await prisma.category.findUnique({
    where: { slug: OUTLET_CATEGORY_SLUG }
  });

  if (!category) {
    console.log('📁 Tworzę kategorię Outlet...');
    category = await prisma.category.create({
      data: {
        name: 'Outlet',
        slug: OUTLET_CATEGORY_SLUG,
        order: 999, // Na końcu listy
        isActive: true,
      }
    });
    console.log('✅ Kategoria Outlet utworzona');
  }

  return category;
}

async function getAllOutletProducts(apiToken) {
  console.log('\n📋 Pobieranie listy produktów z Outlet...');
  
  const products = [];
  let page = 1;
  
  while (true) {
    const resp = await blRequest(apiToken, 'getInventoryProductsList', {
      inventory_id: OUTLET_INVENTORY_ID,
      page: page,
    });
    
    if (!resp.products || Object.keys(resp.products).length === 0) {
      break;
    }
    
    const productIds = Object.keys(resp.products);
    products.push(...productIds);
    console.log(`   Strona ${page}: ${productIds.length} produktów`);
    page++;
  }
  
  console.log(`   📦 Łącznie: ${products.length} produktów\n`);
  return products;
}

async function getProductsDetails(apiToken, productIds) {
  const BATCH_SIZE = 100;
  const allProducts = {};
  
  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);
    console.log(`   Pobieranie szczegółów: ${i + 1}-${Math.min(i + BATCH_SIZE, productIds.length)} z ${productIds.length}...`);
    
    const resp = await blRequest(apiToken, 'getInventoryProductsData', {
      inventory_id: OUTLET_INVENTORY_ID,
      products: batch,
    });
    
    if (resp.products) {
      Object.assign(allProducts, resp.products);
    }
  }
  
  return allProducts;
}

async function getProductStock(apiToken, productIds) {
  const stocks = {};
  const BATCH_SIZE = 1000;
  
  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);
    
    const resp = await blRequest(apiToken, 'getInventoryProductsStock', {
      inventory_id: OUTLET_INVENTORY_ID,
      products: batch,
    });
    
    if (resp.products) {
      for (const [productId, stockData] of Object.entries(resp.products)) {
        // Sumuj stan z wszystkich magazynów
        let totalStock = 0;
        if (stockData.stock) {
          for (const warehouseStock of Object.values(stockData.stock)) {
            totalStock += parseInt(warehouseStock) || 0;
          }
        }
        stocks[productId] = totalStock;
      }
    }
  }
  
  return stocks;
}

async function syncOutletProducts(apiToken, outletCategory) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('         SYNCHRONIZACJA PRODUKTÓW OUTLET                   ');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Pobierz listę produktów
  const productIds = await getAllOutletProducts(apiToken);
  
  if (productIds.length === 0) {
    console.log('📭 Brak produktów w katalogu Outlet');
    return { created: 0, updated: 0, unchanged: 0, errors: 0 };
  }

  // Pobierz szczegóły produktów
  console.log('📥 Pobieranie szczegółów produktów...');
  const productsData = await getProductsDetails(apiToken, productIds);
  
  // Pobierz stany magazynowe
  console.log('📊 Pobieranie stanów magazynowych...');
  const stockData = await getProductStock(apiToken, productIds);

  let created = 0, updated = 0, unchanged = 0, errors = 0;

  for (const [blProductId, blProduct] of Object.entries(productsData)) {
    try {
      const textFields = blProduct.text_fields || {};
      const name = textFields.name || `Produkt Outlet ${blProductId}`;
      const description = textFields.description || textFields.short_description || '';
      const ean = blProduct.ean || '';
      const sku = `${OUTLET_SKU_PREFIX}${blProductId}`;
      const baselinkerProductId = `outlet-${blProductId}`;
      
      // Cena - weź pierwszą dostępną
      let price = 0;
      if (blProduct.prices && Object.keys(blProduct.prices).length > 0) {
        const priceGroups = Object.values(blProduct.prices);
        price = parseFloat(priceGroups[0]) || 0;
      }
      
      // Zdjęcia
      const images = blProduct.images || [];
      
      // Stan magazynowy
      const stock = stockData[blProductId] || 0;
      
      // Slug
      let slug = slugify(name);
      if (!slug) slug = `outlet-${blProductId}`;
      
      // Sprawdź czy produkt już istnieje
      const existingProduct = await prisma.product.findUnique({
        where: { baselinkerProductId },
        include: { 
          images: true,
          variants: true 
        }
      });

      if (existingProduct) {
        // Aktualizuj istniejący
        const hasChanges = 
          existingProduct.name !== name ||
          existingProduct.price.toString() !== price.toString() ||
          (existingProduct.variants[0]?.stock || 0) !== stock;

        if (hasChanges) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name,
              description,
              price,
              categoryId: outletCategory.id,
              status: stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
              tags: ['outlet', 'zwrot'],
            }
          });

          // Aktualizuj wariant (stock)
          if (existingProduct.variants[0]) {
            await prisma.productVariant.update({
              where: { id: existingProduct.variants[0].id },
              data: { stock }
            });
          }

          updated++;
          console.log(`  ✅ Zaktualizowano: ${name.substring(0, 50)}... (stan: ${stock})`);
        } else {
          unchanged++;
        }
      } else {
        // Utwórz nowy produkt
        // Sprawdź unikalność sluga
        let finalSlug = slug;
        let slugCounter = 1;
        while (await prisma.product.findUnique({ where: { slug: finalSlug } })) {
          finalSlug = `${slug}-${slugCounter++}`;
        }

        // Sprawdź unikalność SKU
        let finalSku = sku;
        let skuCounter = 1;
        while (await prisma.product.findUnique({ where: { sku: finalSku } })) {
          finalSku = `${OUTLET_SKU_PREFIX}${blProductId}-${skuCounter++}`;
        }

        const newProduct = await prisma.product.create({
          data: {
            name,
            slug: finalSlug,
            description,
            sku: finalSku,
            barcode: ean || null,
            price,
            status: stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
            categoryId: outletCategory.id,
            baselinkerProductId,
            tags: ['outlet', 'zwrot'],
            images: {
              create: images.map((url, index) => ({
                url,
                alt: name,
                order: index,
              }))
            },
            variants: {
              create: {
                sku: `${finalSku}-VAR`,
                price,
                stock,
                isDefault: true,
              }
            }
          }
        });

        created++;
        console.log(`  🆕 Utworzono: ${name.substring(0, 50)}... (stan: ${stock})`);
      }
    } catch (e) {
      errors++;
      console.log(`  ❌ Błąd dla ${blProductId}: ${e.message}`);
    }
  }

  return { created, updated, unchanged, errors };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           SYNCHRONIZACJA OUTLET Z BASELINKER               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Sprawdź konfigurację
  if (!OUTLET_INVENTORY_ID) {
    console.log('❌ BŁĄD: Nie ustawiono OUTLET_INVENTORY_ID!');
    console.log('');
    console.log('   Instrukcja:');
    console.log('   1. Zaloguj się do Baselinkera');
    console.log('   2. Przejdź do: Magazyn -> Katalogi');
    console.log('   3. Utwórz nowy katalog o nazwie "Outlet"');
    console.log('   4. Skopiuj ID katalogu (widoczne w URL lub na liście)');
    console.log('   5. Wklej ID do zmiennej OUTLET_INVENTORY_ID w tym pliku');
    console.log('   6. Uruchom ponownie: node sync-outlet.js');
    console.log('');
    process.exit(1);
  }

  const apiToken = process.env.BASELINKER_API_TOKEN;
  if (!apiToken) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  const startTime = Date.now();

  // Upewnij się że kategoria Outlet istnieje
  const outletCategory = await getOutletCategory();
  console.log(`📁 Kategoria Outlet: ${outletCategory.id}`);

  // Synchronizuj produkty
  const result = await syncOutletProducts(apiToken, outletCategory);

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      PODSUMOWANIE                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  🆕 Utworzono:       ${result.created}`);
  console.log(`  ✅ Zaktualizowano:  ${result.updated}`);
  console.log(`  ⏭️  Bez zmian:       ${result.unchanged}`);
  console.log(`  ❌ Błędy:           ${result.errors}`);
  console.log(`  ⏱️  Czas:            ${elapsed}s`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
