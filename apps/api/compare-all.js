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

function stripPrefix(blId) {
  return blId.replace(/^(outlet-|hp-|btp-|leker-|ikonka-)/, '');
}

function guessInventory(blId) {
  if (blId.startsWith('hp-')) return 22954;      // HP
  if (blId.startsWith('btp-')) return 22953;     // BTP
  if (blId.startsWith('leker-')) return 22952;   // Leker
  if (blId.startsWith('ikonka-')) return 22951;  // ikonka
  if (blId.startsWith('outlet-')) return 11235;  // Główny (guess)
  return 11235; // default
}

async function main() {
  // Fetch products from API (multiple pages)
  let allProds = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://wbtrade-iv71.onrender.com/api/products?limit=100&page=${page}`);
    const data = await res.json();
    if (!data.products || data.products.length === 0) break;
    allProds = allProds.concat(data.products);
  }
  console.log('Total fetched from web:', allProds.length);
  
  // Group by prefix
  const prefixGroups = {};
  for (const p of allProds) {
    if (!p.baselinkerProductId) continue;
    const match = p.baselinkerProductId.match(/^([a-z]+-)/);
    const prefix = match ? match[1] : 'none-';
    if (!prefixGroups[prefix]) prefixGroups[prefix] = [];
    prefixGroups[prefix].push(p);
  }
  
  console.log('\nProduct groups by prefix:');
  for (const [prefix, prods] of Object.entries(prefixGroups)) {
    console.log(`  ${prefix}: ${prods.length} products`);
  }

  // Compare each group with correct inventory
  let totalMatch = 0, totalMismatch = 0, totalNotFound = 0;
  const mismatches = [];
  
  for (const [prefix, prods] of Object.entries(prefixGroups)) {
    const sample = prods.slice(0, 30);
    const numericIds = sample.map(p => Number(stripPrefix(p.baselinkerProductId)));
    const invId = guessInventory(sample[0].baselinkerProductId);
    
    // Try main inventory first
    let data = await blCall('getInventoryProductsData', { inventory_id: invId, products: numericIds });
    
    // If not found, try all inventories
    if (data.status !== 'SUCCESS' || !data.products || Object.keys(data.products).length === 0) {
      for (const tryInv of [11235, 22951, 22952, 22953, 22954]) {
        if (tryInv === invId) continue;
        data = await blCall('getInventoryProductsData', { inventory_id: tryInv, products: numericIds });
        if (data.status === 'SUCCESS' && data.products && Object.keys(data.products).length > 0) {
          console.log(`\n[${prefix}] Found in inventory ${tryInv} instead of ${invId}`);
          break;
        }
      }
    }
    
    if (data.status !== 'SUCCESS' || !data.products) {
      console.log(`\n[${prefix}] Could not find products in any inventory`);
      continue;
    }
    
    const found = Object.keys(data.products).length;
    let match = 0, mismatch = 0, notFound = sample.length - found;
    
    for (const p of sample) {
      const numId = stripPrefix(p.baselinkerProductId);
      const blP = data.products[numId];
      if (!blP) continue;
      
      const blName = blP.text_fields?.name || blP.text_fields?.pl?.name || '';
      if (blName !== p.name) {
        mismatch++;
        mismatches.push({ blId: p.baselinkerProductId, web: p.name, bl: blName });
      } else {
        match++;
      }
    }
    
    console.log(`\n[${prefix}] Checked ${sample.length} | Found: ${found} | Match: ${match} | Mismatch: ${mismatch} | Not in BL: ${notFound}`);
    totalMatch += match;
    totalMismatch += mismatch;
    totalNotFound += notFound;
  }
  
  console.log('\n========== TOTAL ==========');
  console.log('Match:', totalMatch, '| Mismatch:', totalMismatch, '| Not found:', totalNotFound);
  
  if (mismatches.length > 0) {
    console.log('\n========== MISMATCHES (first 20) ==========');
    mismatches.slice(0, 20).forEach(m => {
      console.log(`\n[${m.blId}]`);
      console.log('  WEB:', m.web);
      console.log('  BL: ', m.bl);
    });
  }
}

main().catch(e => console.error(e));
