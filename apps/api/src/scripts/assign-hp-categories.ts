/**
 * Skrypt przypisywania kategorii do produktów HP bez kategorii
 * 
 * 1. Ładuje CSV z Hurtowni Przemysłowej (SKU → kategoria HP)
 * 2. Ładuje hp-category-mapping.json (kategoria HP → kategoria sklepu)
 * 3. Znajduje produkty HP w bazie BEZ categoryId
 * 4. Mapuje: SKU produktu → kategoria z CSV → nasza kategoria sklepu
 * 5. Aktualizuje categoryId TYLKO dla produktów bez kategorii
 * 
 * Użycie: npx tsx src/scripts/assign-hp-categories.ts --csv <ścieżka> [--dry-run] [--limit N]
 * 
 * Opcje:
 *   --csv      Ścieżka do pliku CSV z Hurtowni Przemysłowej (wymagane)
 *   --dry-run  Tylko symulacja, bez zmian w bazie
 *   --limit N  Limit produktów do przetworzenia
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

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

interface HpMapping {
  mapping: Record<string, MappingTarget>;
}

/**
 * Loads HP category mapping rules from config
 */
function loadMapping(): Map<string, MappingTarget> {
  const mappingPath = path.join(__dirname, '../../config/hp-category-mapping.json');
  const raw = fs.readFileSync(mappingPath, 'utf-8');
  const data: HpMapping = JSON.parse(raw);
  
  const map = new Map<string, MappingTarget>();
  for (const [prefix, target] of Object.entries(data.mapping)) {
    if (prefix === '_comment') continue;
    map.set(prefix, target);
  }
  return map;
}

/**
 * Loads CSV from Hurtownia Przemysłowa and builds SKU → HP category path map.
 * CSV format: SKU;Kategoria;... (semicolon separated, first row is header)
 * SKU in CSV is just a number (e.g. "1000001"), in DB it's "hp-1000001"
 */
function loadCsvCategories(filePath: string): Map<string, string> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const map = new Map<string, string>();
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse semicolon-separated: SKU;Kategoria;...
    const semicolonIdx = line.indexOf(';');
    if (semicolonIdx === -1) continue;
    
    const sku = line.substring(0, semicolonIdx).trim();
    const rest = line.substring(semicolonIdx + 1);
    const secondSemicolon = rest.indexOf(';');
    const category = secondSemicolon !== -1 
      ? rest.substring(0, secondSemicolon).trim()
      : rest.trim();
    
    if (sku && category) {
      // Store with hp- prefix to match DB SKU format
      // Strip ALL quote characters from category path (CSV may have quotes around values)
      const cleanCategory = category.replace(/"/g, '').trim();
      map.set(`hp-${sku}`, cleanCategory);
    }
  }
  
  return map;
}

/**
 * Finds the best matching mapping rule for a given HP category path.
 * Uses longest prefix match.
 */
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

