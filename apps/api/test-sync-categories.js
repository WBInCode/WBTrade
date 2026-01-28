/**
 * Test synchronizacji kategorii z nową logiką (separator |)
 * Uruchamia syncCategories z baselinker.service.ts
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
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

// Polish character transliteration map
const polishCharsMap = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
};

function slugify(text) {
  let result = text.toString();
  for (const [polish, ascii] of Object.entries(polishCharsMap)) {
    result = result.replace(new RegExp(polish, 'g'), ascii);
  }
  
  return result
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function ensureUniqueSlug(baseSlug, baselinkerCategoryId) {
  let slug = baseSlug;
  let counter = 1;

  while (counter < 10000) {
    const existing = await prisma.category.findUnique({
      where: { slug },
    });

    if (!existing || existing.baselinkerCategoryId === baselinkerCategoryId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return `${baseSlug}-${Date.now()}`;
}

async function syncCategories(inventoryId) {
  const errors = [];
  let processed = 0;
  let skipped = 0;

  try {
    const categoriesResp = await blRequest('getInventoryCategories', {
      inventory_id: parseInt(inventoryId)
    });
    
    const categories = categoriesResp.categories || [];
    console.log(`[Sync] Pobrano ${categories.length} kategorii z Baselinker`);

    // Pre-fetch existing categories
    const existingCategories = await prisma.category.findMany({
      where: { baselinkerCategoryId: { not: null } },
      select: {
        id: true,
        baselinkerCategoryId: true,
        baselinkerCategoryPath: true,
        name: true,
        slug: true,
        parentId: true,
      },
    });
    
    const existingMap = new Map(
      existingCategories.map(c => [c.baselinkerCategoryId, c])
    );

    // Map to store main category name -> category id
    const mainCategoryMap = new Map();
    
    // First, process main categories (those without | in name OR parent_id = 0)
    const mainCategories = categories.filter(c => 
      !c.name.includes('|') || c.parent_id === 0
    );
    
    console.log(`[Sync] Znaleziono ${mainCategories.length} kategorii głównych (bez separatora |)`);

    // Process main categories first
    for (const blCategory of mainCategories) {
      const categoryId = blCategory.category_id.toString();
      const categoryName = blCategory.name.trim();
      const existing = existingMap.get(categoryId);
      
      // Check if unchanged
      if (existing && existing.name === categoryName && existing.parentId === null) {
        mainCategoryMap.set(categoryName, existing.id);
        skipped++;
        continue;
      }
      
      try {
        const slug = slugify(categoryName) || `category-${categoryId}`;
        
        const result = await prisma.category.upsert({
          where: { baselinkerCategoryId: categoryId },
          update: {
            name: categoryName,
            slug: await ensureUniqueSlug(slug, categoryId),
            parentId: null,
            baselinkerCategoryPath: categoryName,
          },
          create: {
            baselinkerCategoryId: categoryId,
            name: categoryName,
            slug: await ensureUniqueSlug(slug, categoryId),
            parentId: null,
            baselinkerCategoryPath: categoryName,
            isActive: true,
          },
        });
        
        mainCategoryMap.set(categoryName, result.id);
        processed++;
        console.log(`  ✅ Główna: "${categoryName}" (ID: ${result.id})`);
      } catch (error) {
        errors.push(`Main category ${categoryId} (${categoryName}): ${error.message}`);
        console.log(`  ❌ Błąd: "${categoryName}": ${error.message}`);
      }
    }

    // Now process subcategories (those with | separator)
    const subCategories = categories.filter(c => c.name.includes('|'));
    console.log(`\n[Sync] Znaleziono ${subCategories.length} podkategorii (z separatorem |)`);

    for (const blCategory of subCategories) {
      const categoryId = blCategory.category_id.toString();
      const fullPath = blCategory.name.trim();
      
      // Parse the category path
      const parts = fullPath.split('|').map(p => p.trim());
      const mainCategoryName = parts[0];
      const subCategoryName = parts.slice(1).join('|');
      
      const existing = existingMap.get(categoryId);
      
      // Find parent category by name
      let parentId = mainCategoryMap.get(mainCategoryName) || null;
      
      // If parent not found in map, try to find by name in DB
      if (!parentId) {
        const parentCategory = await prisma.category.findFirst({
          where: { 
            name: mainCategoryName,
            parentId: null,
          },
        });
        if (parentCategory) {
          parentId = parentCategory.id;
          mainCategoryMap.set(mainCategoryName, parentId);
        }
      }
      
      // Check if unchanged
      if (existing && 
          existing.name === subCategoryName && 
          existing.parentId === parentId &&
          existing.baselinkerCategoryPath === fullPath) {
        skipped++;
        continue;
      }
      
      try {
        const slug = slugify(subCategoryName) || `subcategory-${categoryId}`;
        
        const result = await prisma.category.upsert({
          where: { baselinkerCategoryId: categoryId },
          update: {
            name: subCategoryName,
            slug: await ensureUniqueSlug(slug, categoryId),
            parentId: parentId,
            baselinkerCategoryPath: fullPath,
          },
          create: {
            baselinkerCategoryId: categoryId,
            name: subCategoryName,
            slug: await ensureUniqueSlug(slug, categoryId),
            parentId: parentId,
            baselinkerCategoryPath: fullPath,
            isActive: true,
          },
        });
        
        processed++;
        
        if (!parentId) {
          console.log(`  ⚠️ Podkategoria bez rodzica: "${subCategoryName}" (główna: "${mainCategoryName}")`);
        } else {
          console.log(`  ✅ Podkategoria: "${mainCategoryName}" → "${subCategoryName}"`);
        }
      } catch (error) {
        errors.push(`Subcategory ${categoryId} (${fullPath}): ${error.message}`);
        console.log(`  ❌ Błąd: "${fullPath}": ${error.message}`);
      }
    }
    
    console.log(`\n[Sync] Synchronizacja zakończona.`);
    console.log(`  Przetworzone: ${processed}`);
    console.log(`  Pominięte (bez zmian): ${skipped}`);
    console.log(`  Błędy: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nBłędy:');
      errors.forEach(e => console.log(`  - ${e}`));
    }
  } catch (error) {
    errors.push(`Failed to fetch categories: ${error.message}`);
    console.error('Błąd główny:', error);
  }

  return { processed, errors, skipped };
}

async function showCategoryTree() {
  console.log('\n═'.repeat(80));
  console.log('📊 DRZEWKO KATEGORII W BAZIE DANYCH');
  console.log('═'.repeat(80));
  
  const mainCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: 'asc' },
    include: {
      children: {
        orderBy: { name: 'asc' },
      },
      _count: {
        select: { products: true }
      }
    }
  });
  
  for (const main of mainCategories) {
    console.log(`\n📁 ${main.name} (${main._count.products} produktów)`);
    console.log(`   ID: ${main.id} | BL ID: ${main.baselinkerCategoryId} | Slug: ${main.slug}`);
    
    for (const sub of main.children) {
      const subCount = await prisma.product.count({ where: { categoryId: sub.id } });
      console.log(`   └─ ${sub.name} (${subCount} produktów)`);
      console.log(`      ID: ${sub.id} | BL ID: ${sub.baselinkerCategoryId}`);
      console.log(`      Path: ${sub.baselinkerCategoryPath}`);
    }
  }
}

async function main() {
  console.log('=== TEST SYNCHRONIZACJI KATEGORII Z NOWĄ LOGIKĄ ===\n');
  
  // Get inventory ID
  const invResp = await blRequest('getInventories');
  const inventories = invResp.inventories || [];
  console.log('Dostępne magazyny:', inventories.map(i => `${i.name} (${i.inventory_id})`).join(', '));
  
  // Use HP inventory (22954) for test
  const inventoryId = '22954';
  console.log(`\nUżywam magazynu HP (ID: ${inventoryId})\n`);
  
  // Sync categories
  await syncCategories(inventoryId);
  
  // Show category tree
  await showCategoryTree();
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
