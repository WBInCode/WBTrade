/**
 * Debug: Check what Baselinker returns for a product
 * 
 * Użycie:
 *   node debug-bl-product.js [--product-id=456] [--full]
 * 
 * Pobiera konfigurację z bazy danych (BaselinkerConfig)
 * lub używa --token=XXX --inventory=123
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

const PRODUCT_ID = args['product-id'];

// Decrypt token from database
function decryptToken(encrypted, iv, authTag) {
  const key = process.env.BASELINKER_ENCRYPTION_KEY;
  if (!key) throw new Error('Brak BASELINKER_ENCRYPTION_KEY w .env');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getConfig() {
  // CLI args first
  if (args.token && args.inventory) {
    return { apiToken: args.token, inventoryId: args.inventory };
  }
  
  // Try database
  const config = await prisma.baselinkerConfig.findFirst();
  if (!config) {
    throw new Error('Brak konfiguracji BaseLinker w bazie. Skonfiguruj w panelu admina.');
  }
  
  const apiToken = decryptToken(
    config.apiTokenEncrypted,
    config.encryptionIv,
    config.authTag
  );
  
  return { apiToken, inventoryId: config.inventoryId };
}

let API_TOKEN, INVENTORY_ID;

async function request(method, params) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(params));
  
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': API_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return response.json();
}

async function main() {
  // Get config from database or CLI
  const config = await getConfig();
  API_TOKEN = config.apiToken;
  INVENTORY_ID = config.inventoryId;

  console.log('🔍 Debug BaseLinker API\n');
  console.log(`Token: ${API_TOKEN.slice(0, 8)}...${API_TOKEN.slice(-4)}`);
  console.log(`Inventory ID: ${INVENTORY_ID}\n`);

  // 0. Pobierz grupy cenowe
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💰 getInventoryPriceGroups');
  console.log('═══════════════════════════════════════════════════════════\n');

  const priceGroupsResponse = await request('getInventoryPriceGroups', {
    inventory_id: parseInt(INVENTORY_ID)
  });

  if (priceGroupsResponse.status === 'ERROR') {
    console.log('⚠️ Nie można pobrać grup cenowych:', priceGroupsResponse.error_message);
  } else {
    const priceGroups = priceGroupsResponse.price_groups || {};
    console.log('Grupy cenowe w magazynie:\n');
    for (const [id, group] of Object.entries(priceGroups)) {
      console.log(`  ID: ${id} => "${group.name}" (${group.currency})`);
    }
    console.log('');
  }

  // 1. Pobierz listę produktów
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 getInventoryProductsList (strona 1)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const listResponse = await request('getInventoryProductsList', {
    inventory_id: parseInt(INVENTORY_ID),
    page: 1
  });

  if (listResponse.status === 'ERROR') {
    console.error('❌ Błąd API:', listResponse.error_message);
    process.exit(1);
  }

  const productsList = listResponse.products || {};
  const productIds = Object.keys(productsList);
  
  console.log(`Znaleziono ${productIds.length} produktów\n`);

  // Weź pierwszy produkt lub podany
  const targetId = PRODUCT_ID || productIds[0];
  
  if (!targetId) {
    console.log('Brak produktów w magazynie!');
    return;
  }

  console.log('Przykład z listy (ID:', targetId, '):');
  console.log(JSON.stringify(productsList[targetId], null, 2));

  // 2. Pobierz szczegóły produktu
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📦 getInventoryProductsData');
  console.log('═══════════════════════════════════════════════════════════\n');

  const detailResponse = await request('getInventoryProductsData', {
    inventory_id: parseInt(INVENTORY_ID),
    products: [parseInt(targetId)]
  });

  if (detailResponse.status === 'ERROR') {
    console.error('❌ Błąd API:', detailResponse.error_message);
    process.exit(1);
  }

  const product = detailResponse.products?.[targetId];
  
  if (!product) {
    console.log('Brak danych produktu!');
    console.log('Odpowiedź:', JSON.stringify(detailResponse, null, 2));
    return;
  }

  // Kluczowe pola
  console.log('🔑 KLUCZOWE POLA:\n');
  console.log(`  id: ${targetId}`);
  console.log(`  ean: "${product.ean || '(brak)'}" [typ: ${typeof product.ean}]`);
  console.log(`  sku: "${product.sku || '(brak)'}"`);
  console.log(`  name: "${product.name || '(brak)'}"`);
  console.log(`  quantity: ${product.quantity}`);
  console.log(`  category_id: ${product.category_id}`);
  
  console.log('\n💰 POLA CENOWE:\n');
  console.log(`  price_brutto: ${product.price_brutto} [typ: ${typeof product.price_brutto}]`);
  console.log(`  price_netto: ${product.price_netto} [typ: ${typeof product.price_netto}]`);
  console.log(`  tax_rate: ${product.tax_rate}`);
  console.log(`  price_wholesale_netto: ${product.price_wholesale_netto}`);
  
  // Sprawdź prices (grupy cenowe)
  if (product.prices) {
    console.log('\n  📊 prices (grupy cenowe):');
    console.log('  ' + JSON.stringify(product.prices, null, 4).split('\n').join('\n  '));
  }

  // text_fields
  if (product.text_fields) {
    console.log('\n📝 TEXT_FIELDS:');
    const tf = product.text_fields;
    // Sprawdź bezpośrednie pola
    if (tf.name) console.log(`  name: "${tf.name}"`);
    if (tf.description) console.log(`  description: "${tf.description?.slice(0, 100)}..."`);
    // Sprawdź języki
    for (const lang of Object.keys(tf)) {
      if (typeof tf[lang] === 'object' && tf[lang]?.name) {
        console.log(`  [${lang}] name: "${tf[lang].name}"`);
      }
    }
  }

  // Warianty
  if (product.variants && product.variants.length > 0) {
    console.log(`\n🎨 WARIANTY (${product.variants.length}):\n`);
    for (const v of product.variants.slice(0, 3)) {
      console.log(`  Wariant ID: ${v.variant_id}`);
      console.log(`    name: "${v.name}"`);
      console.log(`    ean: "${v.ean || '(brak)'}"`);
      console.log(`    sku: "${v.sku || '(brak)'}"`);
      console.log(`    price_brutto: ${v.price_brutto}`);
      console.log(`    quantity: ${v.quantity}`);
      console.log('');
    }
  }

  // Wszystkie klucze
  console.log('\n📋 WSZYSTKIE KLUCZE W ODPOWIEDZI:');
  console.log('  ' + Object.keys(product).join(', '));

  // Pełna odpowiedź (opcjonalnie)
  if (args.full) {
    console.log('\n📄 PEŁNA ODPOWIEDŹ:');
    console.log(JSON.stringify(product, null, 2));
  }
}

main().catch(err => {
  console.error('❌ Błąd:', err.message);
  process.exit(1);
});
