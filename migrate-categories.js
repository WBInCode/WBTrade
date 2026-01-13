const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Funkcja do tworzenia slugów
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ąćęłńóśźż]/g, (match) => {
      const map = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
      return map[match] || match;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function migrateCategories() {
  console.log('🔄 Migracja kategorii z Baselinker na nowe drzewo kategorii\n');
  
  // Wczytaj mapowanie kategorii
  const mappingPath = path.join(__dirname, 'apps', 'api', 'config', 'category-mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  
  console.log(`📋 Wczytano mapowanie: ${mapping.mainCategories.length} głównych kategorii\n`);
  
  // Krok 1: Usuń stare kategorie Baselinker (zachowaj baselinkerCategoryId dla historii)
  console.log('🗑️  Przygotowanie do migracji...');
  
  // Zapisz mapowanie starych kategorii
  const oldCategories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      baselinkerCategoryId: true,
      _count: {
        select: { products: true }
      }
    }
  });
  
  console.log(`   Znaleziono ${oldCategories.length} starych kategorii Baselinker`);
  console.log(`   Kategorie z produktami: ${oldCategories.filter(c => c._count.products > 0).length}\n`);
  
  // Krok 2: Utwórz nowe kategorie hierarchiczne
  console.log('📁 Tworzenie nowego drzewa kategorii...');
  
  const categoryMap = new Map(); // slug -> categoryId
  
  for (const mainCat of mapping.mainCategories) {
    // Utwórz kategorię główną
    const mainSlug = mainCat.slug;
    
    const createdMain = await prisma.category.upsert({
      where: { slug: mainSlug },
      create: {
        name: mainCat.name,
        slug: mainSlug,
        parentId: null,
        baselinkerCategoryId: null
      },
      update: {
        name: mainCat.name,
        parentId: null
      }
    });
    
    categoryMap.set(mainSlug, createdMain.id);
    console.log(`   ✓ ${mainCat.name}`);
    
    // Utwórz podkategorie
    if (mainCat.subcategories) {
      for (const subCat of mainCat.subcategories) {
        const subSlug = subCat.slug;
        
        const createdSub = await prisma.category.upsert({
          where: { slug: subSlug },
          create: {
            name: subCat.name,
            slug: subSlug,
            parentId: createdMain.id,
            baselinkerCategoryId: null
          },
          update: {
            name: subCat.name,
            parentId: createdMain.id
          }
        });
        
        categoryMap.set(subSlug, createdSub.id);
        console.log(`      - ${subCat.name}`);
      }
    }
  }
  
  console.log(`\n✅ Utworzono ${categoryMap.size} kategorii\n`);
  
  // Krok 3: Mapuj produkty na nowe kategorie
  console.log('🔗 Mapowanie produktów na nowe kategorie...');
  
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      categoryId: true,
      category: {
        select: {
          name: true,
          baselinkerCategoryId: true
        }
      }
    }
  });
  
  console.log(`   Znaleziono ${products.length} produktów do zmapowania\n`);
  
  let mapped = 0;
  let unmapped = 0;
  const unmappedProducts = [];
  
  for (const product of products) {
    const productName = product.name.toLowerCase();
    const oldCategoryName = product.category?.name?.toLowerCase() || '';
    
    // Szukaj najlepszego dopasowania
    let bestMatch = null;
    let bestScore = 0;
    
    for (const mainCat of mapping.mainCategories) {
      if (mainCat.subcategories) {
        for (const subCat of mainCat.subcategories) {
          let score = 0;
          
          // Sprawdź słowa kluczowe
          if (subCat.keywords) {
            for (const keyword of subCat.keywords) {
              if (productName.includes(keyword.toLowerCase()) || 
                  oldCategoryName.includes(keyword.toLowerCase())) {
                score += 10;
              }
            }
          }
          
          // Sprawdź excludeKeywords (obniża score)
          if (subCat.excludeKeywords) {
            for (const keyword of subCat.excludeKeywords) {
              if (productName.includes(keyword.toLowerCase())) {
                score -= 5;
              }
            }
          }
          
          // Bonus za priorytet
          if (subCat.priority) {
            score += subCat.priority;
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = subCat.slug;
          }
        }
      }
    }
    
    // Jeśli nie znaleziono dopasowania, spróbuj kategorii głównej
    if (!bestMatch || bestScore < 5) {
      for (const mainCat of mapping.mainCategories) {
        if (oldCategoryName.includes(mainCat.name.toLowerCase())) {
          bestMatch = mainCat.slug;
          bestScore = 5;
          break;
        }
      }
    }
    
    // Aktualizuj produkt
    if (bestMatch && categoryMap.has(bestMatch)) {
      const newCategoryId = categoryMap.get(bestMatch);
      await prisma.product.update({
        where: { id: product.id },
        data: { categoryId: newCategoryId }
      });
      mapped++;
      
      if (mapped % 100 === 0) {
        console.log(`   Zmapowano ${mapped}/${products.length} produktów...`);
      }
    } else {
      unmapped++;
      unmappedProducts.push({
        id: product.id,
        name: product.name,
        oldCategory: product.category?.name
      });
    }
  }
  
  console.log(`\n📊 Podsumowanie migracji:`);
  console.log(`   ✅ Zmapowano: ${mapped} produktów`);
  console.log(`   ⚠️  Niezmapowane: ${unmapped} produktów`);
  
  if (unmappedProducts.length > 0) {
    console.log(`\n⚠️  Pierwsze 10 niezmapowanych produktów:`);
    unmappedProducts.slice(0, 10).forEach(p => {
      console.log(`   - ${p.name} (${p.oldCategory})`);
    });
  }
  
  // Krok 4: Usuń puste stare kategorie Baselinker
  console.log(`\n🗑️  Usuwanie pustych starych kategorii Baselinker...`);
  const deleted = await prisma.category.deleteMany({
    where: {
      AND: [
        { baselinkerCategoryId: { not: null } },
        { products: { none: {} } }
      ]
    }
  });
  
  console.log(`   Usunięto ${deleted.count} pustych kategorii\n`);
  
  console.log('✅ Migracja zakończona!');
  
  await prisma.$disconnect();
}

migrateCategories().catch(console.error);
