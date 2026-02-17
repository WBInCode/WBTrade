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
  // 1. Get non-outlet products from API
  let allProds = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://wbtrade-iv71.onrender.com/api/products?limit=100&page=${page}`);
    const data = await res.json();
    allProds = allProds.concat(data.products);
  }
  
  const nonOutlet = allProds.filter(p => p.baselinkerProductId && !p.baselinkerProductId.startsWith('outlet-'));
  const outlet = allProds.filter(p => p.baselinkerProductId && p.baselinkerProductId.startsWith('outlet-'));
  console.log('Total fetched:', allProds.length);
  console.log('Non-outlet:', nonOutlet.length);
  console.log('Outlet:', outlet.length);
  
  // 2. Check non-outlet in all inventories
  if (nonOutlet.length > 0) {
    const sampleIds = nonOutlet.slice(0, 20).map(p => Number(p.baselinkerProductId));
    console.log('\nNon-outlet sample IDs:', sampleIds.slice(0, 5));
    
    for (const invId of [11235, 22951, 22952, 22953, 22954]) {
      const data = await blCall('getInventoryProductsData', { inventory_id: invId, products: sampleIds });
      if (data.status === 'SUCCESS') {
        const found = Object.keys(data.products || {}).length;
        if (found > 0) {
          console.log('\nInventory', invId, '- found', found, 'products');
          for (const [blId, blP] of Object.entries(data.products)) {
            const webP = nonOutlet.find(p => p.baselinkerProductId === blId);
            const blName = blP.text_fields?.name || '';
            if (webP && blName !== webP.name) {
              console.log('  [MISMATCH] ID:', blId);
              console.log('    WEB:', webP.name);
              console.log('    BL: ', blName);
            } else if (webP) {
              console.log('  [MATCH] ID:', blId, '-', webP.name.substring(0, 50));
            }
          }
        }
      }
    }
  }
  
  // 3. Check outlet products (strip outlet- prefix)
  if (outlet.length > 0) {
    const sampleIds = outlet.slice(0, 20).map(p => Number(p.baselinkerProductId.replace('outlet-', '')));
    console.log('\nOutlet sample IDs (stripped):', sampleIds.slice(0, 5));
    
    for (const invId of [11235, 22951, 22952, 22953, 22954]) {
      const data = await blCall('getInventoryProductsData', { inventory_id: invId, products: sampleIds });
      if (data.status === 'SUCCESS') {
        const found = Object.keys(data.products || {}).length;
        if (found > 0) {
          console.log('\nInventory', invId, '- found', found, 'outlet products');
          let matchC = 0, mismatchC = 0;
          for (const [blId, blP] of Object.entries(data.products)) {
            const webP = outlet.find(p => p.baselinkerProductId === 'outlet-' + blId);
            const blName = blP.text_fields?.name || '';
            if (webP && blName !== webP.name) {
              mismatchC++;
              if (mismatchC <= 5) {
                console.log('  [MISMATCH] ID:', blId);
                console.log('    WEB:', webP.name);
                console.log('    BL: ', blName);
              }
            } else if (webP) {
              matchC++;
            }
          }
          console.log('  Match:', matchC, '| Mismatch:', mismatchC);
        }
      }
    }
  }
}

main().catch(e => console.error(e));
