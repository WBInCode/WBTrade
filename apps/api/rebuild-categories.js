const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Wczytaj mapowanie
const mappingPath = path.join(__dirname, 'config', 'category-mapping.json');
const categoryMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź|ż/g, 'z')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Funkcja dopasowująca produkt do kategorii - TYLKO po nazwie produktu
function matchCategory(productName) {
  const searchText = productName.toLowerCase();
  
  let bestMatch = null;
  let bestPriority = -1;
  
  for (const mainCat of categoryMapping.mainCategories) {
    // Najpierw sprawdź podkategorie
    if (mainCat.subcategories) {
      for (const subCat of mainCat.subcategories) {
        const priority = subCat.priority || 0;
        
        // Sprawdź exclude keywords
        if (subCat.excludeKeywords) {
          const hasExcluded = subCat.excludeKeywords.some(keyword => 
            searchText.includes(keyword.toLowerCase())
          );
          if (hasExcluded) continue;
        }
        
        // Sprawdź keywords
        if (subCat.keywords) {
          const hasMatch = subCat.keywords.some(keyword => 
            searchText.includes(keyword.toLowerCase())
          );
          
          if (hasMatch && priority > bestPriority) {
            bestMatch = {
              main: mainCat,
              sub: subCat
            };
            bestPriority = priority;
          }
        }
      }
    }
    
    // Sprawdź też główną kategorię
    if (mainCat.keywords) {
      const priority = mainCat.priority || 0;
      
      const hasMatch = mainCat.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      
      if (hasMatch && priority > bestPriority && !bestMatch) {
        bestMatch = {
          main: mainCat,
          sub: null
        };
        bestPriority = priority;
      }
    }
  }
  
  return bestMatch;
}

async function rebuildCategories() {
  console.log('=== PRZEBUDOWA KATEGORII ===\n');
  
  try {
    // 1. Stwórz nowe kategorie główne
    console.log('Krok 1: Tworzenie kategorii głównych...');
    const mainCategoryMap = new Map();
    let order = 1;
    
    for (const mainCat of categoryMapping.mainCategories) {
      const slug = mainCat.slug;
      
      const category = await prisma.category.upsert({
        where: { slug },
        create: {
          name: mainCat.name,
          slug: slug,
          parentId: null,
          isActive: true,
          order: order++
        },
        update: {
          name: mainCat.name,
          isActive: true,
          order: order++
        }
      });
      
      mainCategoryMap.set(slug, category);
      console.log(`  ✓ ${mainCat.name}`);
      
      // 2. Stwórz podkategorie
      if (mainCat.subcategories) {
        for (const subCat of mainCat.subcategories) {
          const subSlug = subCat.slug;
          
          await prisma.category.upsert({
            where: { slug: subSlug },
            create: {
              name: subCat.name,
              slug: subSlug,
              parentId: category.id,
              isActive: true,
              order: 0
            },
            update: {
              name: subCat.name,
              parentId: category.id,
              isActive: true
            }
          });
          
          console.log(`    - ${subCat.name}`);
        }
      }
    }
    
    // 3. Stwórz kategorię fallback
    const fallbackCat = await prisma.category.upsert({
      where: { slug: categoryMapping.fallbackCategory.slug },
      create: {
        name: categoryMapping.fallbackCategory.name,
        slug: categoryMapping.fallbackCategory.slug,
        parentId: null,
        isActive: true,
        order: 999
      },
      update: {
        name: categoryMapping.fallbackCategory.name,
        isActive: true,
        order: 999
      }
    });
    
    console.log(`\n✓ Utworzono ${mainCategoryMap.size} kategorii głównych\n`);
    
    // 4. Pobierz wszystkie produkty i przypisz do nowych kategorii
    console.log('Krok 2: Przypisywanie produktów do kategorii...');
    
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        baselinkerCategoryPath: true,
        categoryId: true
      }
    });
    
    console.log(`Przetwarzanie ${products.length} produktów...`);
    
    let matched = 0;
    let unmatched = 0;
    let updated = 0;
    
    for (const product of products) {
      const match = matchCategory(product.name);
      
      let targetCategorySlug;
      
      if (match) {
        targetCategorySlug = match.sub ? match.sub.slug : match.main.slug;
        matched++;
      } else {
        targetCategorySlug = fallbackCat.slug;
        unmatched++;
      }
      
      // Znajdź kategorię docelową
      const targetCategory = await prisma.category.findUnique({
        where: { slug: targetCategorySlug }
      });
      
      if (targetCategory && product.categoryId !== targetCategory.id) {
        await prisma.product.update({
          where: { id: product.id },
          data: { categoryId: targetCategory.id }
        });
        updated++;
      }
      
      if ((matched + unmatched) % 1000 === 0) {
        console.log(`  Przetworzono: ${matched + unmatched}/${products.length}`);
      }
    }
    
    console.log(`\n=== PODSUMOWANIE ===`);
    console.log(`Dopasowane: ${matched}`);
    console.log(`Niedopasowane (→ Inne): ${unmatched}`);
    console.log(`Zaktualizowane: ${updated}`);
    
    // 5. Pokaż statystyki nowych kategorii
    console.log('\n=== NOWE KATEGORIE (z liczbą produktów) ===\n');
    
    const newCategories = await prisma.category.findMany({
      where: { 
        parentId: null,
        order: { gt: 0 }
      },
      include: {
        _count: {
          select: { products: true }
        },
        children: {
          include: {
            _count: {
              select: { products: true }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });
    
    for (const cat of newCategories) {
      const totalInChildren = cat.children.reduce((sum, child) => sum + child._count.products, 0);
      const total = cat._count.products + totalInChildren;
      
      console.log(`${cat.name}: ${total} produktów (${cat._count.products} bezpośrednio)`);
      
      if (cat.children.length > 0) {
        for (const child of cat.children) {
          if (child._count.products > 0) {
            console.log(`  - ${child.name}: ${child._count.products}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

rebuildCategories();
