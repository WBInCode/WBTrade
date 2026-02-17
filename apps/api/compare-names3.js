require('dotenv').config();
const token = process.env.BASELINKER_API_TOKEN;

async function blCall(method, params = {}) {
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'token=' + token + '&method=' + method + '&parameters=' + JSON.stringify(params)
  });
  return await res.json();
}

async function main() {
  const productId = 212547476; // from Baselinker screenshot
  const inventories = [11235, 22951, 22952, 22953, 22954, 23662, 24561, 24562, 24563];
  
  // Try each inventory
  for (const inv of inventories) {
    const data = await blCall('getInventoryProductsData', { inventory_id: inv, products: [productId] });
    if (data.status === 'SUCCESS' && data.products && data.products[productId.toString()]) {
      const p = data.products[productId.toString()];
      console.log('Found in inventory:', inv);
      console.log('  name:', p.text_fields?.name);
      console.log('  pl.name:', p.text_fields?.pl?.name);
      console.log('  sku:', p.sku);
      break;
    }
  }

  // Fetch random products from our API (not search)
  console.log('\n=== Products from API ===');
  const res = await fetch('https://wbtrade-iv71.onrender.com/api/products?limit=200&sort=name');
  const data = await res.json();
  const products = data.products || data;
  console.log('Total products:', products.length);
  
  // Filter non-outlet  
  const nonOutlet = products.filter(p => p.baselinkerProductId && !p.baselinkerProductId.startsWith('outlet-'));
  console.log('Non-outlet products:', nonOutlet.length);
  
  // Get outlet products  
  const outlet = products.filter(p => p.baselinkerProductId && p.baselinkerProductId.startsWith('outlet-'));
  console.log('Outlet products:', outlet.length);
  
  // Compare non-outlet products
  if (nonOutlet.length > 0) {
    const batch = nonOutlet.slice(0, 50);
    const ids = batch.map(p => Number(p.baselinkerProductId));
    console.log('\nChecking', ids.length, 'non-outlet IDs in BL inventory 11235...');
    
    const blData = await blCall('getInventoryProductsData', { inventory_id: 11235, products: ids });
    
    if (blData.status === 'SUCCESS' && blData.products) {
      let match = 0, mismatch = 0, notFound = 0;
      batch.forEach(p => {
        const blP = blData.products[p.baselinkerProductId];
        if (!blP) { notFound++; return; }
        const blName = blP.text_fields?.name || blP.text_fields?.pl?.name || '';
        if (blName !== p.name) {
          mismatch++;
          console.log('\n[MISMATCH] BL ID:', p.baselinkerProductId);
          console.log('  WEB:', p.name);
          console.log('  BL: ', blName);
        } else {
          match++;
        }
      });
      console.log('\n--- RESULTS ---');
      console.log('Match:', match, '| Mismatch:', mismatch, '| Not in BL:', notFound);
    } else {
      console.log('BL Error:', blData.error_message);
    }
  }
}

main().catch(e => console.error(e));
