/**
 * Sync names for products that have fallback names like "Product 123456"
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_ioaBnk75ybAm@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

function decryptToken(encryptedToken, iv, authTag) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.BASELINKER_ENCRYPTION_KEY || '', 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function request(apiToken, method, params) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(params));
  
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return response.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get product name from Baselinker text_fields
 */
function getProductName(blProduct) {
  if (blProduct.text_fields) {
    // Direct name field (most common)
    if (blProduct.text_fields.name) {
      return blProduct.text_fields.name;
    }
    // Try Polish
    if (blProduct.text_fields['pl']?.name) {
      return blProduct.text_fields['pl'].name;
    }
    // Try any language
    for (const langCode of Object.keys(blProduct.text_fields)) {
      const textField = blProduct.text_fields[langCode];
      if (typeof textField === 'object' && textField?.name) {
        return textField.name;
      }
    }
  }
  if (blProduct.name) {
    return blProduct.name;
  }
  return null;
}

/**
 * Get product description from Baselinker text_fields
 */
function getProductDescription(blProduct) {
  if (blProduct.text_fields) {
    // Direct description field
    if (blProduct.text_fields.description) {
      return blProduct.text_fields.description;
    }
    // Try Polish
    if (blProduct.text_fields['pl']?.description) {
      return blProduct.text_fields['pl'].description;
    }
    // Try any language
    for (const langCode of Object.keys(blProduct.text_fields)) {
      const textField = blProduct.text_fields[langCode];
      if (typeof textField === 'object' && textField?.description) {
        return textField.description;
      }
    }
  }
  return '';
}

/**
 * Generate slug from name
 */
function slugify(text) {
  const polishCharsMap = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
    'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
    'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  
  let result = text.toString();
  for (const [polish, ascii] of Object.entries(polishCharsMap)) {
    result = result.replace(new RegExp(polish, 'g'), ascii);
  }
  
  return result
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function main() {
  console.log('=== Sync nazw produktów z Baselinker ===\n');
  
  const config = await prisma.baselinkerConfig.findFirst();
  if (!config) {
    console.error('Brak konfiguracji Baselinker!');
    return;
  }
  
  const apiToken = decryptToken(config.apiTokenEncrypted, config.encryptionIv, config.authTag);
  const inventoryId = parseInt(config.inventoryId);
  
  // Znajdź produkty z fallback nazwami (zaczynającymi się od "Product ")
  const productsWithFallbackNames = await prisma.product.findMany({
    where: {
      baselinkerProductId: { not: null },
      name: { startsWith: 'Product ' }
    },
    select: { id: true, baselinkerProductId: true, name: true, slug: true }
  });
  
  console.log(`Produktów z fallback nazwami: ${productsWithFallbackNames.length}\n`);
  
  if (productsWithFallbackNames.length === 0) {
    console.log('Wszystkie produkty mają prawidłowe nazwy!');
    return;
  }
  
  // Przetwarzaj w batchach po 100
  const BATCH_SIZE = 100;
  let processed = 0;
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < productsWithFallbackNames.length; i += BATCH_SIZE) {
    const batch = productsWithFallbackNames.slice(i, i + BATCH_SIZE);
    const productIds = batch.map(p => parseInt(p.baselinkerProductId));
    
    console.log(`\nPrzetwarzam batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(productsWithFallbackNames.length/BATCH_SIZE)} (${productIds.length} produktów)...`);
    
    // Pobierz szczegóły produktów z Baselinker
    const response = await request(apiToken, 'getInventoryProductsData', {
      inventory_id: inventoryId,
      products: productIds
    });
    
    if (response.status === 'ERROR') {
      console.error(`Błąd API: ${response.error_message}`);
      
      // Jeśli rate limit, poczekaj
      if (response.error_message?.includes('blocked') || response.error_message?.includes('limit')) {
        console.log('Rate limit - czekam 60 sekund...');
        await sleep(60000);
        i -= BATCH_SIZE; // Powtórz batch
        continue;
      }
      continue;
    }
    
    const blProducts = response.products || {};
    
    for (const product of batch) {
      const blProduct = blProducts[product.baselinkerProductId];
      
      if (!blProduct) {
        console.log(`  ⚠ Produkt ${product.baselinkerProductId} nie znaleziony w Baselinker`);
        failed++;
        continue;
      }
      
      const newName = getProductName(blProduct);
      const newDescription = getProductDescription(blProduct);
      
      if (!newName) {
        console.log(`  ⚠ Brak nazwy dla produktu ${product.baselinkerProductId}`);
        failed++;
        continue;
      }
      
      // Generuj nowy slug
      const baseSlug = slugify(newName) || `product-${product.baselinkerProductId}`;
      let newSlug = baseSlug;
      let counter = 1;
      
      // Sprawdź czy slug jest unikalny
      while (true) {
        const existing = await prisma.product.findFirst({
          where: { 
            slug: newSlug,
            id: { not: product.id }
          }
        });
        
        if (!existing) break;
        newSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            name: newName,
            slug: newSlug,
            description: newDescription || undefined
          }
        });
        
        console.log(`  ✓ ${product.name} -> ${newName.substring(0, 50)}...`);
        updated++;
      } catch (err) {
        console.log(`  ✗ Błąd aktualizacji ${product.baselinkerProductId}: ${err.message}`);
        failed++;
      }
      
      processed++;
    }
    
    // Pauza między batchami
    if (i + BATCH_SIZE < productsWithFallbackNames.length) {
      console.log('Czekam 3 sekundy...');
      await sleep(3000);
    }
  }
  
  console.log('\n=== PODSUMOWANIE ===');
  console.log(`Przetworzono: ${processed}`);
  console.log(`Zaktualizowano: ${updated}`);
  console.log(`Błędów: ${failed}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
