/**
 * Pobiera wszystkie kategorie ze wszystkich magazynów Baselinker
 * i generuje raport struktury kategorii
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

function parseCategory(categoryName) {
  // Parsuje nazwę kategorii z separatorem |
  // np. "Gastronomia|Naczynia i przybory kuchenne" -> { main: "Gastronomia", sub: "Naczynia i przybory kuchenne" }
  if (!categoryName) return null;
  
  const parts = categoryName.split('|').map(p => p.trim());
  
  if (parts.length === 1) {
    return { main: parts[0], sub: null, full: parts[0] };
  } else if (parts.length === 2) {
    return { main: parts[0], sub: parts[1], full: categoryName };
  } else {
    // Więcej niż 2 poziomy
    return { main: parts[0], sub: parts.slice(1).join('|'), full: categoryName };
  }
}

async function main() {
  console.log('=== PEŁNY RAPORT KATEGORII Z BASELINKER ===\n');
  
  // Pobierz listę magazynów
  const invResp = await blRequest('getInventories');
  const inventories = invResp.inventories || [];
  console.log('Dostępne magazyny:', inventories.map(i => `${i.name} (${i.inventory_id})`).join(', '));
  
  // Zbierz wszystkie kategorie z wszystkich magazynów
  const allCategories = new Map(); // category_id -> { name, parent_id, inventory_id, inventory_name }
  const categoriesByInventory = new Map(); // inventory_id -> categories[]
  
  for (const inv of inventories) {
    const invId = inv.inventory_id;
    console.log(`\nPobieranie kategorii z magazynu: ${inv.name} (ID: ${invId})...`);
    
    try {
      const categoriesResp = await blRequest('getInventoryCategories', {
        inventory_id: parseInt(invId)
      });
      
      const categories = categoriesResp.categories || [];
      console.log(`  Znaleziono ${categories.length} kategorii`);
      
      categoriesByInventory.set(invId, categories);
      
      for (const cat of categories) {
        if (!allCategories.has(cat.category_id)) {
          allCategories.set(cat.category_id, {
            ...cat,
            inventory_id: invId,
            inventory_name: inv.name
          });
        }
      }
    } catch (err) {
      console.log(`  ❌ Błąd: ${err.message}`);
    }
    
    // Poczekaj między requestami
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n' + '═'.repeat(100));
  console.log('📊 RAPORT STRUKTURY KATEGORII');
  console.log('═'.repeat(100));
  
  // Analiza kategorii
  const mainCategories = new Map(); // main_name -> { count, subcategories: Map }
  const categoriesWithPipe = [];
  const categoriesWithoutPipe = [];
  
  for (const [catId, cat] of allCategories) {
    const parsed = parseCategory(cat.name);
    
    if (cat.name.includes('|')) {
      categoriesWithPipe.push(cat);
    } else {
      categoriesWithoutPipe.push(cat);
    }
    
    if (parsed) {
      if (!mainCategories.has(parsed.main)) {
        mainCategories.set(parsed.main, {
          count: 0,
          subcategories: new Map(),
          category_id: cat.parent_id === 0 ? catId : null
        });
      }
      
      const mainCat = mainCategories.get(parsed.main);
      
      if (parsed.sub) {
        mainCat.subcategories.set(parsed.sub, {
          category_id: catId,
          full_name: cat.name,
          parent_id: cat.parent_id
        });
      } else {
        mainCat.category_id = catId;
      }
      mainCat.count++;
    }
  }
  
  console.log(`\n📈 STATYSTYKI:`);
  console.log(`  Łącznie kategorii: ${allCategories.size}`);
  console.log(`  Kategorii z separatorem |: ${categoriesWithPipe.length}`);
  console.log(`  Kategorii bez separatora |: ${categoriesWithoutPipe.length}`);
  console.log(`  Unikalne kategorie główne: ${mainCategories.size}`);
  
  console.log('\n' + '─'.repeat(100));
  console.log('🌳 DRZEWKO KATEGORII (format: "Kategoria główna" → podkategorie):');
  console.log('─'.repeat(100));
  
  // Sortuj kategorie główne alfabetycznie
  const sortedMainCategories = [...mainCategories.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [mainName, data] of sortedMainCategories) {
    const subCount = data.subcategories.size;
    console.log(`\n📁 ${mainName} (ID: ${data.category_id || 'N/A'}) - ${subCount} podkategorii`);
    
    // Sortuj podkategorie alfabetycznie
    const sortedSubs = [...data.subcategories.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [subName, subData] of sortedSubs) {
      console.log(`   └─ ${subName} (ID: ${subData.category_id})`);
    }
  }
  
  console.log('\n' + '─'.repeat(100));
  console.log('📋 KATEGORIE BEZ SEPARATORA | (potencjalne kategorie główne):');
  console.log('─'.repeat(100));
  
  for (const cat of categoriesWithoutPipe.sort((a, b) => a.name.localeCompare(b.name))) {
    const hasChildren = [...allCategories.values()].some(c => c.parent_id === cat.category_id);
    console.log(`  ${hasChildren ? '📁' : '📄'} ${cat.name} (ID: ${cat.category_id}, parent: ${cat.parent_id || 'root'}) - ${cat.inventory_name}`);
  }
  
  console.log('\n' + '═'.repeat(100));
  console.log('💡 PODSUMOWANIE DLA NOWEJ LOGIKI KATEGORII:');
  console.log('═'.repeat(100));
  
  console.log(`
W Baselinker kategorie są przechowywane w następujący sposób:
1. Kategorie główne mają parent_id = 0 (np. "Gastronomia", ID: 2804050)
2. Podkategorie mają parent_id wskazujący na kategorię główną
3. Nazwy podkategorii ZAWIERAJĄ separator | (np. "Gastronomia|Naczynia i przybory kuchenne")

REKOMENDACJA:
- Używać pola "name" kategorii z Baselinker do parsowania głównej kategorii i podkategorii
- Separator | oddziela: "GŁÓWNA|PODKATEGORIA"
- Tworzyć drzewko kategorii na podstawie nazw, nie parent_id (ponieważ nazwy są bardziej czytelne)
- W bazie przechowywać:
  * baselinkerCategoryId - ID kategorii z Baselinker
  * baselinkerCategoryPath - pełna nazwa (np. "Gastronomia|Naczynia i przybory kuchenne")
  * Parsować ścieżkę na kategorie główne i podkategorie w aplikacji
`);

  // Export do JSON dla dalszej analizy
  const exportData = {
    generatedAt: new Date().toISOString(),
    totalCategories: allCategories.size,
    mainCategories: sortedMainCategories.map(([name, data]) => ({
      name,
      category_id: data.category_id,
      subcategories: [...data.subcategories.entries()].map(([subName, subData]) => ({
        name: subName,
        category_id: subData.category_id,
        full_name: subData.full_name
      }))
    }))
  };
  
  const fs = require('fs');
  fs.writeFileSync('baselinker-categories-export.json', JSON.stringify(exportData, null, 2));
  console.log('\n✅ Wyeksportowano dane do: baselinker-categories-export.json');
}

main().catch(console.error);
