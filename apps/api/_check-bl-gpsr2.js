const https = require('https');
const BL_TOKEN = '6008329-6007581-56SHHQZAYPWGZ0BV7MARZ5VOT77X87CDJYQM5DRQERXWPJ31O6QR3344TR63AJAP';

function blRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      token: BL_TOKEN, method, parameters: JSON.stringify(params),
    }).toString();
    const req = https.request({
      hostname: 'api.baselinker.com', path: '/connector.php', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // Check the GPSR extra field (11161) and safety info (6628) on products
  const inventories = [22952, 22953, 22954, 26591];
  
  for (const invId of inventories) {
    console.log(`\n=== Inventory ${invId} ===`);
    
    const listResp = await blRequest('getInventoryProductsList', {
      inventory_id: invId, page: 1,
    });
    // Get 10 products
    const ids = Object.keys(listResp.products || {}).slice(0, 10).map(Number);
    
    const dataResp = await blRequest('getInventoryProductsData', {
      inventory_id: invId, products: ids,
    });
    
    let foundGpsr = 0;
    for (const [id, prod] of Object.entries(dataResp.products || {})) {
      // Check all text_fields keys
      const tf = prod.text_fields || {};
      const gpsrField = tf['extra_field_11161'];
      const safetyField = tf['extra_field_6628'];
      
      if (gpsrField || safetyField) {
        foundGpsr++;
        console.log(`\nProduct ${id}: ${tf.name || 'no name'}`);
        if (gpsrField) console.log(`  GPSR (11161): ${JSON.stringify(gpsrField).substring(0, 500)}`);
        if (safetyField) console.log(`  Safety (6628): ${JSON.stringify(safetyField).substring(0, 500)}`);
      }
    }
    if (!foundGpsr) {
      // Show all text_field keys from first product to understand structure
      const firstProd = Object.values(dataResp.products || {})[0];
      if (firstProd) {
        console.log('Text field keys:', Object.keys(firstProd.text_fields || {}));
        // Show all extra_field_ entries
        for (const [k, v] of Object.entries(firstProd.text_fields || {})) {
          if (k.startsWith('extra_field_')) {
            console.log(`  ${k}: ${JSON.stringify(v).substring(0, 300)}`);
          }
        }
      }
    }
  }
  
  // Also check if there's product-level GPSR on BL via a different method
  // Try getInventoryProductsData with more fields
  console.log('\n\n=== Full product structure sample ===');
  const dataResp = await blRequest('getInventoryProductsData', {
    inventory_id: 22953, products: [212547476],
  });
  const prod = Object.values(dataResp.products || {})[0];
  if (prod) {
    // Show all top-level keys
    console.log('Top-level keys:', Object.keys(prod));
    // Show all text_fields
    console.log('text_fields keys:', Object.keys(prod.text_fields || {}));
    for (const [k, v] of Object.entries(prod.text_fields || {})) {
      const val = typeof v === 'string' ? v.substring(0, 200) : JSON.stringify(v).substring(0, 200);
      console.log(`  ${k}: ${val}`);
    }
  }
}

main().catch(console.error);
