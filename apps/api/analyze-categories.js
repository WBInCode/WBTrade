/**
 * Skrypt do analizy niezmapowanych kategorii
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const https = require('https');
const { CategoryMapper } = require('./src/services/category-mapper.service');

const prisma = new PrismaClient();
const mapper = new CategoryMapper();

async function main() {
  // Pobierz config
  const config = await prisma.baselinkerConfig.findFirst();
  const keyBuffer = Buffer.from(process.env.BASELINKER_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(config.encryptionIv, 'hex'));
  decipher.setAuthTag(Buffer.from(config.authTag, 'hex'));
  const token = decipher.update(config.apiTokenEncrypted, 'hex', 'utf8') + decipher.final('utf8');

  // Pobierz kategorie
  const cats = await new Promise((resolve) => {
    const postData = 'method=getInventoryCategories&parameters=' + JSON.stringify({inventory_id: parseInt(config.inventoryId)});
    const req = https.request({hostname:'api.baselinker.com',path:'/connector.php',method:'POST',
      headers:{'X-BLToken':token,'Content-Type':'application/x-www-form-urlencoded'}
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data).categories || []));
    });
    req.write(postData);
    req.end();
  });

  // Znajdź kategorie mapowane na 'Inne'
  const unmapped = [];
  for (const cat of cats) {
    const result = mapper.mapCategory(cat.name);
    if (result.mainCategory === 'Inne') {
      unmapped.push(cat.name);
    }
  }

  console.log('Kategorie BL mapowane na "Inne":\n');
  
  // Grupuj po pierwszym segmencie
  const groups = {};
  for (const path of unmapped) {
    const first = path.split('/')[0];
    groups[first] = (groups[first] || 0) + 1;
  }
  
  console.log('Grupy glowne:');
  Object.entries(groups).sort((a,b) => b[1]-a[1]).slice(0, 20).forEach(([g, c]) => {
    console.log(c.toString().padStart(4), '-', g);
  });
  
  console.log('\nPrzykladowe pelne sciezki:');
  unmapped.slice(0, 40).forEach(p => console.log(' -', p));
  
  process.exit(0);
}
main();
