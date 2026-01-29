/**
 * Debug: Check tags for specific product from Baselinker
 */

const BASELINKER_API_TOKEN = process.env.BASELINKER_API_TOKEN;
const PRODUCT_SKU = '31200'; // WOOPIE BABY Klocki

async function baselinkerRequest(method, parameters = {}) {
  const response = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-BLToken': BASELINKER_API_TOKEN
    },
    body: new URLSearchParams({
      method,
      parameters: JSON.stringify(parameters)
    })
  });
  
  const data = await response.json();
  if (data.status === 'ERROR') {
    throw new Error(`Baselinker error: ${data.error_message}`);
  }
  return data;
}

async function main() {
  console.log(`🔍 Getting all inventories...\n`);
  
  // First get all inventories
  const inventoriesResponse = await baselinkerRequest('getInventories', {});
  console.log('Inventories:', JSON.stringify(inventoriesResponse, null, 2));
  
  // Then check product 212543396 in each inventory
  const productId = 212543396;
  
  for (const inv of inventoriesResponse.inventories || []) {
    console.log(`\nChecking inventory ${inv.inventory_id} (${inv.name})...`);
    
    try {
      const dataResponse = await baselinkerRequest('getInventoryProductsData', {
        inventory_id: inv.inventory_id,
        products: [productId]
      });
      
      const product = Object.values(dataResponse.products || {})[0];
      
      if (product) {
        console.log('✅ FOUND!');
        console.log('🏷️ Tags:', product.tags);
        console.log('SKU:', product.sku);
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

main().catch(console.error);
