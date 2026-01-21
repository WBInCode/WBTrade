/**
 * Sprawdzenie formatu SKU w BaseLinker dla HP
 */
require('dotenv').config();
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

async function blRequest(apiToken, method, parameters = {}) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));

  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  return await response.json();
}

async function main() {
  const apiToken = process.env.BASELINKER_API_TOKEN;
  
  // Pobierz kilka produktów z HP
  const listResp = await blRequest(apiToken, 'getInventoryProductsList', {
    inventory_id: 22954,
    page: 1,
  });
  
  const productIds = Object.values(listResp.products || {}).slice(0, 5).map(p => p.id);
  console.log('Product IDs:', productIds);
  
  // Pobierz szczegóły
  const dataResp = await blRequest(apiToken, 'getInventoryProductsData', {
    inventory_id: 22954,
    products: productIds,
  });
  
  console.log('\nPrzykłady produktów HP z BaseLinker:');
  for (const [id, product] of Object.entries(dataResp.products || {})) {
    console.log(`  ID: ${id}`);
    console.log(`    SKU: ${product.sku}`);
    console.log(`    text_fields.sku: ${product.text_fields?.sku}`);
    console.log(`    tags: ${JSON.stringify(product.tags)}`);
    console.log('');
  }
}

main().catch(console.error);
