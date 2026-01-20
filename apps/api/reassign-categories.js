/**
 * Script to reassign products from "Inne" to correct categories based on keyword matching
 * This is a direct fix without needing to re-sync from Baselinker
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

// Keyword matching function with priority
function matchCategory(productName) {
  const searchText = productName.toLowerCase();
  
  let bestMatch = null;
  let bestPriority = -1;
  
  for (const mainCat of categoryMapping.mainCategories) {
    // Check subcategories first (they have more specific keywords)
    if (mainCat.subcategories) {
      for (const subCat of mainCat.subcategories) {
        const priority = subCat.priority || 0;
        
        // Check exclude keywords
        if (subCat.excludeKeywords) {
          const hasExcluded = subCat.excludeKeywords.some(keyword => 
            searchText.includes(keyword.toLowerCase())
          );
          if (hasExcluded) continue;
        }
        
        // Check keywords
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
    
    // Check main category keywords
    if (mainCat.keywords && !bestMatch) {
      const priority = mainCat.priority || 0;
      
      const hasMatch = mainCat.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      
      if (hasMatch && priority > bestPriority) {
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

async function reassignProducts() {
  console.log('=== REASSIGNING PRODUCTS FROM "INNE" TO CORRECT CATEGORIES ===\n');
  
  try {
    // Get the "Inne" category
    const inneCat = await prisma.category.findUnique({
      where: { slug: 'inne' }
    });
    
    if (!inneCat) {
      console.log('Category "Inne" not found!');
      return;
    }
    
    // Ensure all main categories and subcategories exist
    console.log('Step 1: Creating/updating category structure...\n');
    
    const categoryCache = new Map(); // slug -> category
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
    
    // Get all products in "Inne"
    console.log('\nStep 2: Loading products from "Inne"...\n');
    
    const productsInInne = await prisma.product.findMany({
      where: { categoryId: inneCat.id },
      select: {
        id: true,
        name: true,
        categoryId: true
      }
    });
    
    console.log(`Found ${productsInInne.length} products in "Inne"\n`);
    
    // Reassign products based on keyword matching
    console.log('Step 3: Reassigning products...\n');
    
    let reassigned = 0;
    let notMatched = 0;
    const categoryStats = {};
    
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < productsInInne.length; i += BATCH_SIZE) {
      const batch = productsInInne.slice(i, i + BATCH_SIZE);
      
      const updates = [];
      
      for (const product of batch) {
        const match = matchCategory(product.name);
        
        if (match) {
          const targetSlug = match.sub ? match.sub.slug : match.main.slug;
          const targetCategory = categoryCache.get(targetSlug);
          
          if (targetCategory) {
            updates.push({
              where: { id: product.id },
              data: { categoryId: targetCategory.id }
            });
            
            const catName = match.sub ? `${match.main.name} > ${match.sub.name}` : match.main.name;
            categoryStats[catName] = (categoryStats[catName] || 0) + 1;
            reassigned++;
          } else {
            notMatched++;
          }
        } else {
          notMatched++;
        }
      }
      
      // Execute batch updates
      for (const update of updates) {
        await prisma.product.update(update);
      }
      
      if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= productsInInne.length) {
        console.log(`  Progress: ${Math.min(i + BATCH_SIZE, productsInInne.length)}/${productsInInne.length}`);
      }
    }
    
    console.log('\n=== SUMMARY ===\n');
    console.log(`Reassigned: ${reassigned}`);
    console.log(`Not matched (remains in "Inne"): ${notMatched}`);
    
    // Sort stats by count
    const sortedStats = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a);
    
    console.log('\nTop categories by number of products:');
    for (const [cat, count] of sortedStats.slice(0, 20)) {
      console.log(`  ${cat}: ${count}`);
    }
    
    // Update category order based on product counts
    console.log('\nStep 4: Updating category visibility...\n');
    
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
    
    // Calculate total products per main category
    const catTotals = mainCategories.map(cat => {
      const directProducts = cat._count.products;
      const childProducts = cat.children.reduce((sum, child) => sum + child._count.products, 0);
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        total: directProducts + childProducts
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
    
    // Update order for categories with products
    for (let i = 0; i < catTotals.length; i++) {
      await prisma.category.update({
        where: { id: catTotals[i].id },
        data: { order: i + 1 }
      });
    }
    
    // Set order = 0 for empty categories
    const emptyCategories = mainCategories.filter(cat => {
      const total = cat._count.products + cat.children.reduce((sum, c) => sum + c._count.products, 0);
      return total === 0;
    });
    
    for (const cat of emptyCategories) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { order: 0 }
      });
    }
    
    console.log('Final categories with products:');
    for (const cat of catTotals.slice(0, 15)) {
      console.log(`  ${cat.name}: ${cat.total} products`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reassignProducts();
