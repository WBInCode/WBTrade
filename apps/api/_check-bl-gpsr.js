const https = require('https');
const BL_TOKEN = '***TOKEN_REMOVED***';

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
  // Check a few products from each inventory for GPSR-related params/features
  const inventories = [22952, 22953, 22954, 26591];
  
  for (const invId of inventories) {
    console.log(`\n=== Inventory ${invId} ===`);
    
    // Get first page of products
    const listResp = await blRequest('getInventoryProductsList', {
      inventory_id: invId, page: 1,
    });
    const ids = Object.keys(listResp.products || {}).slice(0, 3).map(Number);
    
    const dataResp = await blRequest('getInventoryProductsData', {
      inventory_id: invId, products: ids,
    });
    
    for (const [id, prod] of Object.entries(dataResp.products || {})) {
      console.log(`\nProduct ${id}: ${prod.text_fields?.name || 'no name'}`);
      console.log('  manufacturer_id:', prod.manufacturer_id);
      
      // Check features
      if (prod.features && Object.keys(prod.features).length) {
        console.log('  Features:');
        for (const [fKey, fVal] of Object.entries(prod.features)) {
          console.log(`    ${fKey}: ${JSON.stringify(fVal)}`);
        }
      } else {
        console.log('  Features: (empty)');
      }
      
      // Check text_fields for anything GPSR-related
      if (prod.text_fields) {
        const gpsrFields = Object.entries(prod.text_fields).filter(([k]) => 
          k.toLowerCase().includes('gpsr') || k.toLowerCase().includes('producer') || 
          k.toLowerCase().includes('producent') || k.toLowerCase().includes('safety')
        );
        if (gpsrFields.length) {
          console.log('  GPSR text_fields:');
          for (const [k, v] of gpsrFields) {
            console.log(`    ${k}: ${JSON.stringify(v).substring(0, 200)}`);
          }
        }
      }
    }
  }
  
  // Also check what product features/params categories exist
  console.log('\n\n=== Checking inventory categories/features structure ===');
  for (const invId of inventories) {
    const catResp = await blRequest('getInventoryCategories', { inventory_id: invId });
    // Just show count
    console.log(`Inv ${invId}: ${(catResp.categories || []).length} categories`);
  }
  
  // Check extra fields
  console.log('\n=== Extra fields ===');
  const efResp = await blRequest('getInventoryExtraFields');
  if (efResp.extra_fields) {
    for (const ef of efResp.extra_fields) {
      console.log(`  ${ef.extra_field_id}: ${ef.name}`);  
    }
  }
}

main().catch(console.error);
