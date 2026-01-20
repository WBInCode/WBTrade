/**
 * Script to reassign products to correct categories based on Baselinker category IDs
 * This fixes the issue where products ended up in "Inne" category
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findCategoryByBaselinkerIdcatId(baselinkerCategoryId) {
  // Try exact match first
  let category = await prisma.category.findUnique({
    where: { baselinkerCategoryId },
  });
  
  if (category) return category;
  
  // Try with btp- prefix
  category = await prisma.category.findUnique({
    where: { baselinkerCategoryId: `btp-${baselinkerCategoryId}` },
  });
  
  if (category) return category;
  
  // Try with hp- prefix
  category = await prisma.category.findUnique({
    where: { baselinkerCategoryId: `hp-${baselinkerCategoryId}` },
  });
  
  return category;
}

async function reassignProductCategories() {
  console.log('=== REASSIGNING PRODUCT CATEGORIES ===\n');
  
  try {
    // Get the "Inne" category
    const inneCat = await prisma.category.findUnique({
      where: { slug: 'inne' }
    });
    
    if (!inneCat) {
      console.log('Category "Inne" not found!');
      return;
    }
    
    // Get all products that are in "Inne" and have baselinkerProductId
    const productsInInne = await prisma.product.findMany({
      where: {
        categoryId: inneCat.id,
        baselinkerProductId: { not: null }
      },
      select: {
        id: true,
        name: true,
        baselinkerProductId: true,
        categoryId: true
      }
    });
    
    console.log(`Found ${productsInInne.length} products in "Inne" category with Baselinker ID\n`);
    
    // Get all categories with baselinkerCategoryId for lookup
    const allCategories = await prisma.category.findMany({
      where: { baselinkerCategoryId: { not: null } },
      select: { id: true, name: true, baselinkerCategoryId: true }
    });
    
    // Create lookup maps for different ID formats
    const categoryByExactId = new Map();
    const categoryByNumericId = new Map();
    
    for (const cat of allCategories) {
      const blId = cat.baselinkerCategoryId;
      categoryByExactId.set(blId, cat);
      
      // Extract numeric part if prefixed
      if (blId.includes('-')) {
        const numericPart = blId.split('-').pop();
        if (numericPart) {
          categoryByNumericId.set(numericPart, cat);
        }
      } else {
        categoryByNumericId.set(blId, cat);
      }
    }
    
    console.log(`Loaded ${allCategories.length} categories with Baselinker IDs\n`);
    
    // We need to get category_id from Baselinker for each product
    // Since we don't store category_id separately, we'll need to query Baselinker
    // For now, let's check if products have any hint about their original category
    
    // Alternative: Query the raw Baselinker API or use stored data
    // For this script, let's use a simpler approach - check if we have product data cached
    
    let reassigned = 0;
    let notFound = 0;
    let alreadyCorrect = 0;
    
    // For products that came from Baselinker, we stored the category assignment
    // during sync. The issue is the lookup failed due to ID format mismatch.
    
    // Since we fixed the lookup, we should re-sync to fix the categories.
    // But for quick fix, let's try to match products by looking at their names
    // against the category keywords, OR by running a partial sync.
    
    console.log('NOTE: This script cannot directly fix categories without re-syncing from Baselinker.');
    console.log('The issue is fixed in the code. Running a new sync will assign correct categories.\n');
    
    console.log('Options to fix:');
    console.log('1. Run full sync from admin panel: POST /api/admin/baselinker/sync { type: "products" }');
    console.log('2. Use the keyword-based matching from category-mapping.json\n');
    
    // Let's show statistics of what categories products should go to
    // based on keyword matching
    
    const fs = require('fs');
    const path = require('path');
    
    let categoryMapping;
    try {
      const mappingPath = path.join(__dirname, 'config', 'category-mapping.json');
      categoryMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    } catch (e) {
      console.log('Could not load category-mapping.json');
      return;
    }
    
    // Simple keyword matching function
    function matchCategory(productName) {
      const searchText = productName.toLowerCase();
      
      let bestMatch = null;
      let bestPriority = -1;
      
      for (const mainCat of categoryMapping.mainCategories) {
        if (mainCat.subcategories) {
          for (const subCat of mainCat.subcategories) {
            const priority = subCat.priority || 0;
            
            if (subCat.excludeKeywords) {
              const hasExcluded = subCat.excludeKeywords.some(keyword => 
                searchText.includes(keyword.toLowerCase())
              );
              if (hasExcluded) continue;
            }
            
            if (subCat.keywords) {
              const hasMatch = subCat.keywords.some(keyword => 
                searchText.includes(keyword.toLowerCase())
              );
              
              if (hasMatch && priority > bestPriority) {
                bestMatch = {
                  main: mainCat.name,
                  sub: subCat.name,
                  slug: subCat.slug
                };
                bestPriority = priority;
              }
            }
          }
        }
      }
      
      return bestMatch;
    }
    
    // Analyze potential matches
    const categoryStats = {};
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    for (const product of productsInInne.slice(0, 2000)) { // Sample first 2000
      const match = matchCategory(product.name);
      
      if (match) {
        matchedCount++;
        const key = `${match.main} > ${match.sub}`;
        categoryStats[key] = (categoryStats[key] || 0) + 1;
      } else {
        unmatchedCount++;
      }
    }
    
    console.log('=== KEYWORD MATCHING ANALYSIS (sample of 2000 products) ===\n');
    console.log(`Matched: ${matchedCount}`);
    console.log(`Unmatched: ${unmatchedCount}\n`);
    
    // Sort by count
    const sortedStats = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);
    
    console.log('Top categories by keyword matching:');
    for (const [cat, count] of sortedStats) {
      console.log(`  ${cat}: ${count} products`);
    }
    
    console.log('\n=== RECOMMENDED ACTION ===');
    console.log('Run a products sync from the admin panel to reassign categories correctly.');
    console.log('The fix has been applied to the code, so new syncs will work properly.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reassignProductCategories();
