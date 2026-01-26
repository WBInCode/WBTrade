/**
 * Script: Reassign Categories By Tags
 * 
 * Przypisuje produkty do kategorii na podstawie tagów z Baselinkera.
 * 
 * Logika:
 * 1. Tworzy/aktualizuje strukturę kategorii (główne + podkategorie)
 * 2. Dla każdego produktu:
 *    - Pobiera tagi z bazy danych
 *    - Mapuje tagi na kategorię używając CategoryTagMapper
 *    - Przypisuje produkt do odpowiedniej podkategorii
 * 
 * WAŻNE: 
 * - Główne kategorie są KONTENERAMI - nie przypisujemy do nich produktów
 * - Produkty bez tagów kategorii trafiają do "Inne"
 * - Produkty z tagiem głównej kategorii bez podkategorii:
 *   - Jeśli główna ma podkategorie -> "Inne"
 *   - Jeśli główna nie ma podkategorii -> do tej głównej
 * 
 * Użycie:
 *   node reassign-categories-by-tags.js [--dry-run]
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { CategoryTagMapper } = require('./src/services/category-tag-mapper.service');

const prisma = new PrismaClient();
const mapper = new CategoryTagMapper();

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 200;

// ============================================
// HELPER FUNCTIONS
// ============================================

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

// ============================================
// MAIN LOGIC
// ============================================

async function ensureCategoryStructure() {
  console.log('=== KROK 1: Tworzenie struktury kategorii ===\n');
  
  const structure = mapper.getCategoryStructure();
  const categoryCache = new Map(); // slug -> category
  const mainCategoryIds = new Set(); // IDs głównych kategorii (kontenery)
  
  // Utwórz/zaktualizuj "Inne" jako fallback
  let inneCat = await prisma.category.findUnique({
    where: { slug: 'inne' }
  });
  
  if (!inneCat) {
    inneCat = await prisma.category.create({
      data: {
        name: 'Inne',
        slug: 'inne',
        isActive: true,
        order: 999
      }
    });
    console.log('✓ Utworzono kategorię "Inne" (fallback)');
  }
  categoryCache.set('inne', inneCat);
  
  // Iteruj przez strukturę kategorii
  for (const mainCat of structure) {
    // Sprawdź czy główna kategoria istnieje
    let mainCategory = await prisma.category.findUnique({
      where: { slug: mainCat.slug }
    });
    
    if (!mainCategory) {
      if (!DRY_RUN) {
        mainCategory = await prisma.category.create({
          data: {
            name: mainCat.name,
            slug: mainCat.slug,
            parentId: null,
            isActive: true,
            order: mainCat.order
          }
        });
      }
      console.log(`  ✓ Utworzono główną kategorię: ${mainCat.name} (${mainCat.slug})`);
    } else {
      // Zaktualizuj order i aktywność
      if (!DRY_RUN) {
        await prisma.category.update({
          where: { id: mainCategory.id },
          data: { 
            isActive: true, 
            order: mainCat.order,
            parentId: null // Upewnij się że jest kategorią główną
          }
        });
      }
    }
    
    if (mainCategory) {
      mainCategoryIds.add(mainCategory.id);
      categoryCache.set(mainCat.slug, mainCategory);
    }
    
    // Utwórz podkategorie
    for (const subCat of mainCat.subcategories) {
      let subCategory = await prisma.category.findUnique({
        where: { slug: subCat.slug }
      });
      
      if (!subCategory) {
        if (!DRY_RUN && mainCategory) {
          subCategory = await prisma.category.create({
            data: {
              name: subCat.name,
              slug: subCat.slug,
              parentId: mainCategory.id,
              isActive: true,
              order: 0
            }
          });
        }
        console.log(`    ✓ Utworzono podkategorię: ${mainCat.name} > ${subCat.name}`);
      } else {
        // Zaktualizuj parent jeśli się zmienił
        if (!DRY_RUN && mainCategory && subCategory.parentId !== mainCategory.id) {
          await prisma.category.update({
            where: { id: subCategory.id },
            data: { 
              parentId: mainCategory.id,
              isActive: true
            }
          });
        }
      }
      
      if (subCategory) {
        categoryCache.set(subCat.slug, subCategory);
      }
    }
  }
  
  console.log(`\n✓ Struktura kategorii gotowa (${categoryCache.size} kategorii)\n`);
  
  return { categoryCache, mainCategoryIds, inneCat };
}

async function reassignProducts(categoryCache, mainCategoryIds, inneCat) {
  console.log('=== KROK 2: Przypisywanie produktów do kategorii ===\n');
  
  // Pobierz wszystkie produkty z tagami
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      tags: true,
      categoryId: true
    }
  });
  
  console.log(`Znaleziono ${allProducts.length} produktów\n`);
  
  const stats = {
    total: allProducts.length,
    reassigned: 0,
    unchanged: 0,
    toInne: 0,
    noTags: 0,
    byCategory: {}
  };
  
  const samples = {
    noTags: [],
    toInne: [],
    reassigned: []
  };
  
  // Przetwarzaj w batchach
  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);
    const updates = [];
    
    for (const product of batch) {
      const tags = product.tags || [];
      
      // Mapuj tagi na kategorię
      const mapping = mapper.mapTags(tags);
      
      // Znajdź kategorię docelową
      let targetCategory = categoryCache.get(mapping.assignToSlug);
      
      // Jeśli nie znaleziono, użyj "Inne"
      if (!targetCategory) {
        targetCategory = inneCat;
      }
      
      // USUNIĘTO: Logikę przekierowującą produkty do "Inne" gdy główna kategoria ma podkategorie
      // Teraz produkty z samym tagiem głównej kategorii (np. "gastronomia") 
      // trafiają bezpośrednio do tej kategorii głównej
      
      const targetCategoryId = targetCategory.id;
      const catName = mapping.subCategory 
        ? `${mapping.mainCategory} > ${mapping.subCategory}`
        : (mapping.mainCategory || 'Inne');
      
      // Zbieraj statystyki
      if (tags.length === 0) {
        stats.noTags++;
        if (samples.noTags.length < 10) {
          samples.noTags.push(product.name);
        }
      }
      
      if (mapping.assignToSlug === 'inne' || mapping.isFallback) {
        stats.toInne++;
        if (samples.toInne.length < 10 && tags.length > 0) {
          samples.toInne.push({ name: product.name, tags });
        }
      }
      
      // Tylko aktualizuj jeśli kategoria się zmieniła
      if (product.categoryId !== targetCategoryId) {
        updates.push({
          where: { id: product.id },
          data: { categoryId: targetCategoryId }
        });
        stats.reassigned++;
        stats.byCategory[catName] = (stats.byCategory[catName] || 0) + 1;
        
        if (samples.reassigned.length < 10) {
          samples.reassigned.push({ name: product.name, tags, to: catName });
        }
      } else {
        stats.unchanged++;
      }
    }
    
    // Wykonaj aktualizacje
    if (!DRY_RUN) {
      for (const update of updates) {
        await prisma.product.update(update);
      }
    }
    
    // Pokaż postęp
    if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= allProducts.length) {
      console.log(`  Postęp: ${Math.min(i + BATCH_SIZE, allProducts.length)}/${allProducts.length}`);
    }
  }
  
  return { stats, samples };
}

async function updateCategoryVisibility(categoryCache, mainCategoryIds) {
  console.log('\n=== KROK 3: Aktualizacja widoczności kategorii ===\n');
  
  // Pobierz kategorie z liczbą produktów
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { products: { where: { price: { gt: 0 } } } } },
      children: {
        include: {
          _count: { select: { products: { where: { price: { gt: 0 } } } } }
        }
      }
    }
  });
  
  // Oblicz sumy dla kategorii głównych (produkty w podkategoriach)
  const mainCatStats = [];
  
  for (const cat of categories) {
    if (cat.parentId === null && cat.slug !== 'inne') {
      const childProducts = cat.children.reduce(
        (sum, child) => sum + child._count.products, 
        0
      );
      
      mainCatStats.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        directProducts: cat._count.products,
        childProducts,
        totalProducts: childProducts + cat._count.products
      });
    }
  }
  
  // Sortuj po liczbie produktów
  mainCatStats.sort((a, b) => b.totalProducts - a.totalProducts);
  
  // Aktualizuj order (tylko kategorie z produktami)
  let order = 1;
  for (const cat of mainCatStats) {
    if (cat.totalProducts > 0) {
      if (!DRY_RUN) {
        await prisma.category.update({
          where: { id: cat.id },
          data: { order: order++ }
        });
      }
    } else {
      // Ukryj puste kategorie
      if (!DRY_RUN) {
        await prisma.category.update({
          where: { id: cat.id },
          data: { order: 0 }
        });
      }
    }
  }
  
  // "Inne" zawsze na końcu
  if (!DRY_RUN) {
    await prisma.category.update({
      where: { slug: 'inne' },
      data: { order: 999 }
    });
  }
  
  console.log('Kategorie główne (posortowane po liczbie produktów):\n');
  for (const cat of mainCatStats) {
    const visibility = cat.totalProducts > 0 ? '✓' : '✗';
    console.log(`  ${visibility} ${cat.name}: ${cat.childProducts} w podkategoriach`);
    if (cat.directProducts > 0) {
      console.log(`     ⚠️ UWAGA: ${cat.directProducts} produktów bezpośrednio w głównej!`);
    }
  }
  
  // Pokaż "Inne"
  const inneCount = await prisma.product.count({
    where: { 
      category: { slug: 'inne' },
      price: { gt: 0 }
    }
  });
  console.log(`\n  Inne: ${inneCount} produktów (fallback)\n`);
  
  return mainCatStats;
}

async function showTopSubcategories() {
  console.log('\n=== TOP 20 PODKATEGORII ===\n');
  
  const topSubs = await prisma.category.findMany({
    where: { 
      parentId: { not: null },
      isActive: true 
    },
    include: {
      _count: { select: { products: { where: { price: { gt: 0 } } } } },
      parent: { select: { name: true } }
    }
  });
  
  // Sortuj w JS zamiast w Prisma
  const sorted = topSubs
    .sort((a, b) => b._count.products - a._count.products)
    .slice(0, 20);
  
  for (const sub of sorted) {
    if (sub._count.products > 0) {
      console.log(`  ${sub.parent?.name} > ${sub.name}: ${sub._count.products} produktów`);
    }
  }
}

async function main() {
  console.log('\n============================================');
  console.log('  PRZYPISANIE KATEGORII NA PODSTAWIE TAGÓW');
  console.log('============================================\n');
  
  if (DRY_RUN) {
    console.log('⚠️  TRYB DRY-RUN - zmiany nie będą zapisywane\n');
  }
  
  const startTime = Date.now();
  
  try {
    // Krok 1: Utwórz strukturę kategorii
    const { categoryCache, mainCategoryIds, inneCat } = await ensureCategoryStructure();
    
    // Krok 2: Przypisz produkty
    const { stats, samples } = await reassignProducts(categoryCache, mainCategoryIds, inneCat);
    
    // Krok 3: Aktualizuj widoczność
    await updateCategoryVisibility(categoryCache, mainCategoryIds);
    
    // Pokaż top podkategorie
    await showTopSubcategories();
    
    // Podsumowanie
    console.log('\n============================================');
    console.log('  PODSUMOWANIE');
    console.log('============================================\n');
    
    console.log(`Łącznie produktów: ${stats.total}`);
    console.log(`Przypisano ponownie: ${stats.reassigned}`);
    console.log(`Bez zmian: ${stats.unchanged}`);
    console.log(`Do "Inne": ${stats.toInne}`);
    console.log(`Bez tagów: ${stats.noTags}`);
    
    if (Object.keys(stats.byCategory).length > 0) {
      console.log('\nPrzypisania do kategorii (top 20):');
      const sortedCats = Object.entries(stats.byCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);
      
      for (const [cat, count] of sortedCats) {
        console.log(`  ${cat}: ${count}`);
      }
    }
    
    if (samples.noTags.length > 0) {
      console.log('\nPrzykłady produktów bez tagów:');
      for (const name of samples.noTags) {
        console.log(`  - ${name}`);
      }
    }
    
    if (samples.toInne.length > 0) {
      console.log('\nPrzykłady produktów do "Inne" (mają tagi ale nierozpoznane):');
      for (const item of samples.toInne) {
        console.log(`  - ${item.name}`);
        console.log(`    Tagi: [${item.tags.join(', ')}]`);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Zakończono w ${duration}s\n`);
    
  } catch (error) {
    console.error('❌ Błąd:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
