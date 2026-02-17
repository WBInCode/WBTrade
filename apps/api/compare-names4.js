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
  // Get products from multiple pages to find non-outlet ones
  let nonOutlet = [];
  for (let page = 1; page <= 20 && nonOutlet.length < 50; page++) {
    const res = await fetch(`https://wbtrade-iv71.onrender.com/api/products?limit=100&page=${page}`);
    const data = await res.json();
    const prods = data.products;
    for (const p of prods) {
      if (p.baselinkerProductId && !p.baselinkerProductId.startsWith('outlet-')) {
        nonOutlet.push(p);
      }
    }
  }
  
  console.log('Found', nonOutlet.length, 'non-outlet products');
  if (nonOutlet.length === 0) {
    console.log('All products are outlet. Comparing outlet products instead...');
    // For outlet, strip "outlet-" prefix and try
    const res = await fetch('https://wbtrade-iv71.onrender.com/api/products?limit=100&page=1');
    const data = await res.json();
    nonOutlet = data.products.map(p => ({
      ...p,
      realBlId: p.baselinkerProductId.replace('outlet-', '')
    }));
  }

  // Compare with Baselinker - try inventory 11235 (Główny) first
  const batch = nonOutlet.slice(0, 50);
  const ids = batch.map(p => Number(p.realBlId || p.baselinkerProductId));
  
  // Try all inventories
  const inventoryNames = {11235: 'Główny', 22951: 'ikonka', 22952: 'Leker', 22953: 'BTP', 22954: 'HP'};
  
  for (const [invId, invName] of Object.entries(inventoryNames)) {
    const blData = await blCall('getInventoryProductsData', { inventory_id: Number(invId), products: ids.slice(0, 10) });
    if (blData.status === 'SUCCESS' && blData.products) {
      const found = Object.keys(blData.products).length;
      if (found > 0) {
        console.log(`\n=== Inventory ${invId} (${invName}): ${found} products found ===`);
        
        let match = 0, mismatch = 0;
        batch.slice(0, 10).forEach(p => {
          const blId = (p.realBlId || p.baselinkerProductId).toString();
          const blP = blData.products[blId];
          if (!blP) return;
          const blName = blP.text_fields?.name || blP.text_fields?.pl?.name || '';
          if (blName !== p.name) {
            mismatch++;
            console.log('[MISMATCH]');
            console.log('  BL ID:', blId);
            console.log('  WEB:', p.name);
            console.log('  BL: ', blName);
          } else {
            match++;
          }
        });
        console.log('Match:', match, '| Mismatch:', mismatch);
      }
    }
  }
}

main().catch(e => console.error(e));
