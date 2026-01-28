/**
 * Sprawdza kategorię dla konkretnego produktu w Baselinkerze
 */
require('dotenv').config();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const PRODUCT_ID = 212580651;

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
  console.log(`=== SPRAWDZANIE PRODUKTU ${PRODUCT_ID} W BASELINKERZE ===\n`);
  
  // Pobierz listę magazynów
  const invResp = await blRequest('getInventories');
  const inventories = invResp.inventories || [];
  console.log('Dostępne magazyny:', inventories.map(i => `${i.name} (${i.inventory_id})`).join(', '));
  
  // Sprawdź w każdym magazynie
  for (const inv of inventories) {
    const invId = inv.inventory_id;
    console.log(`\n=== Szukanie w magazynie: ${inv.name} (ID: ${invId}) ===`);
    
    try {
      const dataResp = await blRequest('getInventoryProductsData', {
        inventory_id: parseInt(invId),
        products: [PRODUCT_ID]
      });
      
      if (dataResp.products && dataResp.products[PRODUCT_ID]) {
        const product = dataResp.products[PRODUCT_ID];
        console.log('\n✅ PRODUKT ZNALEZIONY!\n');
        console.log('Dane produktu:');
        console.log('─'.repeat(80));
        console.log(`ID: ${PRODUCT_ID}`);
        console.log(`Nazwa: ${product.text_fields?.name || 'Brak nazwy'}`);
        console.log(`SKU: ${product.sku || 'Brak SKU'}`);
        console.log(`EAN: ${product.ean || 'Brak EAN'}`);
        console.log(`\nKategoria w Baselinker:`);
        console.log(`  category_id: ${product.category_id || 'Brak'}`);
        
        // Sprawdź wszystkie możliwe pola z kategorią
        if (product.category) {
          console.log(`  category: ${product.category}`);
        }
        if (product.text_fields?.extra_field_1) {
          console.log(`  extra_field_1: ${product.text_fields.extra_field_1}`);
        }
        if (product.text_fields?.extra_field_2) {
          console.log(`  extra_field_2: ${product.text_fields.extra_field_2}`);
        }
        
        console.log(`\nTagi: [${(product.tags || []).join(', ')}]`);
        console.log(`\nCena: ${product.prices?.price_brutto || product.price_brutto || 'Brak'} PLN`);
        console.log(`Stan magazynowy: ${product.stock || 0}`);
        
        console.log('\n─'.repeat(80));
        console.log('\n📦 PEŁNA STRUKTURA PRODUKTU:');
        console.log(JSON.stringify(product, null, 2));
        
        return; // Znaleziono produkt, koniec
      } else {
        console.log('  ❌ Produkt nie znaleziony w tym magazynie');
      }
    } catch (err) {
      console.log(`  ❌ Błąd: ${err.message}`);
    }
    
    // Poczekaj między requestami
    await new Promise(r => setTimeout(r, 2500));
  }
  
  console.log('\n⚠️ Produkt nie został znaleziony w żadnym magazynie');
}

main().catch(console.error);
