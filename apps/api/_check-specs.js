// Check what Baselinker actually returns for products
const https = require('https');

const BL_TOKEN = '***TOKEN_REMOVED***';

function blRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({ token: BL_TOKEN, method, parameters: JSON.stringify(params) }).toString();
    const req = https.request({
      hostname: 'api.baselinker.com',
      path: '/connector.php',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // Get manufacturers list from Baselinker
  console.log('Fetching manufacturers from Baselinker...');
  const mfr = await blRequest('getInventoryManufacturers');
  
  if (mfr.manufacturers) {
    console.log(`\nFound ${mfr.manufacturers.length} manufacturers:`);
    mfr.manufacturers.forEach(m => {
      console.log(`  ${m.manufacturer_id}: "${m.name}"`);
    });
  } else {
    console.log('Response:', JSON.stringify(mfr, null, 2));
