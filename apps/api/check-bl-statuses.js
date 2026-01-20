/**
 * Check available order statuses in Baselinker
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function decryptToken(ciphertext, iv, authTag) {
  const key = Buffer.from(process.env.BASELINKER_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  // Get config
  const config = await prisma.baselinkerConfig.findFirst();
  if (!config) {
    console.log('No Baselinker config found');
    return;
  }

  const token = await decryptToken(
    config.apiTokenEncrypted,
    config.encryptionIv,
    config.authTag
  );

  // Call getOrderStatusList
  const formData = new URLSearchParams();
  formData.append('method', 'getOrderStatusList');
  formData.append('parameters', '{}');

  const response = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'X-BLToken': token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const data = await response.json();
  
  if (data.status === 'SUCCESS' && data.statuses) {
    console.log('📋 Dostępne statusy zamówień w Baselinkerze:\n');
    data.statuses.forEach(s => {
      console.log(`   ID: ${s.id} | Nazwa: "${s.name}" | Kolor: ${s.color}`);
    });
    console.log('\n💡 Użyj jednego z tych ID jako order_status_id');
  } else {
    console.log('Error:', data);
  }
}

main().finally(() => prisma.$disconnect());