async function main() {
  if (!csvPath) {
    console.error('❌ Brak ścieżki do CSV. Użycie: npx tsx src/scripts/assign-hp-categories.ts --csv <ścieżka>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Plik CSV nie istnieje: ${csvPath}`);
    process.exit(1);
  }

  console.log('🔄 Przypisywanie kategorii do produktów HP bez kategorii');
  console.log(`   Mode: ${dryRun ? '🧪 DRY-RUN (bez zmian w bazie)' : '✏️  ZAPIS do bazy'}`);
  console.log(`   CSV: ${csvPath}`);
  if (limit) console.log(`   Limit: ${limit} produktów`);
  console.log('');

  // 1. Load CSV (SKU → HP category path)
  const csvCategories = loadCsvCategories(csvPath);
  console.log(`📄 Załadowano ${csvCategories.size} produktów z CSV`);

  // 2. Load mapping (HP category → store category)
  const mappingRules = loadMapping();
  console.log(`📋 Załadowano ${mappingRules.size} reguł mapowania HP → sklep`);

  // 3. Find HP products WITHOUT category
  const uncategorized = await prisma.product.findMany({
    where: {
      baselinkerProductId: { startsWith: 'hp-' },
      categoryId: null,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      baselinkerProductId: true,
      baselinkerCategoryPath: true,
    },
    ...(limit ? { take: limit } : {}),
  });

  // Stats
  const totalHpProducts = await prisma.product.count({
    where: { baselinkerProductId: { startsWith: 'hp-' } },
  });
  const hpWithCategory = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'hp-' },
      categoryId: { not: null },
    },
  });

  console.log(`\n📊 Statystyki produktów HP:`);
  console.log(`   Łącznie w bazie: ${totalHpProducts}`);
  console.log(`   Już z kategorią: ${hpWithCategory} ✅ (nie ruszamy!)`);
  console.log(`   Bez kategorii: ${totalHpProducts - hpWithCategory} ❌`);
  console.log(`   Do przetworzenia: ${uncategorized.length}`);
  console.log('');

  if (uncategorized.length === 0) {
    console.log('✅ Brak produktów HP bez kategorii. Nic do zrobienia!');
    return;
  }

  // 4. Pre-load all store categories (slug → id)
  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true },
  });
  const categoryBySlug = new Map<string, { id: string; name: string }>();
  for (const cat of allCategories) {
    categoryBySlug.set(cat.slug, { id: cat.id, name: cat.name });
  }

  // 5. Process each uncategorized product
  let updated = 0;
  let notInCsv = 0;
  let noMapping = 0;
  let noCategoryInDb = 0;
  const skippedInne = 0;
  const errors: string[] = [];
  const mappingStats: Record<string, number> = {};

  for (const product of uncategorized) {
    // Step A: Find HP category - try CSV first, then baselinkerCategoryPath from DB
    let hpCategoryPath = csvCategories.get(product.sku);
    
    if (!hpCategoryPath && product.baselinkerCategoryPath) {
      // Fallback: use baselinkerCategoryPath from DB
      // Clean up: remove ALL surrounding/embedded quotes, replace "|" with "/", trim
      let cleaned = product.baselinkerCategoryPath
        .replace(/"/g, '')        // Remove ALL quote characters
        .replace(/\|/g, '/')      // Baselinker uses "|" as separator, CSV uses "/"
        .trim();
      if (cleaned) {
        hpCategoryPath = cleaned;
      }
    }
    
    if (!hpCategoryPath) {
      notInCsv++;
      if (notInCsv <= 10) {
        errors.push(`📭 Brak kategorii: SKU ${product.sku} "${product.name?.substring(0, 50)}"`);
      }
      continue;
    }
    
    // Step B: Map HP category → store category using our mapping
    const mapping = findMapping(hpCategoryPath, mappingRules);
    
    if (!mapping) {
      noMapping++;
      errors.push(`❓ Brak mapowania dla HP kat: "${hpCategoryPath}" (SKU: ${product.sku})`);
      continue;
    }
    
    // Step C: Find target store category in DB by slug
    const targetCategory = categoryBySlug.get(mapping.subSlug);
    if (!targetCategory) {
      noCategoryInDb++;
      errors.push(`🚫 Kat. [${mapping.subSlug}] nie istnieje w bazie! (SKU: ${product.sku})`);
      continue;
    }

    // Track stats
    const statKey = `${targetCategory.name} [${mapping.subSlug}]`;
    mappingStats[statKey] = (mappingStats[statKey] || 0) + 1;

    if (!dryRun) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { categoryId: targetCategory.id },
        });
      } catch (err: any) {
        errors.push(`💥 Błąd update: ${product.sku} - ${err.message}`);
        continue;
      }
    }
    
    updated++;
  }

  // 6. Print results
  console.log('═'.repeat(80));
  console.log(`📊 WYNIKI ${dryRun ? '(DRY-RUN)' : '(ZAPISANO)'}`);
  console.log('═'.repeat(80));
  console.log(`   ✅ Przypisano kategorię sklepu: ${updated}`);
  console.log(`   📭 Brak w CSV (nie znaleziono SKU): ${notInCsv}`);
  console.log(`   ❓ Brak mapowania HP→sklep: ${noMapping}`);

  console.log(`   🚫 Kategoria nie istnieje w bazie: ${noCategoryInDb}`);
  console.log('');

  if (Object.keys(mappingStats).length > 0) {
    console.log('📂 Rozkład przypisanych kategorii SKLEPU:');
    for (const [cat, count] of Object.entries(mappingStats).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat}: ${count} produktów`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`⚠️  Problemy (${errors.length}):`);
    for (const e of errors.slice(0, 50)) {
      console.log(`   ${e}`);
    }
    if (errors.length > 50) {
      console.log(`   ... i ${errors.length - 50} więcej`);
    }
  }

  if (dryRun) {
    console.log('\n🧪 To był DRY-RUN. Aby zapisać zmiany, uruchom bez --dry-run');
  } else {
    console.log(`\n✅ Zapisano ${updated} zmian w bazie.`);
  }
}

main()
  .catch((err) => {
    console.error('💥 Błąd krytyczny:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
