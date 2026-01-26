/**
 * Sprawdza tagi produktów bezpośrednio w Baselinkerze
 */
require('dotenv').config();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

async function blRequest(method, parameters = {}) {
  const token = process.env.BASELINKER_API_TOKEN;
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));
  
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return response.json();
}

async function main() {
  console.log('=== SPRAWDZANIE TAGÓW W BASELINKERZE ===\n');
  
  // Pobierz listę magazynów
  const invResp = await blRequest('getInventories');
  const inventories = invResp.inventories || [];
  console.log('Magazyny:', inventories.map(i => `${i.name} (${i.inventory_id})`).join(', '));
  
  // Dla każdego magazynu pobierz przykładowe produkty
  for (const inv of inventories.slice(0, 5)) {
    const invId = inv.inventory_id;
    console.log(`\n=== ${inv.name} ===`);
    
    const listResp = await blRequest('getInventoryProductsList', {
      inventory_id: parseInt(invId),
      page: 1
    });
    
    const productIds = Object.keys(listResp.products || {}).slice(0, 5);
    console.log(`Produktów: ${Object.keys(listResp.products || {}).length}`);
    
    if (productIds.length > 0) {
      const dataResp = await blRequest('getInventoryProductsData', {
        inventory_id: parseInt(invId),
        products: productIds.map(Number)
      });
      
      for (const [id, product] of Object.entries(dataResp.products || {})) {
        const name = product.text_fields?.name || 'Brak nazwy';
        const tags = product.tags || [];
        console.log(`  ${name.slice(0, 50)}...`);
        console.log(`    Tagi: [${tags.join(', ')}]`);
      }
    }
    
    // Poczekaj 2.5s między requestami
    await new Promise(r => setTimeout(r, 2500));
  }
}

main().catch(console.error);
