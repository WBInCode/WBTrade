/**
 * Skrypt synchronizacji PRODUKTÓW do kategorii (KROK 2)
 * 
 * Przypisuje produkty do kategorii na podstawie danych z Baselinker
 * 
 * Użycie: npx tsx src/scripts/sync-categories-step2.ts [--dry-run] [--limit N]
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

interface BaselinkerCategory {
  category_id: number;
  name: string;
  parent_id: number;
}

interface BaselinkerProduct {
  id: number;
  sku: string;
  category_id: number;
  name: string;
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

async function getProductsList(inventoryId: string, page: number = 1): Promise<BaselinkerProduct[]> {
  const response = await blRequest<{ products: Record<string, BaselinkerProduct> }>('getInventoryProductsList', {
    inventory_id: parseInt(inventoryId, 10),
    page
  });
  return Object.entries(response.products || {}).map(([id, product]) => ({
    ...product,
    id: parseInt(id, 10),
  }));
}

async function getProductsData(inventoryId: string, productIds: number[]): Promise<BaselinkerProduct[]> {
  if (productIds.length === 0) return [];
  
  const CHUNK_SIZE = 500;
  const allProducts: BaselinkerProduct[] = [];
  
  for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
    const chunk = productIds.slice(i, i + CHUNK_SIZE);
    const percent = Math.round((i / productIds.length) * 100);
    process.stdout.write(`\r      Pobieranie danych: ${percent}% (${i}/${productIds.length})...`);
    
    const response = await blRequest<{ products: Record<string, BaselinkerProduct> }>('getInventoryProductsData', {
      inventory_id: parseInt(inventoryId, 10),
      products: chunk
    });
    
    const products = Object.entries(response.products || {}).map(([id, product]) => ({
      ...product,
      id: parseInt(id, 10),
    }));
    allProducts.push(...products);
    
    if (i + CHUNK_SIZE < productIds.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  
  console.log(`\r      Pobrano dane dla ${allProducts.length} produktów                    `);
  return allProducts;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1], 10) : undefined;
  
  console.log('═'.repeat(80));
  console.log('🔄 KROK 2: PRZYPISYWANIE PRODUKTÓW DO KATEGORII');
  console.log('═'.repeat(80));
  console.log(`📋 Dry-run: ${isDryRun ? 'TAK (bez zmian w bazie)' : 'NIE'}`);
  if (limit) console.log(`📋 Limit: ${limit} produktów na magazyn`);
  console.log('─'.repeat(80));
  
  try {
    // 1. Załaduj wszystkie kategorie z bazy
    console.log('\n📂 Ładowanie kategorii z bazy danych...');
    const allDbCategories = await prisma.category.findMany({
      select: { id: true, baselinkerCategoryId: true, baselinkerCategoryPath: true },
    });
    
    const categoryByBlId = new Map<string, string>();
    const categoryByPath = new Map<string, string>();
    
    for (const cat of allDbCategories) {
      if (cat.baselinkerCategoryId) categoryByBlId.set(cat.baselinkerCategoryId, cat.id);
      if (cat.baselinkerCategoryPath) categoryByPath.set(cat.baselinkerCategoryPath, cat.id);
    }
    
    console.log(`   Załadowano ${allDbCategories.length} kategorii`);
    console.log(`   - po baselinkerCategoryId: ${categoryByBlId.size}`);
    console.log(`   - po baselinkerCategoryPath: ${categoryByPath.size}`);
    
    // 2. Pobierz magazyny
    console.log('\n📦 Pobieranie listy magazynów...');
    const inventories = await getInventories();
    
    for (const inv of inventories) {
      const name = inv.name.toLowerCase();
      if (name.includes('hp') || name === 'hp') {
        WAREHOUSE_CONFIG.hp.inventoryId = inv.inventory_id.toString();
      } else if (name.includes('leker')) {
        WAREHOUSE_CONFIG.leker.inventoryId = inv.inventory_id.toString();
      } else if (name.includes('btp')) {
        WAREHOUSE_CONFIG.btp.inventoryId = inv.inventory_id.toString();
      }
    }
    
    // 3. Przetwarzaj każdy magazyn
    let totalUpdated = 0;
    let totalNotFound = 0;
    let totalNoCategory = 0;
    
    for (const [key, config] of Object.entries(WAREHOUSE_CONFIG)) {
      if (!config.inventoryId) continue;
      
      console.log(`\n📦 ${config.name}:`);
      
      // Pobierz kategorie z tego magazynu
      const blCategories = await getCategories(config.inventoryId);
      const categoryMap = new Map<number, string>();
      for (const cat of blCategories) {
        categoryMap.set(cat.category_id, cat.name);
      }
      console.log(`   Załadowano ${blCategories.length} kategorii z Baselinker`);
      
      // Pobierz listę produktów
      let productsList: BaselinkerProduct[] = [];
      let page = 1;
      
      console.log(`   Pobieranie listy produktów...`);
      while (true) {
        const pageProducts = await getProductsList(config.inventoryId, page);
        productsList.push(...pageProducts);
        
        if (limit && productsList.length >= limit) {
          productsList = productsList.slice(0, limit);
          break;
        }
        
        if (pageProducts.length < 1000) break;
        page++;
        await new Promise(r => setTimeout(r, 500));
      }
      console.log(`   Znaleziono ${productsList.length} produktów`);
      
      // Pobierz pełne dane produktów
      const productIds = productsList.map(p => p.id);
      const products = await getProductsData(config.inventoryId, productIds);
      
      // Aktualizuj produkty
      console.log(`   Aktualizacja kategorii produktów...`);
      let updated = 0;
      let notFound = 0;
      let noCategory = 0;
      let lastLog = 0;
      
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const baselinkerProductId = `${config.prefix}${product.id}`;
        const categoryPath = categoryMap.get(product.category_id) || '';
        
        // Progress
        if (i - lastLog >= 500 || i === products.length - 1) {
          const percent = Math.round((i + 1) / products.length * 100);
          process.stdout.write(`\r      Postęp: ${percent}% (${i + 1}/${products.length}) | OK: ${updated} | Brak prod: ${notFound} | Brak kat: ${noCategory}`);
          lastLog = i;
        }
        
        // Znajdź kategorię w bazie (bez prefiksu - kategorie są wspólne!)
        let categoryId: string | null = null;
        if (product.category_id && categoryPath) {
          const blCategoryId = product.category_id.toString(); // Bez prefiksu
          categoryId = categoryByBlId.get(blCategoryId) || categoryByPath.get(categoryPath) || null;
        }
        
        if (!categoryId) {
          noCategory++;
          continue;
        }
        
        if (!isDryRun) {
          const result = await prisma.product.updateMany({
            where: { baselinkerProductId },
            data: {
              categoryId,
              baselinkerCategoryPath: categoryPath,
            },
          });
          
          if (result.count > 0) {
            updated++;
          } else {
            notFound++;
          }
        } else {
          // W dry-run sprawdź czy produkt istnieje
          const exists = await prisma.product.findUnique({
            where: { baselinkerProductId },
            select: { id: true }
          });
          if (exists) updated++;
          else notFound++;
        }
      }
      
      console.log(''); // Nowa linia
      console.log(`   ✓ Zaktualizowano: ${updated}`);
      console.log(`   ⚠️ Nie znaleziono w bazie: ${notFound}`);
      console.log(`   ⚠️ Brak kategorii: ${noCategory}`);
      
      totalUpdated += updated;
      totalNotFound += notFound;
      totalNoCategory += noCategory;
    }
    
    // 4. Podsumowanie
    console.log('\n' + '═'.repeat(80));
    console.log('✅ KROK 2 ZAKOŃCZONY');
    console.log('═'.repeat(80));
    console.log(`   Produkty zaktualizowane: ${totalUpdated}`);
    console.log(`   Produkty nieznalezione: ${totalNotFound}`);
    console.log(`   Produkty bez kategorii: ${totalNoCategory}`);
    
    if (isDryRun) {
      console.log('\n   ℹ️ To był dry-run - żadne zmiany nie zostały zapisane.');
    }
    
    // Statystyki końcowe
    const productsWithCategory = await prisma.product.count({ where: { categoryId: { not: null } } });
    const productsWithoutCategory = await prisma.product.count({ where: { categoryId: null } });
    
    console.log(`\n📊 STATYSTYKI BAZY:`);
    console.log(`   Produkty z kategorią: ${productsWithCategory}`);
    console.log(`   Produkty bez kategorii: ${productsWithoutCategory}`);
    
  } catch (error) {
    console.error('\n❌ Błąd:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
