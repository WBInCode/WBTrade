/**
 * Script to reassign ALL products to correct SUBCATEGORIES based on keyword matching
 * Products go ONLY to subcategories - main categories are containers
 * Version 4.0
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Load category mapping
const mappingPath = path.resolve(__dirname, 'config', 'category-mapping.json');
console.log('Loading mapping from:', mappingPath);
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

// Keyword matching function - ONLY returns subcategories
function matchCategory(productName) {
  const searchText = productName.toLowerCase();
  
  let bestMatch = null;
  let bestPriority = -1;
  let bestKeywordLength = 0; // Prefer longer keyword matches
  
  for (const mainCat of categoryMapping.mainCategories) {
    // Only check subcategories - main categories are containers
    if (mainCat.subcategories) {
      for (const subCat of mainCat.subcategories) {
        const priority = subCat.priority || 0;
        
        // Check exclude keywords first
        if (subCat.excludeKeywords) {
          const hasExcluded = subCat.excludeKeywords.some(keyword => 
            searchText.includes(keyword.toLowerCase())
          );
          if (hasExcluded) continue;
        }
        
        // Check keywords
        if (subCat.keywords) {
          for (const keyword of subCat.keywords) {
            const lowerKeyword = keyword.toLowerCase();
            if (searchText.includes(lowerKeyword)) {
              // Choose match with higher priority, or longer keyword if same priority
              if (priority > bestPriority || 
                  (priority === bestPriority && lowerKeyword.length > bestKeywordLength)) {
                bestMatch = {
                  main: mainCat,
                  sub: subCat,
                  keyword: keyword
                };
                bestPriority = priority;
                bestKeywordLength = lowerKeyword.length;
              }
            }
          }
        }
      }
    }
  }
  
  return bestMatch;
}

async function reassignAllProducts() {
  console.log('=== REASSIGNING ALL PRODUCTS TO SUBCATEGORIES ===\n');
  console.log('NOTE: Products will ONLY be assigned to subcategories!\n');
  
  try {
    // Get or create the "Inne" category for fallback
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
    }
    
    // Ensure all main categories and subcategories exist
    console.log('Step 1: Creating/updating category structure...\n');
    
    const categoryCache = new Map(); // slug -> category
    const mainCategoryIds = new Set(); // IDs of main categories (not for products)
    let order = 1;
    
    for (const mainCat of categoryMapping.mainCategories) {
      const mainSlug = mainCat.slug;
      
      let mainCategory = await prisma.category.findUnique({
        where: { slug: mainSlug }
      });
      
      if (!mainCategory) {
        mainCategory = await prisma.category.create({
          data: {
            name: mainCat.name,
            slug: mainSlug,
            parentId: null,
            isActive: true,
            order: order++
          }
        });
        console.log(`  Created main category: ${mainCat.name}`);
      } else {
        await prisma.category.update({
          where: { id: mainCategory.id },
          data: { isActive: true, order: order++ }
        });
      }
      
      // Track main categories - products should NOT go here
      mainCategoryIds.add(mainCategory.id);
      categoryCache.set(mainSlug, mainCategory);
      
      // Create subcategories
      if (mainCat.subcategories) {
        for (const subCat of mainCat.subcategories) {
          const subSlug = subCat.slug;
          
          let subCategory = await prisma.category.findUnique({
            where: { slug: subSlug }
          });
          
          if (!subCategory) {
            subCategory = await prisma.category.create({
              data: {
                name: subCat.name,
                slug: subSlug,
                parentId: mainCategory.id,
                isActive: true,
                order: 0
              }
            });
            console.log(`    Created subcategory: ${subCat.name}`);
          } else {
            await prisma.category.update({
              where: { id: subCategory.id },
              data: { parentId: mainCategory.id, isActive: true }
            });
          }
          
          categoryCache.set(subSlug, subCategory);
        }
      }
    }
    
    // Add "Inne" to cache
    categoryCache.set('inne', inneCat);
    
    // Get ALL products
    console.log('\nStep 2: Loading ALL products...\n');
    
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        categoryId: true
      }
    });
    
    console.log(`Found ${allProducts.length} total products\n`);
    
    // Reassign products based on keyword matching
    console.log('Step 3: Reassigning ALL products to SUBCATEGORIES only...\n');
    
    let reassigned = 0;
    let notMatched = 0;
    let unchanged = 0;
    const categoryStats = {};
    const unmatchedSamples = [];
    
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      const batch = allProducts.slice(i, i + BATCH_SIZE);
      
      const updates = [];
      
      for (const product of batch) {
        const match = matchCategory(product.name);
        
        let targetCategoryId;
        let catName;
        
        if (match && match.sub) {
          // Must be a subcategory
          const targetSlug = match.sub.slug;
          const targetCategory = categoryCache.get(targetSlug);
          
          if (targetCategory) {
            targetCategoryId = targetCategory.id;
            catName = `${match.main.name} > ${match.sub.name}`;
          } else {
            targetCategoryId = inneCat.id;
            catName = 'Inne';
            notMatched++;
            if (unmatchedSamples.length < 50) {
              unmatchedSamples.push(product.name);
            }
          }
        } else {
          targetCategoryId = inneCat.id;
          catName = 'Inne';
          notMatched++;
          if (unmatchedSamples.length < 50) {
            unmatchedSamples.push(product.name);
          }
        }
        
        // Only update if category changed
        if (product.categoryId !== targetCategoryId) {
          updates.push({
            where: { id: product.id },
            data: { categoryId: targetCategoryId }
          });
          categoryStats[catName] = (categoryStats[catName] || 0) + 1;
          reassigned++;
        } else {
          unchanged++;
        }
      }
      
      // Execute batch updates
      for (const update of updates) {
        await prisma.product.update(update);
      }
      
      if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= allProducts.length) {
        console.log(`  Progress: ${Math.min(i + BATCH_SIZE, allProducts.length)}/${allProducts.length}`);
      }
    }
    
    console.log('\n=== SUMMARY ===\n');
    console.log(`Total products: ${allProducts.length}`);
    console.log(`Reassigned: ${reassigned}`);
    console.log(`Unchanged (already correct): ${unchanged}`);
    console.log(`Not matched (to "Inne"): ${notMatched}`);
    
    // Sort stats by count
    const sortedStats = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a);
    
    console.log('\nSubcategories updated (top 30):');
    for (const [cat, count] of sortedStats.slice(0, 30)) {
      console.log(`  ${cat}: ${count}`);
    }
    
    // Show unmatched samples
    if (unmatchedSamples.length > 0) {
      console.log('\n=== SAMPLE UNMATCHED PRODUCTS (first 50) ===\n');
      for (const name of unmatchedSamples) {
        console.log(`  - ${name}`);
      }
    }
    
    // Update category order based on product counts
    console.log('\nStep 4: Updating category visibility...\n');
    
    // Get main categories with their children's product counts
    const mainCategories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: {
        _count: { select: { products: true } },
        children: {
          include: {
            _count: { select: { products: true } }
          }
        }
      }
    });
    
    // Calculate total products per main category (only from children)
    const catTotals = mainCategories.map(cat => {
      // Products in main category shouldn't count (they should be in subcategories)
      const childProducts = cat.children.reduce((sum, child) => sum + child._count.products, 0);
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        directProducts: cat._count.products,
        total: childProducts
      };
    }).filter(c => c.total > 0 && c.slug !== 'inne').sort((a, b) => b.total - a.total);
    
    // Update order for categories with products
    for (let i = 0; i < catTotals.length; i++) {
      await prisma.category.update({
        where: { id: catTotals[i].id },
        data: { order: i + 1 }
      });
    }
    
    // "Inne" always last
    await prisma.category.update({
      where: { slug: 'inne' },
      data: { order: 999 }
    });
    
    // Set order = 0 for empty categories (they won't show in menu)
    const emptyCategories = mainCategories.filter(cat => {
      const total = cat.children.reduce((sum, c) => sum + c._count.products, 0);
      return total === 0 && cat.slug !== 'inne';
    });
    
    for (const cat of emptyCategories) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { order: 0 }
      });
    }
    
    console.log('=== FINAL MAIN CATEGORIES (by products in subcategories) ===\n');
    for (const cat of catTotals) {
      console.log(`  ${cat.name}: ${cat.total} products in subcategories`);
      if (cat.directProducts > 0) {
        console.log(`    ⚠️ WARNING: ${cat.directProducts} products directly in main category!`);
      }
    }
    
    // Show "Inne" separately
    const inneTotal = await prisma.product.count({ where: { categoryId: inneCat.id } });
    console.log(`  ---`);
    console.log(`  Inne: ${inneTotal} products (fallback)`);
    
    // Show top subcategories
    console.log('\n=== TOP 20 SUBCATEGORIES ===\n');
    const topSubcategories = await prisma.category.findMany({
      where: { 
        parentId: { not: null },
        isActive: true 
      },
      include: {
        _count: { select: { products: true } },
        parent: { select: { name: true } }
      },
      orderBy: { _count: { products: 'desc' } },
      take: 20
    });
    
    for (const sub of topSubcategories) {
      if (sub._count.products > 0) {
        console.log(`  ${sub.parent?.name} > ${sub.name}: ${sub._count.products} products`);
      }
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reassignAllProducts();
