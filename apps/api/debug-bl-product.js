/**
 * Debug: Check what Baselinker returns for a product
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

async function main() {
  const config = await prisma.baselinkerConfig.findFirst();
  if (!config) {
    console.error('Brak konfiguracji Baselinker!');
    return;
  }
  
  const apiToken = decryptToken(config.apiTokenEncrypted, config.encryptionIv, config.authTag);
  const inventoryId = parseInt(config.inventoryId);
  
  // Weź jeden produkt z fallback nazwą
  const product = await prisma.product.findFirst({
    where: {
      baselinkerProductId: { not: null },
      name: { startsWith: 'Product ' }
    }
  });
  
  if (!product) {
    console.log('Brak produktów do sprawdzenia');
    return;
  }
  
  console.log('Produkt w bazie:', product.name, 'ID:', product.baselinkerProductId);
  
  const response = await request(apiToken, 'getInventoryProductsData', {
    inventory_id: inventoryId,
    products: [parseInt(product.baselinkerProductId)]
  });
  
  console.log('\nOdpowiedź z Baselinker:');
  console.log(JSON.stringify(response, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
