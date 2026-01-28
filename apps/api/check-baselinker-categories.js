/**
 * Pobiera drzewo kategorii z Baselinker
 */
require('dotenv').config();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const CATEGORY_ID = 2806608; // Kategoria dla produktu 212580651

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

function buildCategoryPath(categoryId, categoriesMap) {
  const category = categoriesMap.get(categoryId);
  if (!category) return null;
  
  const path = [];
  let current = category;
  
  while (current) {
    path.unshift(current.name);
    if (current.parent_id && current.parent_id !== 0) {
      current = categoriesMap.get(current.parent_id);
    } else {
      current = null;
    }
  }
  
  return path.join('|');
}

async function main() {
  console.log('=== POBIERANIE KATEGORII Z BASELINKER ===\n');
  
  // Pobierz listę magazynów
  const invResp = await blRequest('getInventories');
  const inventories = invResp.inventories || [];
  console.log('Dostępne magazyny:', inventories.map(i => `${i.name} (${i.inventory_id})`).join(', '));
  
  // Sprawdź w magazynie HP (22954) gdzie znaleziono produkt
  const invId = 22954;
  console.log(`\n=== Pobieranie kategorii z magazynu HP (ID: ${invId}) ===\n`);
  
  const categoriesResp = await blRequest('getInventoryCategories', {
    inventory_id: parseInt(invId)
  });
  
  const categories = categoriesResp.categories || [];
  console.log(`Znaleziono ${categories.length} kategorii\n`);
  
  // Stwórz mapę kategorii dla łatwego dostępu
  const categoriesMap = new Map();
  categories.forEach(cat => {
    categoriesMap.set(cat.category_id, cat);
  });
  
  // Znajdź kategorię 2806608
  const targetCategory = categoriesMap.get(CATEGORY_ID);
  
  if (targetCategory) {
    console.log('✅ KATEGORIA ZNALEZIONA!\n');
    console.log('Informacje o kategorii:');
    console.log('─'.repeat(80));
    console.log(`ID: ${targetCategory.category_id}`);
    console.log(`Nazwa: ${targetCategory.name}`);
    console.log(`Parent ID: ${targetCategory.parent_id || 'Brak (kategoria główna)'}`);
    
    const fullPath = buildCategoryPath(CATEGORY_ID, categoriesMap);
    console.log(`\n🌳 PEŁNA ŚCIEŻKA KATEGORII: "${fullPath}"`);
    console.log('─'.repeat(80));
    
    // Pokaż strukturę rodzica jeśli istnieje
    if (targetCategory.parent_id && targetCategory.parent_id !== 0) {
      const parent = categoriesMap.get(targetCategory.parent_id);
      if (parent) {
        console.log(`\nKategoria rodzica:`);
        console.log(`  ID: ${parent.category_id}`);
        console.log(`  Nazwa: ${parent.name}`);
        console.log(`  Parent ID: ${parent.parent_id || 'Brak'}`);
      }
    }
  } else {
    console.log('❌ Kategoria nie znaleziona');
  }
  
  // Pokaż przykładowe kategorie główne i ich podkategorie
  console.log('\n\n📊 PRZYKŁADOWE KATEGORIE (pierwsze 10 głównych):');
  console.log('─'.repeat(80));
  
  const mainCategories = categories.filter(cat => !cat.parent_id || cat.parent_id === 0).slice(0, 10);
  
  mainCategories.forEach(mainCat => {
    console.log(`\n${mainCat.name} (ID: ${mainCat.category_id})`);
    
    // Znajdź podkategorie
    const subCategories = categories.filter(cat => cat.parent_id === mainCat.category_id).slice(0, 5);
    
    subCategories.forEach(subCat => {
      const fullPath = buildCategoryPath(subCat.category_id, categoriesMap);
      console.log(`  └─ ${fullPath}`);
    });
    
    if (categories.filter(cat => cat.parent_id === mainCat.category_id).length > 5) {
      console.log(`  └─ ... i więcej`);
    }
  });
}

main().catch(console.error);
