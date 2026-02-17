require('dotenv').config();
const token = process.env.BASELINKER_API_TOKEN;

async function getProducts(inventoryId, ids) {
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'token=' + token + '&method=getInventoryProductsData&parameters=' + JSON.stringify({inventory_id: inventoryId, products: ids})
  });
  return await res.json();
}

async function main() {
  // Fetch products from website API
  const res = await fetch('https://wbtrade-iv71.onrender.com/api/products?limit=50');
  const data = await res.json();
  const products = data.products || data;

  if (!Array.isArray(products)) {
    console.log('Unexpected API response:', JSON.stringify(data).substring(0, 500));
    return;
  }

  console.log('Fetched', products.length, 'products from website API\n');

  // Extract baselinker IDs
  const blIds = products.map(p => {
    const id = p.baselinkerProductId || '';
    return id.replace('outlet-', '');
  }).filter(Boolean).map(Number);

  console.log('BL IDs to check:', blIds.length, '\n');

  // Fetch from Baselinker (inventory 11235 = Główny)
  const blData = await getProducts(11235, blIds);
  if (blData.status === 'ERROR') {
    console.log('Baselinker Error:', blData.error_message);
    return;
  }

  let matchCount = 0, mismatchCount = 0, notFound = 0;
  products.forEach(p => {
    const rawId = (p.baselinkerProductId || '').replace('outlet-', '');
    const blProduct = blData.products && blData.products[rawId];
    if (!blProduct) { 
      notFound++; 
      console.log('[NOT FOUND IN BL] ID: ' + rawId + ' | WEB: ' + p.name);
      return; 
    }
    const blName = blProduct.text_fields && blProduct.text_fields.name ? blProduct.text_fields.name : 'NO NAME';
    if (blName === p.name) { 
      matchCount++; 
    } else {
      mismatchCount++;
      console.log('[MISMATCH] BL ID: ' + rawId);
      console.log('  WEB: ' + p.name);
      console.log('  BL:  ' + blName);
      console.log('');
    }
  });

  console.log('\n--- SUMMARY ---');
  console.log('Match: ' + matchCount + ' | Mismatch: ' + mismatchCount + ' | Not found in BL: ' + notFound);
  console.log('Total: ' + products.length);
}

main().catch(e => console.error(e));
