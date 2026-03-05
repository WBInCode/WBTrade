/**
 * Skrypt synchronizacji KATEGORII z Baselinker (KROK 1)
 * 
 * Pobiera kategorie z 3 magazynów (HP, LEKER, BTP),
 * tworzy drzewko kategorii z uwzględnieniem separatora "|"
 * 
 * Użycie: npx tsx src/scripts/sync-categories-step1.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

const WAREHOUSE_CONFIG = {
  hp: { prefix: 'hp-', inventoryId: null as string | null, name: 'HP' },
  leker: { prefix: 'leker-', inventoryId: null as string | null, name: 'LEKER' },
  btp: { prefix: 'btp-', inventoryId: null as string | null, name: 'BTP' },
};

const polishCharsMap: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
};

function slugify(text: string): string {
  let result = text.toString();
  for (const [polish, ascii] of Object.entries(polishCharsMap)) {
    result = result.replace(new RegExp(polish, 'g'), ascii);
  }
  return result.toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

interface BaselinkerCategory {
  category_id: number;
  name: string;
  parent_id: number;
}

interface CategoryNode {
  baselinkerCategoryId: string;
  name: string;
  fullPath: string;
  slug: string;
  children: Map<string, CategoryNode>;
}

async function blRequest<T>(method: string, parameters: Record<string, any> = {}): Promise<T> {
  const token = process.env.BASELINKER_API_TOKEN;
  if (!token) throw new Error('BASELINKER_API_TOKEN nie jest ustawiony');

  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));
  
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: { 'X-BLToken': token, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  
  const data = await response.json() as { status: string; error_message?: string } & T;
  if (data.status === 'ERROR') throw new Error(`Baselinker API error: ${data.error_message}`);
  return data;
}

async function getInventories(): Promise<{ inventory_id: number; name: string }[]> {
  const response = await blRequest<{ inventories: { inventory_id: number; name: string }[] }>('getInventories');
  return response.inventories || [];
}

async function getCategories(inventoryId: string): Promise<BaselinkerCategory[]> {
  const response = await blRequest<{ categories: BaselinkerCategory[] }>('getInventoryCategories', {
    inventory_id: parseInt(inventoryId, 10)
  });
  return response.categories || [];
}

function buildCategoryTree(categories: BaselinkerCategory[]): Map<string, CategoryNode> {
  const tree = new Map<string, CategoryNode>();
  
  for (const cat of categories) {
    const parts = cat.name.split('|').map(p => p.trim());
    const categoryId = cat.category_id.toString(); // Bez prefiksu - kategorie są wspólne!
    
    let mainNode = tree.get(parts[0]);
    if (!mainNode) {
      mainNode = {
        baselinkerCategoryId: parts.length === 1 ? categoryId : '',
        name: parts[0],
        fullPath: parts[0],
        slug: slugify(parts[0]),
        children: new Map(),
      };
      tree.set(parts[0], mainNode);
    }
    
    if (parts.length === 1) {
      mainNode.baselinkerCategoryId = categoryId;
    }
    
    if (parts.length > 1) {
      let currentNode = mainNode;
      for (let i = 1; i < parts.length; i++) {
        const partName = parts[i];
        const partPath = parts.slice(0, i + 1).join('|');
        const isLast = i === parts.length - 1;
        
        let childNode = currentNode.children.get(partName);
        if (!childNode) {
          childNode = {
            baselinkerCategoryId: isLast ? categoryId : '',
            name: partName,
            fullPath: partPath,
            slug: slugify(partName),
            children: new Map(),
          };
          currentNode.children.set(partName, childNode);
        }
        if (isLast) childNode.baselinkerCategoryId = categoryId;
        currentNode = childNode;
      }
    }
  }
  return tree;
}

function mergeCategoryTrees(trees: Map<string, CategoryNode>[]): Map<string, CategoryNode> {
  const merged = new Map<string, CategoryNode>();
  
  for (const tree of trees) {
    for (const [mainName, node] of tree) {
      if (!merged.has(mainName)) {
        merged.set(mainName, { ...node, children: new Map(node.children) });
      } else {
        const existing = merged.get(mainName)!;
        for (const [childName, childNode] of node.children) {
          if (!existing.children.has(childName)) {
            existing.children.set(childName, childNode);
          } else {
            // Merge deeper levels
            const existingChild = existing.children.get(childName)!;
            for (const [grandName, grandNode] of childNode.children) {
              if (!existingChild.children.has(grandName)) {
                existingChild.children.set(grandName, grandNode);
              }
            }
          }
        }
        if (!existing.baselinkerCategoryId && node.baselinkerCategoryId) {
          existing.baselinkerCategoryId = node.baselinkerCategoryId;
        }
      }
    }
  }
  return merged;
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (counter < 10000) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return `${baseSlug}-${Date.now()}`;
}

async function syncCategoryToDb(
  node: CategoryNode,
  parentId: string | null,
  dryRun: boolean,
  depth: number = 0
): Promise<string | null> {
  const indent = '  '.repeat(depth + 1);
  
  console.log(`${indent}📁 ${node.name} (${node.baselinkerCategoryId || 'no-id'})`);
  
  if (dryRun) {
    for (const [, childNode] of node.children) {
      await syncCategoryToDb(childNode, `dry-run-${node.slug}`, dryRun, depth + 1);
    }
    return `dry-run-${node.slug}`;
  }
  
  // Szukaj istniejącej kategorii
  let existingCategory = null;
  if (node.baselinkerCategoryId) {
    existingCategory = await prisma.category.findUnique({
      where: { baselinkerCategoryId: node.baselinkerCategoryId },
    });
  }
  if (!existingCategory) {
    existingCategory = await prisma.category.findFirst({
      where: { baselinkerCategoryPath: node.fullPath },
    });
  }
  
  let categoryId: string;
  
  if (existingCategory) {
    const updated = await prisma.category.update({
      where: { id: existingCategory.id },
      data: {
        name: node.name,
        parentId,
        baselinkerCategoryPath: node.fullPath,
        baselinkerCategoryId: node.baselinkerCategoryId || existingCategory.baselinkerCategoryId,
        isActive: true,
      },
    });
    categoryId = updated.id;
    console.log(`${indent}  ✓ Zaktualizowano`);
  } else {
    const slug = await ensureUniqueSlug(node.slug);
    const created = await prisma.category.create({
      data: {
        name: node.name,
        slug,
        parentId,
        baselinkerCategoryId: node.baselinkerCategoryId || undefined,
        baselinkerCategoryPath: node.fullPath,
        isActive: true,
      },
    });
    categoryId = created.id;
    console.log(`${indent}  ✓ Utworzono nową`);
  }
  
  for (const [, childNode] of node.children) {
    await syncCategoryToDb(childNode, categoryId, dryRun, depth + 1);
  }
  
  return categoryId;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  
  console.log('═'.repeat(80));
  console.log('🔄 KROK 1: SYNCHRONIZACJA KATEGORII Z BASELINKER');
  console.log('═'.repeat(80));
  console.log(`📋 Dry-run: ${isDryRun ? 'TAK (bez zmian w bazie)' : 'NIE'}`);
  console.log('─'.repeat(80));
  
  try {
    // 1. Pobierz magazyny
    console.log('\n📦 Pobieranie listy magazynów...');
    const inventories = await getInventories();
    
    for (const inv of inventories) {
      const name = inv.name.toLowerCase();
      if (name.includes('hp') || name === 'hp') {
        WAREHOUSE_CONFIG.hp.inventoryId = inv.inventory_id.toString();
        console.log(`   ✓ HP: ${inv.inventory_id}`);
      } else if (name.includes('leker')) {
        WAREHOUSE_CONFIG.leker.inventoryId = inv.inventory_id.toString();
        console.log(`   ✓ LEKER: ${inv.inventory_id}`);
      } else if (name.includes('btp')) {
        WAREHOUSE_CONFIG.btp.inventoryId = inv.inventory_id.toString();
        console.log(`   ✓ BTP: ${inv.inventory_id}`);
      }
    }
    
    // 2. Pobierz kategorie (z jednego magazynu - są wspólne dla wszystkich)
    console.log('\n📂 Pobieranie kategorii z Baselinker...');
    
    // Użyj pierwszego dostępnego magazynu - kategorie są wspólne
    const firstInventoryId = WAREHOUSE_CONFIG.hp.inventoryId || 
                             WAREHOUSE_CONFIG.leker.inventoryId || 
                             WAREHOUSE_CONFIG.btp.inventoryId;
    
    if (!firstInventoryId) {
      throw new Error('Nie znaleziono żadnego magazynu');
    }
    
    const categories = await getCategories(firstInventoryId);
    console.log(`   Znaleziono ${categories.length} kategorii`);
    
    // 3. Buduj drzewko kategorii
    console.log('\n🌳 Budowanie drzewka kategorii...');
    const mergedTree = buildCategoryTree(categories);
    console.log(`   Kategorie główne: ${mergedTree.size}`);
    
    let totalSubcategories = 0;
    let totalLevel3 = 0;
    for (const [, node] of mergedTree) {
      totalSubcategories += node.children.size;
      for (const [, child] of node.children) {
        totalLevel3 += child.children.size;
      }
    }
    console.log(`   Podkategorie (poziom 2): ${totalSubcategories}`);
    console.log(`   Podkategorie (poziom 3): ${totalLevel3}`);
    
    // 4. Synchronizuj do bazy
    console.log('\n💾 Synchronizacja kategorii do bazy danych...');
    let created = 0;
    let updated = 0;
    
    for (const [, node] of mergedTree) {
      await syncCategoryToDb(node, null, isDryRun);
    }
    
    // 5. Podsumowanie
    const totalCategories = await prisma.category.count();
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ KROK 1 ZAKOŃCZONY');
    console.log('═'.repeat(80));
    console.log(`   Kategorie w bazie: ${totalCategories}`);
    
    if (isDryRun) {
      console.log('\n   ℹ️ To był dry-run - żadne zmiany nie zostały zapisane.');
    } else {
      console.log('\n   ➡️ Teraz uruchom KROK 2: npx tsx src/scripts/sync-categories-step2.ts');
    }
    
  } catch (error) {
    console.error('\n❌ Błąd:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
