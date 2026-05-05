/**
 * Skrypt eksploracyjny: pobiera inventories i kategorie z Baselinkera
 * żeby ustalić inventory_id dla HP i mapowanie kategorii
 */
import 'dotenv/config';

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const API_TOKEN = process.env.BASELINKER_API_TOKEN!;

async function blRequest(method: string, params: Record<string, any> = {}): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(params));

  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': API_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const data = await response.json();
  if (data.status === 'ERROR') {
    throw new Error(`BL API Error: ${data.error_message}`);
  }
  return data;
}

async function main() {
  if (!API_TOKEN) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  // 1. Pobierz inventories
  console.log('📦 Pobieranie inventories...');
  const invResp = await blRequest('getInventories');
  console.log('\nInventories:');
  for (const inv of invResp.inventories) {
    console.log(`  ID: ${inv.inventory_id} | Nazwa: "${inv.name}" | Opis: "${inv.description}" | Języki: ${inv.languages} | Default: ${inv.default_language}`);
  }

  // 2. Dla każdego inventory pobierz kategorie
  for (const inv of invResp.inventories) {
    console.log(`\n📂 Kategorie dla inventory "${inv.name}" (ID: ${inv.inventory_id}):`);
    const catResp = await blRequest('getInventoryCategories', { inventory_id: inv.inventory_id });
    
    const categories = catResp.categories || [];
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        const parentStr = cat.parent_id ? ` (parent: ${cat.parent_id})` : ' (root)';
        console.log(`  ID: ${cat.category_id} | "${cat.name}"${parentStr}`);
      }
      console.log(`  Łącznie: ${categories.length} kategorii`);
    } else {
      console.log('  Brak kategorii lub format obiektowy');
    }

    // 3. Pobierz liczbę produktów
    console.log(`\n📊 Produkty w inventory "${inv.name}":`);
    const prodResp = await blRequest('getInventoryProductsList', { inventory_id: inv.inventory_id, page: 1 });
    const products = prodResp.products || {};
    const productEntries = Object.entries(products);
    console.log(`  Strona 1: ${productEntries.length} produktów`);
    
    // Pokaż przykład z category_id
    if (productEntries.length > 0) {
      // Znajdź produkty BEZ kategorii (category_id = 0)
      const withoutCat = productEntries.filter(([_, p]: [string, any]) => !p.category_id || p.category_id === 0);
      const withCat = productEntries.filter(([_, p]: [string, any]) => p.category_id && p.category_id !== 0);
      console.log(`  Z kategorią: ${withCat.length}, Bez kategorii: ${withoutCat.length} (na stronie 1)`);
      
      // Pokaż 3 przykłady z kategorią i 3 bez
      if (withCat.length > 0) {
        console.log('\n  Przykłady z kategorią:');
        for (const [id, p] of withCat.slice(0, 3) as [string, any][]) {
          console.log(`    ID ${id}: "${p.name}" | SKU: ${p.sku} | category_id: ${p.category_id}`);
        }
      }
      if (withoutCat.length > 0) {
        console.log('\n  Przykłady BEZ kategorii:');
        for (const [id, p] of withoutCat.slice(0, 3) as [string, any][]) {
          console.log(`    ID ${id}: "${p.name}" | SKU: ${p.sku} | category_id: ${p.category_id}`);
        }
      }
    }
  }
}

main().catch(console.error);
