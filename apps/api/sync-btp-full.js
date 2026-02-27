/**
 * ============================================================
 * SYNCHRONIZACJA PRODUKTÓW Z HURTOWNI BTP (only)
 * ============================================================
 * 
 * Skrypt synchronizuje WSZYSTKIE dane produktów z hurtowni BTP:
 * - Dane podstawowe (nazwa, opis, SKU, EAN)
 * - Ceny (z zaokrągleniem do .99)
 * - Stany magazynowe
 * - Zdjęcia (pełna wymiana)
 * - Tagi (z Baselinker)
 * - Kategorie (na podstawie category_id z Baselinker)
 * - Warianty (baselinkerVariantId)
 * 
 * Tryb testowy: domyślnie przetwarza MAX 100 produktów.
 * Ustaw MAX_PRODUCTS=0 aby zsynchronizować wszystkie.
 * 
 * Użycie:
 *   cd apps/api
 *   node sync-btp-full.js                  # test: 100 produktów
 *   node sync-btp-full.js --all            # pełna synchronizacja
 *   node sync-btp-full.js --dry-run        # tylko podgląd (bez zapisu)
 * 
 * Wymaga: .env z DATABASE_URL, BASELINKER_API_TOKEN (lub config w DB)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const path = require('path');
const { loadPriceRules, applyPriceMultiplier } = require('./lib/price-rules');

const prisma = new PrismaClient();

// Price rules loaded from Settings table
let priceRules = {};

// ============================================================
// KONFIGURACJA
// ============================================================

const BTP_INVENTORY_ID = 22953;
const BTP_PREFIX = 'btp-';           // prefix w baselinkerProductId
const BTP_SKU_PREFIX = 'BTP-';       // prefix w SKU
const PLN_PRICE_GROUP = '10034';
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const MIN_DELAY = 2500;              // ms między requestami API
const BATCH_SIZE = 100;              // produktów na batch (getInventoryProductsData)

const DRY_RUN = process.argv.includes('--dry-run');
const FULL_SYNC = process.argv.includes('--all');
// Obsługa --count=N
const countArg = process.argv.find(a => a.startsWith('--count='));
const MAX_PRODUCTS = FULL_SYNC ? 0 : (countArg ? parseInt(countArg.split('=')[1]) : 100); // 0 = bez limitu

// ============================================================
// STATS
// ============================================================

const stats = {
  totalInBl: 0,
  processed: 0,
  created: 0,
  updated: 0,
  imagesUpdated: 0,
  tagsUpdated: 0,
  categoriesAssigned: 0,
  pricesUpdated: 0,
  stockUpdated: 0,
  errors: 0,
  skipped: 0,
};

// ============================================================
// HELPERS
// ============================================================

let lastRequest = 0;

async function blRequest(token, method, parameters = {}) {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < MIN_DELAY) {
    await new Promise(r => setTimeout(r, MIN_DELAY - elapsed));
  }
  lastRequest = Date.now();

  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(BASELINKER_API_URL, {
        method: 'POST',
        headers: {
          'X-BLToken': token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();

      if (data.status === 'ERROR') {
        if (data.error_message?.includes('Query limit') || data.error_message?.includes('token blocked')) {
          const match = data.error_message.match(/until (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
          const waitMs = match
            ? Math.max(new Date(match[1]).getTime() - Date.now() + 5000, 10000)
            : 60000;
          console.log(`  ⏳ Rate limit, czekam ${Math.round(waitMs / 1000)}s...`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw new Error(`Baselinker error: ${data.error_message}`);
      }
      return data;
    } catch (e) {
      if (attempt < 4) {
        console.log(`  ⚠️ Błąd request (${attempt + 1}/5): ${e.message.slice(0, 80)}`);
        await new Promise(r => setTimeout(r, 3000 * Math.pow(2, attempt)));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

function priceTo99(price) {
  if (!price || price <= 0) return 0;
  const rounded = Math.floor(price) + 0.99;
  return Math.min(rounded, 99999999.99); // clamp for Decimal(10,2)
}

function getProductName(blProduct) {
  const tf = blProduct.text_fields || {};
  return tf.name || blProduct.name || '';
}

function getProductDescription(blProduct) {
  const tf = blProduct.text_fields || {};
  return tf.description || tf.description_extra1 || '';
}

function getProductEan(blProduct) {
  return blProduct.ean || blProduct.text_fields?.ean || null;
}

function getProductSku(blProduct, productId) {
  const raw = blProduct.sku || `BL-${productId}`;
  // Dodaj prefix BTP- jeśli go nie ma
  if (!raw.startsWith('BTP-') && !raw.startsWith('btp-')) {
    return `${BTP_SKU_PREFIX}${raw}`;
  }
  return raw;
}

function getProductTags(blProduct) {
  let tags = [];
  if (Array.isArray(blProduct.tags)) {
    tags = blProduct.tags.map(t => String(t).trim()).filter(Boolean);
  }
  if (tags.length === 0 && blProduct.text_fields?.extra_field_2) {
    tags = blProduct.text_fields.extra_field_2.split(',').map(t => t.trim()).filter(Boolean);
  }
  return tags;
}

function getProductPrice(blProduct) {
  const prices = blProduct.prices || {};
  let raw = 0;
  // Próbuj PLN price group
  if (prices[PLN_PRICE_GROUP] && parseFloat(prices[PLN_PRICE_GROUP]) > 0) {
    raw = parseFloat(prices[PLN_PRICE_GROUP]);
  } else {
    // Fallback: pierwsza cena > 0
    for (const val of Object.values(prices)) {
      const p = parseFloat(val);
      if (p > 0) { raw = p; break; }
    }
  }
  // Ostatni fallback
  if (raw <= 0) raw = parseFloat(blProduct.price_brutto) || 0;
  // Apply price multiplier rules, then round to .99
  return priceTo99(applyPriceMultiplier(raw, 'btp', priceRules));
}

function getProductImages(blProduct) {
  const images = blProduct.images || {};
  return Object.entries(images)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([, url]) => url)
    .filter(url => typeof url === 'string' && url.length > 5 && !url.endsWith('/'));
}

// ============================================================
// POBIERANIE DANYCH Z BASELINKER
// ============================================================

async function getApiToken() {
  // 1. Próbuj z DB (zaszyfrowany token)
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
        console.log('✅ Token API z bazy danych (zaszyfrowany)');
        return token;
      }
    }
  } catch (e) {
    // fallback
  }
  // 2. Z .env
  const token = process.env.BASELINKER_API_TOKEN;
  if (token) {
    console.log('✅ Token API z .env');
    return token;
  }
  throw new Error('Brak BASELINKER_API_TOKEN! Ustaw w .env lub w bazie.');
}

async function fetchAllProductList(token) {
  console.log(`\n📋 Pobieranie listy produktów BTP (ID: ${BTP_INVENTORY_ID})...`);
  let allProducts = [];
  let page = 1;

  while (true) {
    const resp = await blRequest(token, 'getInventoryProductsList', {
      inventory_id: BTP_INVENTORY_ID,
      page,
    });
    const products = Object.entries(resp.products || {}).map(([id, p]) => ({ id: parseInt(id), ...p }));
    if (products.length === 0) break;
    allProducts = allProducts.concat(products);
    console.log(`   Strona ${page}: ${products.length} produktów (razem: ${allProducts.length})`);
    page++;
  }

  stats.totalInBl = allProducts.length;
  console.log(`   📊 Łącznie w BTP: ${allProducts.length} produktów`);
  return allProducts;
}

async function fetchProductDetails(token, productIds) {
  return await blRequest(token, 'getInventoryProductsData', {
    inventory_id: BTP_INVENTORY_ID,
    products: productIds,
  });
}

async function fetchPrices(token) {
  console.log('\n💰 Pobieranie cen z BTP...');
  const priceMap = new Map();
  let page = 1;
  let more = true;

  while (more) {
    const resp = await blRequest(token, 'getInventoryProductsPrices', {
      inventory_id: BTP_INVENTORY_ID,
      page,
    });
    const products = resp.products || {};
    const entries = Object.entries(products);
    for (const [id, priceData] of entries) {
      const prices = priceData.prices || priceData;
      const pln = parseFloat(prices[PLN_PRICE_GROUP]) || 0;
      let raw = pln;
      if (raw <= 0) {
        for (const v of Object.values(prices)) {
          if (typeof v === 'number' && v > 0) { raw = v; break; }
        }
      }
      // Apply price multiplier rules, then round to .99
      const withMarkup = applyPriceMultiplier(raw, 'btp', priceRules);
      const finalPrice = priceTo99(withMarkup);
      if (finalPrice > 0 && finalPrice < 99999999 && isFinite(finalPrice)) {
        priceMap.set(id, finalPrice);
      }
    }
    more = entries.length === 1000;
    console.log(`   Strona ${page}: ${entries.length} cen (razem: ${priceMap.size})`);
    page++;
  }
  return priceMap;
}

async function fetchStock(token) {
  console.log('\n📦 Pobieranie stanów magazynowych BTP...');
  const stockMap = new Map();
  let page = 1;
  let more = true;

  while (more) {
    const resp = await blRequest(token, 'getInventoryProductsStock', {
      inventory_id: BTP_INVENTORY_ID,
      page,
    });

    const products = resp.products || {};
    const entries = Object.entries(products);
    for (const [id, stockData] of entries) {
      const stocks = stockData.stock || stockData;
      const total = Object.values(stocks).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
      stockMap.set(id, total);
    }

    more = entries.length === 1000;
    console.log(`   Strona ${page}: ${entries.length} stanów (razem: ${stockMap.size})`);
    page++;
  }

  console.log(`   📊 Stany dla ${stockMap.size} produktów`);
  return stockMap;
}

// ============================================================
// SYNC: PRODUKT → BAZA DANYCH
// ============================================================

async function syncProduct(blProduct, productId, existingProduct, priceFromApi, stockQty, categoryMap) {
  const baselinkerProductId = `${BTP_PREFIX}${productId}`;
  const name = getProductName(blProduct);
  if (!name) {
    stats.skipped++;
    return;
  }

  const sku = getProductSku(blProduct, productId);
  const slug = slugify(name) + '-' + productId;
  const price = priceFromApi || getProductPrice(blProduct);
  const description = getProductDescription(blProduct);
  const ean = getProductEan(blProduct);
  const tags = getProductTags(blProduct);
  const images = getProductImages(blProduct);

  // Kategoria z Baselinker category_id
  let categoryId = null;
  const blCategoryId = blProduct.category_id ? parseInt(blProduct.category_id) : null;
  if (blCategoryId && categoryMap) {
    const cat = categoryMap.get(blCategoryId);
    if (cat) {
      categoryId = cat.id;
    }
  }

  if (DRY_RUN) {
    const action = existingProduct ? 'UPDATE' : 'CREATE';
    const catName = categoryId ? categoryMap.get(blCategoryId)?.name : 'brak';
    console.log(`   [DRY] ${action} | ${sku} | ${name.slice(0, 50)} | ${price} PLN | stok: ${stockQty ?? '?'} | kat: ${catName} | img: ${images.length}`);
    stats[existingProduct ? 'updated' : 'created']++;
    return;
  }

  try {
    if (existingProduct) {
      // ====== UPDATE ======
      const updateData = {
        name,
        slug,
        description,
        sku,
        barcode: ean,
        price,
        tags,
        status: 'ACTIVE',
      };

      // Kategoria z Baselinker
      if (categoryId) {
        updateData.categoryId = categoryId;
        if (existingProduct.categoryId !== categoryId) {
          stats.categoriesAssigned++;
        }
      }

      // Sprawdź zmianę ceny
      const oldPrice = parseFloat(existingProduct.price || 0);
      if (Math.abs(oldPrice - price) > 0.01) {
        updateData.lowestPrice30Days = existingProduct.lowestPrice30Days
          ? Math.min(parseFloat(existingProduct.lowestPrice30Days), price)
          : price;
        updateData.lowestPrice30DaysAt = existingProduct.lowestPrice30DaysAt || new Date();
        stats.pricesUpdated++;
      }

      await prisma.product.update({
        where: { id: existingProduct.id },
        data: updateData,
      });

      // Aktualizuj wariant (cenę + sku)
      const variant = existingProduct.variants?.[0];
      if (variant) {
        const variantUpdate = { price, sku };
        const oldVarPrice = parseFloat(variant.price || 0);
        if (Math.abs(oldVarPrice - price) > 0.01) {
          variantUpdate.lowestPrice30Days = variant.lowestPrice30Days
            ? Math.min(parseFloat(variant.lowestPrice30Days), price)
            : price;
          variantUpdate.lowestPrice30DaysAt = variant.lowestPrice30DaysAt || new Date();
        }
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: variantUpdate,
        });
      }

      // Tagi — sprawdź zmianę
      const oldTags = existingProduct.tags || [];
      if (JSON.stringify(oldTags.sort()) !== JSON.stringify(tags.sort())) {
        stats.tagsUpdated++;
      }

      // Zdjęcia — wymień jeśli się zmieniły
      const oldImageUrls = (existingProduct.images || [])
        .sort((a, b) => a.order - b.order)
        .map(img => img.url);
      const imagesChanged =
        oldImageUrls.length !== images.length ||
        oldImageUrls.some((url, idx) => url !== images[idx]);

      if (imagesChanged && images.length > 0) {
        await prisma.productImage.deleteMany({ where: { productId: existingProduct.id } });
        await prisma.productImage.createMany({
          data: images.map((url, idx) => ({
            productId: existingProduct.id,
            url,
            alt: name,
            order: idx,
          })),
        });
        stats.imagesUpdated++;
      }

      // Stan magazynowy
      if (stockQty !== undefined && stockQty !== null) {
        await syncInventory(variant?.id || existingProduct.variants?.[0]?.id, stockQty);
      }

      stats.updated++;

    } else {
      // ====== CREATE ======
      
      // ====== CREATE ======

      let newProduct;
      let wasLinked = false;
      try {
        newProduct = await prisma.product.create({
          data: {
            name,
            slug: slug,
            description,
            sku,
            barcode: ean,
            price,
            status: 'ACTIVE',
            baselinkerProductId,
            tags,
            categoryId: categoryId || undefined,
            images: images.length > 0 ? {
              create: images.map((url, idx) => ({
                url,
                alt: name,
                order: idx,
              })),
            } : undefined,
            variants: {
              create: {
                name: 'Domyślny',
                sku,
                price,
                attributes: {},
                baselinkerVariantId: baselinkerProductId,
              },
            },
          },
          include: { variants: true },
        });
        stats.created++;
        if (categoryId) stats.categoriesAssigned++;
      } catch (createErr) {
        // P2002 = unique constraint (SKU/slug collision) — podłącz istniejący rekord
        if (createErr.code === 'P2002') {
          const existing = await prisma.product.findFirst({
            where: { OR: [{ sku }, { slug }] },
            include: { variants: true },
          });
          if (existing) {
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                name, description, sku, slug, barcode: ean, price,
                baselinkerProductId, tags, status: 'ACTIVE',
                categoryId: categoryId || undefined,
              },
            });
            const v = existing.variants?.[0];
            if (v) {
              await prisma.productVariant.update({
                where: { id: v.id },
                data: { sku, price, baselinkerVariantId: baselinkerProductId },
              });
            }
            newProduct = existing;
            wasLinked = true;
            stats.updated++;
            if (categoryId && existing.categoryId !== categoryId) stats.categoriesAssigned++;
            console.log(`   🔗 SKU ${sku} — podłączony do BL ${baselinkerProductId}`);
          } else {
            throw createErr;
          }
        } else {
          throw createErr;
        }
      }

      // Stan magazynowy
      if (stockQty !== undefined && stockQty !== null && newProduct?.variants?.[0]) {
        await syncInventory(newProduct.variants[0].id, stockQty);
      }
    }

    stats.processed++;
  } catch (err) {
    stats.errors++;
    if (stats.errors <= 50) {
      console.error(`   ❌ Błąd ${sku || productId}: ${err.message.slice(0, 500)}`);
      if (err.meta) console.error(`      meta:`, JSON.stringify(err.meta));
    }
  }
}

async function syncInventory(variantId, quantity) {
  if (!variantId) return;

  let defaultLocation = await prisma.location.findFirst({ where: { code: 'MAIN' } });
  if (!defaultLocation) {
    defaultLocation = await prisma.location.create({
      data: { name: 'Magazyn główny', code: 'MAIN', type: 'WAREHOUSE' },
    });
  }

  await prisma.inventory.upsert({
    where: {
      variantId_locationId: {
        variantId,
        locationId: defaultLocation.id,
      },
    },
    create: {
      variantId,
      locationId: defaultLocation.id,
      quantity,
      reserved: 0,
    },
    update: { quantity },
  });
  stats.stockUpdated++;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const startTime = Date.now();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        SYNCHRONIZACJA BTP — PEŁNA SYNCHRONIZACJA         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📋 Tryb: ${DRY_RUN ? 'DRY RUN (bez zapisu)' : 'ZAPIS DO BAZY'}`);
  console.log(`📋 Limit: ${MAX_PRODUCTS || 'BEZ LIMITU (--all)'}`);
  console.log(`📋 Prefix: ${BTP_PREFIX} / SKU: ${BTP_SKU_PREFIX}`);
  console.log(`📋 Inventory ID: ${BTP_INVENTORY_ID}\n`);

  // 0. Załaduj reguły cenowe z bazy
  priceRules = await loadPriceRules(prisma);
  const btpRulesCount = priceRules.btp ? priceRules.btp.length : 0;
  console.log(`📊 Reguły cenowe BTP: ${btpRulesCount} ${btpRulesCount > 0 ? '(mnożniki aktywne)' : '(brak — ceny bez mnożnika)'}\n`);

  // 1. Pobierz token
  const token = await getApiToken();

  // 2. Pobierz listę produktów BTP
  const productList = await fetchAllProductList(token);
  if (productList.length === 0) {
    console.log('⚠️ Brak produktów w BTP!');
    return;
  }

  // 3. Ogranicz do MAX_PRODUCTS (tryb testowy)
  const productsToSync = MAX_PRODUCTS > 0
    ? productList.slice(0, MAX_PRODUCTS)
    : productList;
  console.log(`\n🔄 Produkty do synchronizacji: ${productsToSync.length} / ${productList.length}`);

  // 4. Pobierz ceny i stany z BTP
  const priceMap = await fetchPrices(token);
  const stockMap = await fetchStock(token);

  // 5. Pobierz istniejące produkty BTP z bazy
  console.log('\n📚 Pobieranie istniejących produktów BTP z bazy...');
  const existingProducts = await prisma.product.findMany({
    where: {
      OR: [
        { baselinkerProductId: { startsWith: BTP_PREFIX } },
        { sku: { startsWith: BTP_SKU_PREFIX } },
      ],
    },
    select: {
      id: true,
      baselinkerProductId: true,
      name: true,
      sku: true,
      price: true,
      tags: true,
      categoryId: true,
      lowestPrice30Days: true,
      lowestPrice30DaysAt: true,
      images: { select: { id: true, url: true, order: true } },
      variants: {
        select: {
          id: true,
          sku: true,
          price: true,
          baselinkerVariantId: true,
          lowestPrice30Days: true,
          lowestPrice30DaysAt: true,
        },
        take: 1,
      },
    },
  });

  const existingMap = new Map();
  for (const p of existingProducts) {
    if (p.baselinkerProductId) existingMap.set(p.baselinkerProductId, p);
  }
  console.log(`   Znaleziono ${existingProducts.length} produktów BTP w bazie`);

  // 5b. Pobierz mapę kategorii (baselinkerCategoryId → category)
  console.log('\n📂 Ładowanie mapy kategorii z bazy...');
  const allCategories = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { id: true, name: true, baselinkerCategoryId: true },
  });
  const categoryMap = new Map();
  for (const cat of allCategories) {
    categoryMap.set(parseInt(cat.baselinkerCategoryId), cat);
  }
  console.log(`   Załadowano ${categoryMap.size} kategorii z baselinkerCategoryId\n`);

  // 6. Synchronizacja batch po batch
  const productIds = productsToSync.map(p => p.id);
  const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);

  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batchIds = productIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`\n📥 Batch ${batchNum}/${totalBatches} (${batchIds.length} produktów)...`);

    // Pobierz szczegóły z Baselinker (dane + zdjęcia + tagi)
    const resp = await fetchProductDetails(token, batchIds);
    const productsData = resp.products || {};

    for (const [productId, blProduct] of Object.entries(productsData)) {
      if (!blProduct || typeof blProduct !== 'object') continue;

      const blId = `${BTP_PREFIX}${productId}`;
      const existing = existingMap.get(blId);
      const priceFromApi = priceMap.get(productId.toString());
      const stockQty = stockMap.get(productId.toString());

      await syncProduct(blProduct, productId, existing, priceFromApi, stockQty, categoryMap);
    }

    // Progress
    const done = Math.min(i + BATCH_SIZE, productIds.length);
    console.log(`   ✅ Progress: ${done}/${productIds.length} (${Math.round(done / productIds.length * 100)}%)`);
  }

  // 7. Podsumowanie
  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      PODSUMOWANIE                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`⏱️  Czas: ${elapsed}s`);
  console.log(`📦 Produktów w BTP (Baselinker): ${stats.totalInBl}`);
  console.log(`🔄 Zsynchronizowanych:           ${stats.processed}`);
  console.log(`➕ Nowych (CREATE):              ${stats.created}`);
  console.log(`✏️  Zaktualizowanych (UPDATE):    ${stats.updated}`);
  console.log(`💰 Cen zmienionych:              ${stats.pricesUpdated}`);
  console.log(`📦 Stanów zaktualizowanych:       ${stats.stockUpdated}`);
  console.log(`🖼️  Zdjęć zaktualizowanych:       ${stats.imagesUpdated}`);
  console.log(`🏷️  Tagów zmienionych:            ${stats.tagsUpdated}`);
  console.log(`📂 Kategorii przypisanych:        ${stats.categoriesAssigned}`);
  console.log(`⏭️  Pominiętych:                  ${stats.skipped}`);
  console.log(`❌ Błędów:                        ${stats.errors}`);
  if (DRY_RUN) {
    console.log('\n  ℹ️  DRY RUN — żadne zmiany NIE zostały zapisane.');
    console.log('  Uruchom bez --dry-run aby zapisać.');
  }
  console.log('\n🎉 GOTOWE!\n');
}

main()
  .catch(async (err) => {
    console.error('❌ Błąd krytyczny:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
