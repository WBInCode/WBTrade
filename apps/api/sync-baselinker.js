#!/usr/bin/env node
/**
 * ============================================
 * 🔄 BASELINKER MANUAL SYNC SCRIPT
 * ============================================
 * 
 * Skrypt do ręcznej synchronizacji danych z BaseLinker
 * z kompleksowymi logami i raportowaniem.
 * 
 * Użycie:
 *   node sync-baselinker.js [opcje]
 * 
 * Opcje:
 *   --type=<typ>        Typ synchronizacji: full | products | categories | stock | images
 *   --dry-run           Tylko podgląd, bez zapisywania zmian
 *   --verbose           Szczegółowe logi
 *   --limit=<n>         Limit produktów do przetworzenia
 *   --token=<token>     API Token BaseLinker (alternatywnie: env BASELINKER_API_TOKEN)
 *   --inventory=<id>    ID magazynu BaseLinker (alternatywnie: env BASELINKER_INVENTORY_ID)
 * 
 * Przykłady:
 *   node sync-baselinker.js --type=full
 *   node sync-baselinker.js --type=products --limit=10 --verbose
 *   node sync-baselinker.js --type=stock --dry-run
 *   node sync-baselinker.js --token=XXX --inventory=123 --type=categories
 * 
 * Konfiguracja:
 *   Token i ID magazynu można podać na 3 sposoby (priorytet w kolejności):
 *   1. Argumenty CLI: --token=XXX --inventory=123
 *   2. Zmienne środowiskowe: BASELINKER_API_TOKEN, BASELINKER_INVENTORY_ID
 *   3. Konfiguracja w bazie danych (z panelu admina)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { CategoryMapper } = require('./src/services/category-mapper.service');

// ============================================
// KONFIGURACJA
// ============================================

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Inicjalizacja mappera kategorii
const categoryMapper = new CategoryMapper();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

// Parsowanie argumentów CLI
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

const SYNC_TYPE = args.type || 'full';
const DRY_RUN = args['dry-run'] === true;
const VERBOSE = args.verbose === true;
const LIMIT = parseInt(args.limit) || null;
const START_BATCH = parseInt(args['start-batch']) || 1;
const END_BATCH = parseInt(args['end-batch']) || null;
const API_TOKEN = args.token || process.env.BASELINKER_API_TOKEN || null;
const INVENTORY_ID = args.inventory || process.env.BASELINKER_INVENTORY_ID || null;

// ============================================
// LOGGER
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

class Logger {
  constructor() {
    this.startTime = Date.now();
    this.stats = {
      info: 0,
      warn: 0,
      error: 0,
      success: 0,
    };
  }

  timestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 23);
  }

  elapsed() {
    const ms = Date.now() - this.startTime;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }

  _log(level, icon, color, message, data = null) {
    this.stats[level] = (this.stats[level] || 0) + 1;
    const timestamp = `${colors.dim}[${this.timestamp()}]${colors.reset}`;
    const levelTag = `${color}${icon}${colors.reset}`;
    
    console.log(`${timestamp} ${levelTag} ${message}`);
    
    if (data && VERBOSE) {
      console.log(`${colors.dim}   └─ ${JSON.stringify(data, null, 2).split('\n').join('\n      ')}${colors.reset}`);
    }
  }

  info(message, data = null) {
    this._log('info', 'ℹ️ ', colors.blue, message, data);
  }

  success(message, data = null) {
    this._log('success', '✅', colors.green, message, data);
  }

  warn(message, data = null) {
    this._log('warn', '⚠️ ', colors.yellow, message, data);
  }

  error(message, data = null) {
    this._log('error', '❌', colors.red, message, data);
  }

  debug(message, data = null) {
    if (VERBOSE) {
      this._log('debug', '🔍', colors.dim, message, data);
    }
  }

  section(title) {
    console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
  }

  subsection(title) {
    console.log(`\n${colors.yellow}  ▸ ${title}${colors.reset}`);
    console.log(`${colors.dim}  ${'─'.repeat(50)}${colors.reset}`);
  }

  progress(current, total, item = '') {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    process.stdout.write(`\r${colors.cyan}  [${bar}] ${percent}% (${current}/${total})${item ? ` - ${item.slice(0, 30)}` : ''}${colors.reset}     `);
    if (current === total) console.log('');
  }

  table(data, columns) {
    console.log('');
    const header = columns.map(c => c.padEnd(20)).join(' │ ');
    console.log(`  ${colors.bright}${header}${colors.reset}`);
    console.log(`  ${'─'.repeat(header.length)}`);
    for (const row of data) {
      const line = columns.map(c => String(row[c] || '-').slice(0, 20).padEnd(20)).join(' │ ');
      console.log(`  ${line}`);
    }
    console.log('');
  }

  summary() {
    console.log(`\n${colors.bright}${colors.magenta}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}  📊 PODSUMOWANIE${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}${'═'.repeat(60)}${colors.reset}\n`);
    
    console.log(`  ${colors.blue}ℹ️  Info:${colors.reset}     ${this.stats.info}`);
    console.log(`  ${colors.green}✅ Success:${colors.reset}  ${this.stats.success}`);
    console.log(`  ${colors.yellow}⚠️  Warnings:${colors.reset} ${this.stats.warn}`);
    console.log(`  ${colors.red}❌ Errors:${colors.reset}   ${this.stats.error}`);
    console.log(`  ${colors.dim}⏱️  Czas:${colors.reset}     ${this.elapsed()}`);
    console.log('');
  }
}

const log = new Logger();

// ============================================
// SZYFROWANIE (z oryginalnego kodu)
// ============================================

function decryptToken(encryptedData, iv, authTag) {
  const ENCRYPTION_KEY = process.env.BASELINKER_ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('BASELINKER_ENCRYPTION_KEY nie jest ustawiony w .env');
  }
  
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ============================================
// BASELINKER API CLIENT
// ============================================

class BaselinkerClient {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  async request(method, parameters = {}) {
    // Rate limiting (max 100 requests per minute)
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 100) {
      await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;

    log.debug(`API Request: ${method}`, { parameters: Object.keys(parameters) });

    const formData = new URLSearchParams();
    formData.append('token', this.apiToken);
    formData.append('method', method);
    formData.append('parameters', JSON.stringify(parameters));

    const response = await fetch(BASELINKER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await response.json();

    if (data.status === 'ERROR') {
      throw new Error(`BaseLinker API Error: ${data.error_message || data.error_code}`);
    }

    return data;
  }

  async getInventories() {
    const response = await this.request('getInventories');
    return response.inventories || [];
  }

  async getInventoryCategories(inventoryId) {
    const response = await this.request('getInventoryCategories', { inventory_id: parseInt(inventoryId) });
    return response.categories || [];
  }

  async getInventoryProductsList(inventoryId, page = 1) {
    const response = await this.request('getInventoryProductsList', {
      inventory_id: parseInt(inventoryId),
      page,
    });
    return {
      products: response.products || {},
      hasMore: Object.keys(response.products || {}).length === 1000,
    };
  }

  async getInventoryProductsData(inventoryId, productIds) {
    const response = await this.request('getInventoryProductsData', {
      inventory_id: parseInt(inventoryId),
      products: productIds.map(id => parseInt(id)),
    });
    return response.products || {};
  }

  async getInventoryProductsStock(inventoryId) {
    const response = await this.request('getInventoryProductsStock', {
      inventory_id: parseInt(inventoryId),
    });
    return response.products || {};
  }
}

// ============================================
// SYNCHRONIZACJA
// ============================================

async function getConfig() {
  log.subsection('Pobieranie konfiguracji BaseLinker');
  
  // Sprawdź czy podano token i inventory_id z CLI lub env
  if (API_TOKEN && INVENTORY_ID) {
    log.info('Używam konfiguracji z CLI/zmiennych środowiskowych', {
      inventoryId: INVENTORY_ID,
      tokenSource: args.token ? 'CLI' : 'ENV',
    });
    log.info(`Token (masked): ${API_TOKEN.slice(0, 8)}...${API_TOKEN.slice(-4)}`);
    return { apiToken: API_TOKEN, inventoryId: INVENTORY_ID };
  }
  
  // Fallback do konfiguracji z bazy danych
  const config = await prisma.baselinkerConfig.findFirst();
  
  if (!config) {
    throw new Error('Brak konfiguracji BaseLinker. Użyj --token=XXX --inventory=YYY lub skonfiguruj w panelu admina.');
  }

  log.info('Konfiguracja znaleziona w bazie danych', {
    inventoryId: config.inventoryId,
    lastSyncAt: config.lastSyncAt?.toISOString() || 'nigdy',
    createdAt: config.createdAt.toISOString(),
  });

  const apiToken = decryptToken(
    config.apiTokenEncrypted,
    config.encryptionIv,
    config.authTag
  );

  log.success('Token API odszyfrowany pomyślnie');
  log.info(`Token (masked): ${apiToken.slice(0, 8)}...${apiToken.slice(-4)}`);

  return { apiToken, inventoryId: config.inventoryId };
}

// Mapa kategorii BaseLinker ID -> pełna ścieżka
let blCategoryPathMap = new Map();

async function syncCategories(client, inventoryId) {
  log.section('🗂️  SYNCHRONIZACJA KATEGORII');
  
  const stats = { created: 0, updated: 0, skipped: 0, mappedCategories: 0, errors: [] };

  // Pobierz kategorie z BaseLinker
  log.info('Pobieranie kategorii z BaseLinker...');
  const blCategories = await client.getInventoryCategories(inventoryId);
  log.success(`Pobrano ${blCategories.length} kategorii z BaseLinker`);

  // Buduj mapę ID -> pełna ścieżka
  blCategoryPathMap = new Map();
  for (const blCat of blCategories) {
    blCategoryPathMap.set(blCat.category_id.toString(), blCat.name);
  }
  log.info(`Zbudowano mapę ścieżek kategorii (${blCategoryPathMap.size} pozycji)`);

  // Stwórz zunifikowane kategorie z pliku mapowania
  log.subsection('Tworzenie zunifikowanych kategorii sklepu');
  
  const config = categoryMapper.config;
  if (!config || !config.mainCategories) {
    log.warn('Brak konfiguracji mapowania kategorii!');
    return stats;
  }

  for (const mainCat of config.mainCategories) {
    // Twórz główną kategorię
    const mainSlug = mainCat.slug;
    try {
      const existingMain = await prisma.category.findUnique({ where: { slug: mainSlug } });
      
      if (!existingMain) {
        if (!DRY_RUN) {
          await prisma.category.create({
            data: {
              name: mainCat.name,
              slug: mainSlug,
              isActive: true,
            },
          });
          stats.created++;
          log.debug(`Utworzono główną kategorię: ${mainCat.name}`);
        } else {
          log.debug(`[DRY-RUN] Utworzy główną kategorię: ${mainCat.name}`);
          stats.created++;
        }
      } else {
        stats.skipped++;
      }

      // Twórz podkategorie
      if (mainCat.subcategories) {
        const parentCategory = existingMain || (DRY_RUN ? null : await prisma.category.findUnique({ where: { slug: mainSlug } }));
        
        for (const subCat of mainCat.subcategories) {
          const subSlug = `${mainSlug}-${subCat.slug}`;
          const existingSub = await prisma.category.findUnique({ where: { slug: subSlug } });
          
          if (!existingSub) {
            if (!DRY_RUN) {
              await prisma.category.create({
                data: {
                  name: subCat.name,
                  slug: subSlug,
                  parentId: parentCategory?.id,
                  isActive: true,
                },
              });
              stats.created++;
              log.debug(`Utworzono podkategorię: ${mainCat.name} > ${subCat.name}`);
            } else {
              log.debug(`[DRY-RUN] Utworzy podkategorię: ${mainCat.name} > ${subCat.name}`);
              stats.created++;
            }
          } else {
            stats.skipped++;
          }
        }
      }
    } catch (error) {
      stats.errors.push({ category: mainCat.name, error: error.message });
      log.error(`Błąd kategorii ${mainCat.name}: ${error.message}`);
    }
  }

  // Stwórz kategorię "Inne" (fallback)
  const fallbackSlug = config.fallbackCategory?.slug || 'inne';
  const existingFallback = await prisma.category.findUnique({ where: { slug: fallbackSlug } });
  if (!existingFallback && !DRY_RUN) {
    await prisma.category.create({
      data: {
        name: config.fallbackCategory?.name || 'Inne',
        slug: fallbackSlug,
        isActive: true,
      },
    });
    stats.created++;
  }

  log.subsection('Podsumowanie kategorii');
  log.info(`Utworzono: ${stats.created}`);
  log.info(`Pominięto (już istnieją): ${stats.skipped}`);
  log.info(`Mapa ścieżek BaseLinker: ${blCategoryPathMap.size} pozycji`);
  if (stats.errors.length > 0) {
    log.warn(`Błędy: ${stats.errors.length}`);
  }

  return stats;
}

async function syncProducts(client, inventoryId) {
  log.section('📦 SYNCHRONIZACJA PRODUKTÓW');
  
  const stats = { created: 0, updated: 0, skipped: 0, errors: [], images: 0, variants: 0 };

  // Pobierz listę produktów z BaseLinker (wszystkie strony)
  log.info('Pobieranie listy produktów z BaseLinker...');
  let allProductIds = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    // Jeśli mamy limit i już go osiągnęliśmy, przerwij pobieranie
    if (LIMIT && allProductIds.length >= LIMIT) {
      log.info(`Osiągnięto limit ${LIMIT} - przerywam pobieranie listy`);
      break;
    }
    
    const result = await client.getInventoryProductsList(inventoryId, page);
    const productIds = Object.keys(result.products);
    allProductIds.push(...productIds.map(id => parseInt(id)));
    hasMore = result.hasMore;
    page++;
    log.debug(`Strona ${page - 1}: ${productIds.length} produktów (łącznie: ${allProductIds.length})`);
  }

  // Zastosuj limit
  if (LIMIT && allProductIds.length > LIMIT) {
    allProductIds = allProductIds.slice(0, LIMIT);
  }

  log.success(`Do przetworzenia: ${allProductIds.length} produktów`);

  // Pobierz istniejące produkty z bazy
  const existingProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { not: null } },
    select: { id: true, baselinkerProductId: true, name: true, price: true },
  });
  const existingMap = new Map(existingProducts.map(p => [p.baselinkerProductId, p]));
  log.info(`Znaleziono ${existingProducts.length} istniejących produktów w bazie`);

  // Pobieranie szczegółów produktów w batchach
  const BATCH_SIZE = 100;
  const batches = [];
  for (let i = 0; i < allProductIds.length; i += BATCH_SIZE) {
    batches.push(allProductIds.slice(i, i + BATCH_SIZE));
  }

  // Określ zakres batchów do przetworzenia
  const startBatchIdx = START_BATCH - 1; // Konwersja na 0-based index
  const endBatchIdx = END_BATCH ? Math.min(END_BATCH, batches.length) : batches.length;
  
  if (startBatchIdx > 0 || END_BATCH) {
    log.info(`Przetwarzanie batchów od ${START_BATCH} do ${endBatchIdx} (z ${batches.length} łącznie)`);
  } else {
    log.info(`Przetwarzanie w ${batches.length} batchach po max ${BATCH_SIZE} produktów`);
  }

  for (let batchIdx = startBatchIdx; batchIdx < endBatchIdx; batchIdx++) {
    const batch = batches[batchIdx];
    log.subsection(`Batch ${batchIdx + 1}/${batches.length} (${batch.length} produktów)`);

    // Pobierz szczegóły produktów
    const productsData = await client.getInventoryProductsData(inventoryId, batch);
    
    // productsData to obiekt { product_id: product_data, ... }
    const productEntries = Object.entries(productsData);

    for (let i = 0; i < productEntries.length; i++) {
      const [productId, blProduct] = productEntries[i];
      
      // Wyciągnij nazwę
      let name = '';
      if (blProduct.text_fields?.name) {
        name = blProduct.text_fields.name;
      } else if (blProduct.text_fields?.pl?.name) {
        name = blProduct.text_fields.pl.name;
      } else if (blProduct.name) {
        name = blProduct.name;
      } else {
        name = `Product ${productId}`;
      }

      // Wyciągnij opis
      let description = '';
      if (blProduct.text_fields?.description) {
        description = blProduct.text_fields.description;
      } else if (blProduct.text_fields?.pl?.description) {
        description = blProduct.text_fields.pl.description;
      }

      // Wyciągnij cenę - sprawdź różne pola
      // Domyślna grupa cenowa PLN = 10034
      const DEFAULT_PLN_PRICE_GROUP = '10034';
      let price = 0;
      let priceSource = '';
      
      if (blProduct.price_brutto && parseFloat(blProduct.price_brutto) > 0) {
        price = parseFloat(blProduct.price_brutto);
        priceSource = 'price_brutto';
      } else if (blProduct.prices && typeof blProduct.prices === 'object') {
        // Najpierw sprawdź domyślną grupę PLN
        if (blProduct.prices[DEFAULT_PLN_PRICE_GROUP] && parseFloat(blProduct.prices[DEFAULT_PLN_PRICE_GROUP]) > 0) {
          price = parseFloat(blProduct.prices[DEFAULT_PLN_PRICE_GROUP]);
          priceSource = `prices[${DEFAULT_PLN_PRICE_GROUP}] (PLN)`;
        } else {
          // Fallback: pierwsza niezerowa cena
          for (const [groupId, p] of Object.entries(blProduct.prices)) {
            if (p && parseFloat(p) > 0) {
              price = parseFloat(p);
              priceSource = `prices[${groupId}] (fallback)`;
              break;
            }
          }
        }
      } else if (blProduct.price_netto && parseFloat(blProduct.price_netto) > 0) {
        const taxRate = blProduct.tax_rate || 23;
        price = parseFloat(blProduct.price_netto) * (1 + taxRate / 100);
        priceSource = 'price_netto + VAT';
      }
      
      // EAN/Barcode
      const ean = blProduct.ean ? String(blProduct.ean).trim() : null;
      
      const sku = blProduct.sku || `BL-${productId}`;
      const images = blProduct.images ? Object.values(blProduct.images) : [];
      const variants = blProduct.variants || [];

      // Debug logging dla cen i EAN
      if (VERBOSE) {
        log.debug(`  Produkt ${productId}:`);
        log.debug(`    prices object: ${JSON.stringify(blProduct.prices)}`);
        log.debug(`    => Cena: ${price} PLN (źródło: ${priceSource})`);
        log.debug(`    EAN: ${ean || '(brak)'}`);
      }

      if (price === 0) {
        log.warn(`Produkt ${productId} "${name}" ma cenę 0!`);
      }

      log.progress(
        batchIdx * BATCH_SIZE + i + 1, 
        allProductIds.length, 
        name.slice(0, 40)
      );

      try {
        const existing = existingMap.get(productId);

        if (DRY_RUN) {
          if (existing) {
            log.debug(`[DRY-RUN] Aktualizacja: ${name}`);
            stats.updated++;
          } else {
            log.debug(`[DRY-RUN] Nowy produkt: ${name}`);
            stats.created++;
          }
          stats.images += images.length;
          stats.variants += variants.length;
          continue;
        }

        // Znajdź kategorię używając mappera
        let categoryId = null;
        let blCategoryPath = null;
        
        if (blProduct.category_id) {
          // Pobierz pełną ścieżkę kategorii z mapy
          blCategoryPath = blCategoryPathMap.get(blProduct.category_id.toString());
          
          // Użyj mappera do znalezienia zunifikowanej kategorii
          const mapping = categoryMapper.mapCategory(blCategoryPath, name);
          
          // Znajdź kategorię w bazie na podstawie mapowania
          const categorySlug = mapping.subSlug 
            ? `${mapping.mainSlug}-${mapping.subSlug}` 
            : mapping.mainSlug;
          
          const category = await prisma.category.findUnique({
            where: { slug: categorySlug },
          });
          categoryId = category?.id || null;
          
          if (VERBOSE && mapping.confidence > 0) {
            log.debug(`    Kategoria BL: ${blCategoryPath}`);
            log.debug(`    => Zmapowano na: ${mapping.mainCategory}${mapping.subCategory ? ' > ' + mapping.subCategory : ''} (${mapping.confidence}%)`);
          }
        }

        // Upsert produktu
        const slug = name.toLowerCase()
          .replace(/[ąćęłńóśźż]/g, c => ({ą:'a',ć:'c',ę:'e',ł:'l',ń:'n',ó:'o',ś:'s',ź:'z',ż:'z'}[c] || c))
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .slice(0, 100);

        const product = await prisma.product.upsert({
          where: { baselinkerProductId: productId },
          update: {
            name,
            description,
            price,
            sku,
            categoryId,
            barcode: ean,
            baselinkerCategoryPath: blCategoryPath,
            specifications: blProduct.features || {},
            status: 'ACTIVE',
          },
          create: {
            baselinkerProductId: productId,
            name,
            slug: `${slug}-${productId}`,
            description,
            price,
            sku,
            categoryId,
            barcode: ean,
            baselinkerCategoryPath: blCategoryPath,
            specifications: blProduct.features || {},
            status: 'ACTIVE',
          },
        });

        // Sync images
        if (images.length > 0) {
          await prisma.productImage.deleteMany({ where: { productId: product.id } });
          for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
            await prisma.productImage.create({
              data: {
                productId: product.id,
                url: images[imgIdx],
                order: imgIdx,
              },
            });
          }
          stats.images += images.length;
        }

        // Sync variants
        if (variants.length > 0) {
          for (const blVariant of variants) {
            const variantId = blVariant.variant_id.toString();
            await prisma.productVariant.upsert({
              where: { baselinkerVariantId: variantId },
              update: {
                name: blVariant.name || `Wariant ${variantId}`,
                price: blVariant.price_brutto || price,
                sku: blVariant.sku || `BL-V-${variantId}`,
              },
              create: {
                baselinkerVariantId: variantId,
                productId: product.id,
                name: blVariant.name || `Wariant ${variantId}`,
                price: blVariant.price_brutto || price,
                sku: blVariant.sku || `BL-V-${variantId}`,
              },
            });
          }
          stats.variants += variants.length;
        }

        if (existing) {
          stats.updated++;
        } else {
          stats.created++;
        }
      } catch (error) {
        stats.errors.push({ product: name, error: error.message });
        log.error(`Błąd produktu ${name}: ${error.message}`);
      }
    }
  }

  log.subsection('Podsumowanie produktów');
  log.info(`Utworzono: ${stats.created}`);
  log.info(`Zaktualizowano: ${stats.updated}`);
  log.info(`Pominięto: ${stats.skipped}`);
  log.info(`Zdjęcia: ${stats.images}`);
  log.info(`Warianty: ${stats.variants}`);
  if (stats.errors.length > 0) {
    log.warn(`Błędy: ${stats.errors.length}`);
  }

  return stats;
}

async function syncStock(client, inventoryId) {
  log.section('📊 SYNCHRONIZACJA STANÓW MAGAZYNOWYCH');
  
  const stats = { updated: 0, skipped: 0, errors: [] };

  // Pobierz stany z BaseLinker
  log.info('Pobieranie stanów magazynowych z BaseLinker...');
  const stockData = await client.getInventoryProductsStock(inventoryId);
  const productIds = Object.keys(stockData);
  log.success(`Pobrano stany dla ${productIds.length} produktów`);

  // Pobierz produkty z bazy
  const products = await prisma.product.findMany({
    where: { baselinkerProductId: { in: productIds } },
    select: { id: true, baselinkerProductId: true },
  });
  const productMap = new Map(products.map(p => [p.baselinkerProductId, p]));
  log.info(`Znaleziono ${products.length} pasujących produktów w bazie`);

  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    const stockInfo = stockData[productId];
    const product = productMap.get(productId);

    log.progress(i + 1, productIds.length, `Product ${productId}`);

    if (!product) {
      stats.skipped++;
      continue;
    }

    try {
      // stock może być liczbą lub obiektem z wariantami
      const stock = typeof stockInfo.stock === 'number' 
        ? stockInfo.stock 
        : (stockInfo.stock?.['0'] || 0);

      if (DRY_RUN) {
        log.debug(`[DRY-RUN] Stock ${productId}: ${stock}`);
        stats.updated++;
        continue;
      }

      // Upsert inventory
      await prisma.inventory.upsert({
        where: { productId: product.id },
        update: { quantity: stock, lastSyncAt: new Date() },
        create: { productId: product.id, quantity: stock },
      });

      stats.updated++;
    } catch (error) {
      stats.errors.push({ product: productId, error: error.message });
      log.error(`Błąd stock ${productId}: ${error.message}`);
    }
  }

  log.subsection('Podsumowanie stanów');
  log.info(`Zaktualizowano: ${stats.updated}`);
  log.info(`Pominięto (brak w bazie): ${stats.skipped}`);
  if (stats.errors.length > 0) {
    log.warn(`Błędy: ${stats.errors.length}`);
  }

  return stats;
}

async function reindexMeilisearch() {
  log.section('🔍 REINDEKSACJA MEILISEARCH');
  
  const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
  const MEILI_KEY = process.env.MEILI_MASTER_KEY;
  
  if (!MEILI_KEY) {
    log.warn('MEILI_MASTER_KEY nie jest ustawiony, pomijam reindeksację');
    return;
  }

  log.info('Pobieranie produktów do indeksowania...');
  
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: true,
      images: { orderBy: { order: 'asc' }, take: 1 },
      variants: true,
    },
  });

  log.info(`Znaleziono ${products.length} aktywnych produktów`);

  if (DRY_RUN) {
    log.info('[DRY-RUN] Pominięto wysyłanie do Meilisearch');
    return;
  }

  // Przygotuj dokumenty
  const documents = products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description?.slice(0, 1000) || '',
    price: parseFloat(p.price?.toString() || '0'),
    sku: p.sku,
    category: p.category?.name || '',
    categoryId: p.categoryId,
    image: p.images[0]?.url || '',
    stock: p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0,
    status: p.status,
  }));

  // Wyślij do Meilisearch
  log.info('Wysyłanie do Meilisearch...');
  
  try {
    const response = await fetch(`${MEILI_HOST}/indexes/products/documents?primaryKey=id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MEILI_KEY}`,
      },
      body: JSON.stringify(documents),
    });

    const result = await response.json();
    log.success(`Meilisearch task: ${result.taskUid}`);
  } catch (error) {
    log.error(`Błąd Meilisearch: ${error.message}`);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log(`
${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔄 BASELINKER SYNC SCRIPT                                   ║
║   WBTrade E-commerce Platform                                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  log.info(`Typ synchronizacji: ${SYNC_TYPE}`);
  log.info(`Tryb: ${DRY_RUN ? 'DRY-RUN (bez zmian)' : 'PRODUKCYJNY'}`);
  log.info(`Verbose: ${VERBOSE ? 'TAK' : 'NIE'}`);
  if (LIMIT) log.info(`Limit produktów: ${LIMIT}`);

  try {
    // Pobierz konfigurację
    const { apiToken, inventoryId } = await getConfig();
    const client = new BaselinkerClient(apiToken);

    // Test połączenia
    log.subsection('Test połączenia z BaseLinker');
    const inventories = await client.getInventories();
    log.success(`Połączono! Znaleziono ${inventories.length} magazynów`);
    
    const activeInventory = inventories.find(i => i.inventory_id.toString() === inventoryId);
    if (activeInventory) {
      log.info(`Aktywny magazyn: ${activeInventory.name} (ID: ${inventoryId})`);
    }

    // Buduj mapę kategorii jeśli będziemy synchronizować produkty
    if (SYNC_TYPE === 'full' || SYNC_TYPE === 'products') {
      if (blCategoryPathMap.size === 0) {
        log.info('Budowanie mapy kategorii BaseLinker...');
        const blCategories = await client.getInventoryCategories(inventoryId);
        for (const blCat of blCategories) {
          blCategoryPathMap.set(blCat.category_id.toString(), blCat.name);
        }
        log.success(`Mapa kategorii: ${blCategoryPathMap.size} pozycji`);
      }
    }

    // Wykonaj synchronizację
    const results = {};

    if (SYNC_TYPE === 'full' || SYNC_TYPE === 'categories') {
      results.categories = await syncCategories(client, inventoryId);
    }

    if (SYNC_TYPE === 'full' || SYNC_TYPE === 'products') {
      results.products = await syncProducts(client, inventoryId);
    }

    if (SYNC_TYPE === 'full' || SYNC_TYPE === 'stock') {
      results.stock = await syncStock(client, inventoryId);
    }

    if (SYNC_TYPE === 'full' || SYNC_TYPE === 'products') {
      await reindexMeilisearch();
    }

    // Aktualizuj czas ostatniej synchronizacji
    if (!DRY_RUN) {
      await prisma.baselinkerConfig.updateMany({
        data: { lastSyncAt: new Date() },
      });
      log.success('Zaktualizowano czas ostatniej synchronizacji');
    }

    // Pokaż statystyki API
    log.info(`Wykonano ${client.requestCount} zapytań do API BaseLinker`);

    // Podsumowanie
    log.summary();

    if (DRY_RUN) {
      console.log(`${colors.yellow}${colors.bright}
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  TRYB DRY-RUN - ŻADNE ZMIANY NIE ZOSTAŁY ZAPISANE!      │
│     Uruchom bez --dry-run aby zapisać zmiany.               │
└─────────────────────────────────────────────────────────────┘
${colors.reset}`);
    }

  } catch (error) {
    log.error(`Krytyczny błąd: ${error.message}`);
    if (VERBOSE) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
