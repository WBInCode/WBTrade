/**
 * Skrypt przypisywania kategorii do produktów HP na Baselinkerze
 * 
 * 1. Ładuje CSV z Hurtowni Przemysłowej (SKU → kategoria HP)
 * 2. Ładuje hp-category-mapping.json (kategoria HP → slug kategorii sklepu)
 * 3. Ładuje mapowanie slug → baselinkerCategoryId z bazy danych
 * 4. Pobiera produkty HP z Baselinkera bez kategorii (category_id = 0)
 * 5. Aktualizuje category_id na Baselinkerze przez addInventoryProduct
 * 
 * Użycie: npx tsx src/scripts/assign-hp-categories-baselinker.ts --csv <ścieżka> [--dry-run] [--limit N]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const API_TOKEN = process.env.BASELINKER_API_TOKEN!;
const HP_INVENTORY_ID = 22954;
const PRODUCTS_PER_PAGE = 1000;

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;
const csvIndex = args.indexOf('--csv');
const csvPath = csvIndex !== -1 ? args[csvIndex + 1] : null;

interface MappingTarget {
  subSlug: string;
  comment: string;
}

// ═══════════════════════════════════════════════════════════════════
// Baselinker API helpers
// ═══════════════════════════════════════════════════════════════════

let requestCount = 0;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function blRequest(method: string, params: Record<string, any> = {}): Promise<any> {
  requestCount++;
  
  // Rate limiting: max ~30 requests/minute = 1 request per 2 seconds
  if (requestCount > 1) {
    await sleep(2100);
  }
  
  for (let attempt = 0; attempt < 5; attempt++) {
    const formData = new URLSearchParams();
    formData.append('method', method);
    formData.append('parameters', JSON.stringify(params));

    const response = await fetch(BASELINKER_API_URL, {
      method: 'POST',
      headers: {
        'X-BLToken': API_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    
    if (data.status === 'ERROR') {
      if (data.error_message?.includes('Query limit exceeded') || data.error_message?.includes('token blocked')) {
        const match = data.error_message.match(/until (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        let waitMs = 65000;
        if (match) {
          waitMs = Math.max(new Date(match[1]).getTime() - Date.now() + 5000, 10000);
        }
        console.warn(`   ⏳ Rate limit. Czekam ${Math.round(waitMs / 1000)}s...`);
        await sleep(waitMs);
        continue;
      }
      throw new Error(`BL API Error: ${data.error_message}`);
    }
    
    return data;
  }
  throw new Error('BL API: max retries exceeded');
}

// ═══════════════════════════════════════════════════════════════════
// Data loading
// ═══════════════════════════════════════════════════════════════════

function loadMapping(): Map<string, MappingTarget> {
  const mappingPath = path.join(__dirname, '../../config/hp-category-mapping.json');
  const raw = fs.readFileSync(mappingPath, 'utf-8');
  const data = JSON.parse(raw);
  
  const map = new Map<string, MappingTarget>();
  for (const [prefix, target] of Object.entries(data.mapping)) {
    if (prefix === '_comment') continue;
    map.set(prefix, target as MappingTarget);
  }
  return map;
}

function loadCsvCategories(filePath: string): Map<string, string> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const map = new Map<string, string>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const semicolonIdx = line.indexOf(';');
    if (semicolonIdx === -1) continue;
    
    const sku = line.substring(0, semicolonIdx).trim();
    const rest = line.substring(semicolonIdx + 1);
    const secondSemicolon = rest.indexOf(';');
    const category = secondSemicolon !== -1 
      ? rest.substring(0, secondSemicolon).trim()
      : rest.trim();
    
    if (sku && category) {
      // Remove quotes and store by SKU number (without prefix)
      map.set(sku, category.replace(/"/g, '').trim());
    }
  }
  return map;
}

function findMapping(hpCategoryPath: string, mappingRules: Map<string, MappingTarget>): MappingTarget | null {
  let bestMatch: MappingTarget | null = null;
  let bestLen = 0;
  
  for (const [prefix, target] of mappingRules) {
    if (hpCategoryPath === prefix || hpCategoryPath.startsWith(prefix + '/')) {
      if (prefix.length > bestLen) {
        bestMatch = target;
        bestLen = prefix.length;
      }
    }
  }
  return bestMatch;
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

async function main() {
  if (!csvPath) {
    console.error('❌ Brak ścieżki do CSV. Użycie: npx tsx src/scripts/assign-hp-categories-baselinker.ts --csv <ścieżka> [--dry-run]');
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Plik CSV nie istnieje: ${csvPath}`);
    process.exit(1);
  }
  if (!API_TOKEN) {
    console.error('❌ Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  console.log('🔄 Przypisywanie kategorii HP na Baselinkerze');
  console.log(`   Mode: ${dryRun ? '🧪 DRY-RUN (bez zmian)' : '✏️  ZAPIS na Baselinker'}`);
  console.log(`   CSV: ${csvPath}`);
  console.log(`   Inventory: HP (ID: ${HP_INVENTORY_ID})`);
  if (limit) console.log(`   Limit: ${limit} produktów`);
  console.log('');

  // 1. Load CSV
  const csvCategories = loadCsvCategories(csvPath);
  console.log(`📄 CSV: ${csvCategories.size} produktów`);

  // 2. Load HP → store slug mapping
  const mappingRules = loadMapping();
  console.log(`📋 Reguły mapowania: ${mappingRules.size}`);

  // 3. Load slug → baselinkerCategoryId from DB
  const dbCategories = await prisma.category.findMany({
    select: { slug: true, name: true, baselinkerCategoryId: true, parentId: true, parent: { select: { name: true } } },
    where: { baselinkerCategoryId: { not: null } },
  });
  const slugToBLCatId = new Map<string, { blCatId: string; name: string }>();
  for (const cat of dbCategories) {
    if (cat.baselinkerCategoryId) {
      const fullName = cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name;
      slugToBLCatId.set(cat.slug, { blCatId: cat.baselinkerCategoryId, name: fullName });
    }
  }
  console.log(`🗄️  Slug → BL category ID: ${slugToBLCatId.size} mapowań`);

  // 4. Fetch ALL HP product IDs from Baselinker (paginated list)
  console.log('\n📦 Krok 1: Pobieranie listy ID produktów HP z Baselinkera...');
  const allProductIds: number[] = [];
  const productSkuById = new Map<number, string>();
  const productNameById = new Map<number, string>();
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const resp = await blRequest('getInventoryProductsList', { inventory_id: HP_INVENTORY_ID, page });
    const products = resp.products || {};
    const entries = Object.entries(products);
    
    for (const [id, p] of entries as [string, any][]) {
      const numId = parseInt(id, 10);
      allProductIds.push(numId);
      productSkuById.set(numId, p.sku || '');
      productNameById.set(numId, p.name || '');
    }
    
    console.log(`   Strona ${page}: ${entries.length} produktów (łącznie: ${allProductIds.length})`);
    hasMore = entries.length === PRODUCTS_PER_PAGE;
    page++;
  }

  console.log(`   Łącznie produktów HP: ${allProductIds.length}`);

  // 5. Fetch detailed data in batches to get real category_id
  console.log('\n🔍 Krok 2: Sprawdzanie category_id (getInventoryProductsData)...');
  const withoutCategory: { id: number; sku: string; name: string }[] = [];
  let withCategoryCount = 0;
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < allProductIds.length; i += BATCH_SIZE) {
    const batch = allProductIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allProductIds.length / BATCH_SIZE);
    
    const resp = await blRequest('getInventoryProductsData', {
      inventory_id: HP_INVENTORY_ID,
      products: batch,
    });
    
    const productsData = resp.products || {};
    for (const [id, data] of Object.entries(productsData) as [string, any][]) {
      const numId = parseInt(id, 10);
      const catId = data.category_id || 0;
      
      if (!catId || catId === 0) {
        withoutCategory.push({
          id: numId,
          sku: data.sku || productSkuById.get(numId) || '',
          name: data.name || productNameById.get(numId) || '',
        });
      } else {
        withCategoryCount++;
      }
    }
    
    console.log(`   Batch ${batchNum}/${totalBatches}: sprawdzono ${Math.min(i + BATCH_SIZE, allProductIds.length)}/${allProductIds.length} | bez kategorii: ${withoutCategory.length}`);
  }
  
  console.log(`\n📊 Produkty HP na Baselinkerze:`);
  console.log(`   Łącznie: ${allProductIds.length}`);
  console.log(`   Z kategorią: ${withCategoryCount} ✅ (nie ruszamy!)`);
  console.log(`   Bez kategorii: ${withoutCategory.length} ❌`);

  if (withoutCategory.length === 0) {
    console.log('\n✅ Wszystkie produkty HP mają kategorie. Nic do zrobienia!');
    return;
  }

  // 5. Process products without category
  const toProcess = limit ? withoutCategory.slice(0, limit) : withoutCategory;
  console.log(`   Do przetworzenia: ${toProcess.length}`);
  console.log('');

  let updated = 0;
  let notInCsv = 0;
  let noMapping = 0;
  let noBlCatId = 0;
  const errors: string[] = [];
  const mappingStats: Record<string, number> = {};

  for (let i = 0; i < toProcess.length; i++) {
    const product = toProcess[i];
    
    // Step A: Find HP category from CSV by SKU
    const hpCategoryPath = csvCategories.get(product.sku);
    
    if (!hpCategoryPath) {
      notInCsv++;
      if (notInCsv <= 5) {
        errors.push(`📭 Brak w CSV: SKU ${product.sku} "${product.name?.substring(0, 50)}"`);
      }
      continue;
    }
    
    // Step B: Map HP category → store slug
    const mapping = findMapping(hpCategoryPath, mappingRules);
    if (!mapping) {
      noMapping++;
      if (noMapping <= 5) {
        errors.push(`❓ Brak mapowania: "${hpCategoryPath}" (SKU: ${product.sku})`);
      }
      continue;
    }
    
    // Step C: Map slug → BL category_id
    const blCat = slugToBLCatId.get(mapping.subSlug);
    if (!blCat) {
      noBlCatId++;
      errors.push(`🚫 Brak BL cat ID dla slug: ${mapping.subSlug} (SKU: ${product.sku})`);
      continue;
    }
    
    const blCategoryId = parseInt(blCat.blCatId, 10);
    
    // Track stats
    mappingStats[blCat.name] = (mappingStats[blCat.name] || 0) + 1;

    // Step D: Update on Baselinker
    if (!dryRun) {
      try {
        await blRequest('addInventoryProduct', {
          inventory_id: HP_INVENTORY_ID,
          product_id: product.id,
          category_id: blCategoryId,
        });
        
        if ((updated + 1) % 50 === 0) {
          console.log(`   ... zaktualizowano ${updated + 1}/${toProcess.length - notInCsv - noMapping - noBlCatId}...`);
        }
      } catch (err: any) {
        errors.push(`💥 Błąd BL update: ID ${product.id} SKU ${product.sku} - ${err.message}`);
        continue;
      }
    }
    
    updated++;
  }

  // 6. Print results
  console.log('');
  console.log('═'.repeat(80));
  console.log(`📊 WYNIKI ${dryRun ? '(DRY-RUN)' : '(ZAPISANO NA BASELINKER)'}`);
  console.log('═'.repeat(80));
  console.log(`   ✅ Przypisano kategorię: ${updated}`);
  console.log(`   📭 Brak w CSV (SKU nie znalezione): ${notInCsv}`);
  console.log(`   ❓ Brak mapowania HP→sklep: ${noMapping}`);
  console.log(`   🚫 Brak BL category ID: ${noBlCatId}`);
  console.log(`   📥 Zapytań do API BL: ${requestCount}`);
  console.log('');

  if (Object.keys(mappingStats).length > 0) {
    console.log('📂 Rozkład przypisanych kategorii:');
    for (const [cat, count] of Object.entries(mappingStats).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat}: ${count}`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`⚠️  Problemy (${errors.length}):`);
    for (const e of errors.slice(0, 30)) {
      console.log(`   ${e}`);
    }
    if (errors.length > 30) console.log(`   ... i ${errors.length - 30} więcej`);
  }

  if (dryRun) {
    console.log('\n🧪 To był DRY-RUN. Aby zapisać zmiany na Baselinkerze, uruchom bez --dry-run');
  } else {
    console.log(`\n✅ Zaktualizowano ${updated} produktów na Baselinkerze.`);
  }
}

main()
  .catch((err) => {
    console.error('💥 Błąd krytyczny:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
