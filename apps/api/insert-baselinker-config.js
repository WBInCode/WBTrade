/**
 * Script to insert Baselinker config into database
 * Encrypts the API token and inserts config for the main inventory
 * syncStock() automatically iterates over all inventories (LEKER, HP, BTP)
 * so we only need ONE config record with a valid token.
 */

const crypto = require('crypto');
const https = require('https');
const { Client } = require('pg');

require('dotenv').config();

const API_TOKEN = process.env.BASELINKER_API_TOKEN;
const ENCRYPTION_KEY = process.env.BASELINKER_ENCRYPTION_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Known inventory IDs: LEKER=22952, BTP=22953, HP=22954
// syncStock() fetches all inventories dynamically, so we use LEKER as primary
const PRIMARY_INVENTORY_ID = '22952';

if (!API_TOKEN) {
  console.error('❌ BASELINKER_API_TOKEN is not set in .env');
  process.exit(1);
}
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.error('❌ BASELINKER_ENCRYPTION_KEY must be a 64-char hex string');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

// AES-256-GCM encryption (same as src/lib/encryption.ts)
function encryptToken(plaintext) {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

// Call Baselinker API to verify token
function callBaselinker(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      method,
      parameters: JSON.stringify(params),
    }).toString();

    const options = {
      hostname: 'api.baselinker.com',
      path: '/connector.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-BLToken': API_TOKEN,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'ERROR') {
            reject(new Error(`Baselinker API error: ${parsed.error_code} - ${parsed.error_message}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  // 1. Verify token by fetching inventories
  console.log('🔄 Verifying Baselinker API token...');
  const response = await callBaselinker('getInventories');
  const inventories = response.inventories || [];

  console.log(`\n📦 Found ${inventories.length} inventories:`);
  inventories.forEach((inv) => {
    console.log(`  • ID: ${inv.inventory_id} — "${inv.name}"`);
  });

  // Confirm target warehouses exist
  const targetIds = ['22952', '22953', '22954'];
  const targetNames = { '22952': 'LEKER', '22953': 'BTP', '22954': 'HP' };
  for (const tid of targetIds) {
    const found = inventories.find(i => i.inventory_id.toString() === tid);
    if (found) {
      console.log(`  ✅ ${targetNames[tid]} (${tid}) — found`);
    } else {
      console.log(`  ⚠️  ${targetNames[tid]} (${tid}) — NOT found in API response`);
    }
  }

  // 2. Encrypt token
  console.log('\n🔐 Encrypting API token...');
  const encrypted = encryptToken(API_TOKEN);

  // 3. Insert into database
  console.log('💾 Inserting config into baselinker_configs...');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Clear old configs
    const deleted = await client.query('DELETE FROM baselinker_configs');
    if (deleted.rowCount > 0) {
      console.log(`  ⚠️  Removed ${deleted.rowCount} old config(s)`);
    }

    // Insert single config with primary inventory ID
    const id = crypto.randomBytes(12).toString('hex');
    await client.query(
      `INSERT INTO baselinker_configs 
       (id, inventory_id, api_token_encrypted, encryption_iv, auth_tag, sync_enabled, sync_interval_minutes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, 60, NOW(), NOW())`,
      [id, PRIMARY_INVENTORY_ID, encrypted.ciphertext, encrypted.iv, encrypted.authTag]
    );

    // Verify
    const verify = await client.query(
      'SELECT id, inventory_id, sync_enabled, sync_interval_minutes, last_sync_at FROM baselinker_configs'
    );
    console.log('\n✅ Config saved successfully!');
    console.log('   Record:', verify.rows[0]);
    console.log('\n📝 Note: syncStock() automatically iterates over ALL inventories (LEKER, HP, BTP)');
    console.log('   so one config record with a valid API token is sufficient.');

  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
