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
  // 1. Find the etui product on website
  const res = await fetch('https://wbtrade-iv71.onrender.com/api/products/search?q=etui+iphone+x&limit=5');
  const data = await res.json();
  console.log('=== WEBSITE SEARCH: "etui iphone x" ===');
  const products = data.products || data;
  if (Array.isArray(products)) {
    products.forEach(p => {
      console.log('  ID:', p.id);
      console.log('  BL ID:', p.baselinkerProductId);
      console.log('  Name:', p.name);
      console.log('  SKU:', p.sku);
      console.log('');
    });
  } else {
    console.log(JSON.stringify(data).substring(0, 500));
  }

  // 2. Try to find BL product 212547476 (from screenshot)
  console.log('\n=== BASELINKER: Product ID 212547476 ===');
  const blData = await blCall('getInventoryProductsData', { inventory_id: 11235, products: [212547476] });
  if (blData.status === 'SUCCESS' && blData.products) {
    const p = blData.products['212547476'];
    if (p) {
      console.log('  Name (text_fields.name):', p.text_fields?.name);
      console.log('  Name (text_fields.pl.name):', p.text_fields?.pl?.name);
      console.log('  SKU:', p.sku);
      console.log('  EAN:', p.ean);
    } else {
      console.log('  Not found in inventory 11235');
    }
  } else {
    console.log('  Error:', blData.error_message || blData.status);
  }

  // 3. Sample comparison - get 50 non-outlet products 
  console.log('\n=== SAMPLE COMPARISON (50 products, mode: update-only check) ===');
  const allRes = await fetch('https://wbtrade-iv71.onrender.com/api/products?limit=50&category=elektronika-i-gsm');
  const allData = await allRes.json();
  const allProducts = allData.products || allData;
  
  if (!Array.isArray(allProducts) || allProducts.length === 0) {
    // try without category filter
    const allRes2 = await fetch('https://wbtrade-iv71.onrender.com/api/products?limit=100');
    const allData2 = await allRes2.json();
    const allProducts2 = allData2.products || allData2;
    
    // Get non-outlet products
    const nonOutlet = allProducts2.filter(p => p.baselinkerProductId && !p.baselinkerProductId.startsWith('outlet-'));
    console.log('Non-outlet products found:', nonOutlet.length);
    
    if (nonOutlet.length > 0) {
      const ids = nonOutlet.slice(0, 20).map(p => Number(p.baselinkerProductId));
      const blData2 = await blCall('getInventoryProductsData', { inventory_id: 11235, products: ids });
      
      if (blData2.status === 'SUCCESS' && blData2.products) {
        let match = 0, mismatch = 0;
        nonOutlet.slice(0, 20).forEach(p => {
          const blP = blData2.products[p.baselinkerProductId];
          if (!blP) return;
          const blName = blP.text_fields?.name || blP.text_fields?.pl?.name || '';
          if (blName !== p.name) {
            mismatch++;
            console.log('[MISMATCH]');
            console.log('  BL ID:', p.baselinkerProductId);
            console.log('  WEB:', p.name);
            console.log('  BL: ', blName);
            console.log('');
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
