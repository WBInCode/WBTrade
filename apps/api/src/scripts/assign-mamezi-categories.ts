/**
 * Skrypt: Przypisz kategorie WBTrade produktom Mamezi (DoFirmy) w Baselinkerze
 * 
 * Strategia:
 * 1. Pobiera listę produktów z inventory DoFirmy (26423) w Baselinkerze
 * 2. Dla każdego produktu pobiera SKU → szuka w XML feed → znajduje kategorię Mamezi
 * 3. Mapuje kategorię Mamezi → slug WBTrade (mamezi-category-mapping.json)
 * 4. Pobiera baselinkerCategoryId z bazy → przypisuje w BL
 * 
 * Użycie:
 *   npx tsx src/scripts/assign-mamezi-categories.ts --dry-run   (podgląd)
 *   npx tsx src/scripts/assign-mamezi-categories.ts              (produkcja)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const API_TOKEN = process.env.BASELINKER_API_TOKEN!;
const DOFIRMY_INV_ID = 26423;
const DATA_BATCH_SIZE = 1000;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceReassign = args.includes('--force');

// ========================= BL REQUEST =========================

let requestCount = 0;

async function blRequest(method: string, params: Record<string, any> = {}): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(params));
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: { 'X-BLToken': API_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  const data = await response.json();
  requestCount++;
  if (data.status === 'ERROR') {
    if (data.error_message?.includes('Query limit exceeded') || data.error_message?.includes('token blocked')) {
      const match = data.error_message.match(/until (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
      let waitMs = 65000;
      if (match) { waitMs = Math.max(new Date(match[1]).getTime() - Date.now() + 5000, 10000); }
      console.log(`   ⏳ Rate limit (po ${requestCount} req) - czekam ${Math.round(waitMs / 1000)}s...`);
      await sleep(waitMs);
      return blRequest(method, params);
    }
    throw new Error(`BL API Error: ${data.error_message}`);
  }
  return data;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ========================= XML FEED PARSING =========================

interface XmlProduct {
  id: string;
  name: string;
  category: string;
}

/**
 * Parse the Mamezi XML feed and build a map: product ID → category path.
 * Also builds a map by EAN (from attrs) and by name for fallback matching.
 */
function loadXmlFeed(): { byId: Map<string, string>; byName: Map<string, string> } {
  const xmlPath = path.resolve(__dirname, '../../data/mamezi-feed.xml');
  const raw = fs.readFileSync(xmlPath, 'utf-8');
  
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  
  // Simple regex-based XML parsing for <o> elements
  const offerRegex = /<o\s[^>]*id="([^"]*)"[^>]*>[\s\S]*?<\/o>/g;
  const catRegex = /<cat><!\[CDATA\[(.*?)\]\]><\/cat>/;
  const nameRegex = /<name><!\[CDATA\[(.*?)\]\]><\/name>/;
  
  let match;
  while ((match = offerRegex.exec(raw)) !== null) {
    const offerXml = match[0];
    const id = match[1];
    
    const catMatch = offerXml.match(catRegex);
    const nameMatch = offerXml.match(nameRegex);
    
    if (catMatch) {
      const category = catMatch[1];
      byId.set(id, category);
      
      if (nameMatch) {
        byName.set(nameMatch[1].toLowerCase().trim(), category);
      }
    }
  }
  
  return { byId, byName };
}

// ========================= CATEGORY MAPPING =========================

interface MappingTarget {
  subSlug: string;
  comment: string;
}

interface NameOverride {
  pattern: string;
  subSlug: string;
  comment: string;
}

function loadMapping(): { rules: Map<string, MappingTarget>; nameOverrides: NameOverride[] } {
  const mappingPath = path.resolve(__dirname, '../../config/mamezi-category-mapping.json');
  const raw = fs.readFileSync(mappingPath, 'utf-8');
  const data = JSON.parse(raw);
  
  const rules = new Map<string, MappingTarget>();
  for (const [prefix, target] of Object.entries(data.mapping)) {
    if (prefix === '_comment') continue;
    rules.set(prefix, target as MappingTarget);
  }
  
  const nameOverrides: NameOverride[] = (data.nameOverrides || []) as NameOverride[];
  return { rules, nameOverrides };
}

/**
 * Finds the best matching mapping rule (longest prefix match).
 */
function findMapping(categoryPath: string, mappingRules: Map<string, MappingTarget>): MappingTarget | null {
  let bestMatch: MappingTarget | null = null;
  let bestLen = 0;
  
  for (const [prefix, target] of mappingRules) {
    if (categoryPath === prefix || categoryPath.startsWith(prefix + '/')) {
      if (prefix.length > bestLen) {
        bestMatch = target;
        bestLen = prefix.length;
      }
    }
  }
  
  return bestMatch;
}

// ========================= MAIN =========================

async function main() {
  if (!API_TOKEN) { console.error('❌ Brak BASELINKER_API_TOKEN'); process.exit(1); }

  console.log('🏪 Przypisywanie kategorii produktom Mamezi (DoFirmy) w Baselinkerze');
  console.log(dryRun ? '🔍 DRY-RUN (bez zmian)\n' : '🚀 PRODUKCJA (zmiany!)\n');
  if (forceReassign) console.log('⚡ FORCE: nadpisywanie istniejących kategorii!\n');

  // 1. Załaduj XML feed
  console.log('📄 Ładuję XML feed Mamezi...');
  const xmlFeed = loadXmlFeed();
  console.log(`   ${xmlFeed.byId.size} produktów w XML (po ID)`);
  console.log(`   ${xmlFeed.byName.size} produktów w XML (po nazwie)`);

  // 2. Załaduj mapping
  console.log('📋 Ładuję mapowanie kategorii...');
  const { rules: mappingRules, nameOverrides } = loadMapping();
  console.log(`   ${mappingRules.size} reguł mapowania, ${nameOverrides.length} nadpisań po nazwie`);

  // 3. Pobierz slug → baselinkerCategoryId z bazy
  console.log('\n🗄️  Pobieram kategorie z bazy danych...');
  const dbCategories = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { slug: true, name: true, baselinkerCategoryId: true, parent: { select: { name: true } } },
  });
  const slugToBlCatId = new Map<string, number>();
  for (const cat of dbCategories) {
    if (cat.baselinkerCategoryId) {
      slugToBlCatId.set(cat.slug, parseInt(cat.baselinkerCategoryId, 10));
    }
  }
  console.log(`   ${slugToBlCatId.size} kategorii z BL ID`);

  // 4. Pobierz listę produktów z inventory DoFirmy
  console.log('\n📊 Pobieram listę produktów DoFirmy z Baselinkera...');
  let page = 1;
  let hasMore = true;
  const allProductIds: number[] = [];
  while (hasMore) {
    const resp = await blRequest('getInventoryProductsList', { inventory_id: DOFIRMY_INV_ID, page });
    const products = resp.products || {};
    allProductIds.push(...Object.keys(products).map(Number));
    hasMore = Object.keys(products).length === 1000;
    page++;
  }
  console.log(`   ${allProductIds.length} produktów w inventory DoFirmy`);

  // 5. Pobierz szczegóły produktów i przypisuj kategorie
  console.log('\n🔍 Analizuję produkty...');
  
  interface Assignment {
    productId: number;
    name: string;
    sku: string;
    mamaziCat: string;
    targetBlCatId: number;
    targetSlug: string;
    method: string;
  }

  const assignments: Assignment[] = [];
  let skippedHasCat = 0;
  let skippedNoXmlMatch = 0;
  let skippedNoMapping = 0;
  let skippedNoBlId = 0;
  const unmappedCategories = new Map<string, number>();
  const totalBatches = Math.ceil(allProductIds.length / DATA_BATCH_SIZE);

  for (let i = 0; i < allProductIds.length; i += DATA_BATCH_SIZE) {
    const batch = allProductIds.slice(i, i + DATA_BATCH_SIZE);
    const batchNum = Math.floor(i / DATA_BATCH_SIZE) + 1;

    const resp = await blRequest('getInventoryProductsData', {
      inventory_id: DOFIRMY_INV_ID,
      products: batch,
    });

    const productsData = resp.products || {};
    for (const [id, data] of Object.entries(productsData) as [string, any][]) {
      const catId = data.category_id || 0;
      
      // Pomiń już skategoryzowane (chyba że --force)
      if (catId > 0 && !forceReassign) { skippedHasCat++; continue; }

      const name = (data.text_fields?.name || '').trim();
      const sku = (data.sku || '').trim();
      const ean = (data.ean || '').trim();
      
      // Znajdź kategorię Mamezi
      // Próba 1: po ID produktu z XML (id z XML = id z BL lub sku)
      let mamaziCat = xmlFeed.byId.get(id) || xmlFeed.byId.get(sku) || xmlFeed.byId.get(ean);
      let matchMethod = 'xml-id';
      
      // Próba 2: po nazwie produktu
      if (!mamaziCat && name) {
        mamaziCat = xmlFeed.byName.get(name.toLowerCase());
        matchMethod = 'xml-name';
      }
      
      if (!mamaziCat) {
        skippedNoXmlMatch++;
        continue;
      }
      
      // Mapuj kategorię Mamezi → slug WBTrade
      // Priorytet 1: nadpisania po nazwie produktu
      let mapping: MappingTarget | null = null;
      const nameLower = name.toLowerCase();
      for (const override of nameOverrides) {
        if (nameLower.includes(override.pattern.toLowerCase())) {
          mapping = { subSlug: override.subSlug, comment: override.comment };
          break;
        }
      }
      // Priorytet 2: mapowanie po kategorii XML
      if (!mapping) {
        mapping = findMapping(mamaziCat, mappingRules);
      }
      if (!mapping) {
        skippedNoMapping++;
        unmappedCategories.set(mamaziCat, (unmappedCategories.get(mamaziCat) || 0) + 1);
        continue;
      }
      
      // Pobierz BL category_id z bazy
      const blCatId = slugToBlCatId.get(mapping.subSlug);
      if (!blCatId) {
        skippedNoBlId++;
        console.log(`   ⚠️ Brak BL ID dla slug: ${mapping.subSlug}`);
        continue;
      }
      
      assignments.push({
        productId: parseInt(id),
        name,
        sku,
        mamaziCat,
        targetBlCatId: blCatId,
        targetSlug: mapping.subSlug,
        method: matchMethod,
      });
    }

    if (batchNum % 5 === 0 || batchNum === totalBatches) {
      console.log(`   Batch ${batchNum}/${totalBatches}: ${assignments.length} do przypisania, ${skippedHasCat} z kat., ${skippedNoXmlMatch} bez XML, ${skippedNoMapping} bez map.`);
    }
    await sleep(300);
  }

  // 6. Podsumowanie
  console.log('\n' + '='.repeat(60));
  console.log('📊 PLAN PRZYPISANIA');
  console.log('='.repeat(60));
  console.log(`Produkty w inventory:     ${allProductIds.length}`);
  console.log(`Już z kategorią:          ${skippedHasCat} ✅`);
  console.log(`Brak w XML:               ${skippedNoXmlMatch}`);
  console.log(`Brak mapowania:           ${skippedNoMapping}`);
  console.log(`Brak BL ID:               ${skippedNoBlId}`);
  console.log(`Do przypisania:           ${assignments.length}`);

  // Rozkład po kategoriach
  const slugCounts = new Map<string, number>();
  for (const a of assignments) {
    slugCounts.set(a.targetSlug, (slugCounts.get(a.targetSlug) || 0) + 1);
  }
  console.log('\n📂 Rozkład po kategoriach WBTrade:');
  for (const [slug, count] of [...slugCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug}: ${count} prod. → BL cat_id ${slugToBlCatId.get(slug)}`);
  }

  // Niezmapowane kategorie
  if (unmappedCategories.size > 0) {
    console.log('\n⚠️ Niezmapowane kategorie Mamezi:');
    for (const [cat, count] of [...unmappedCategories.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  "${cat}": ${count} prod.`);
    }
  }

  // Przykłady przypisań
  console.log('\n📝 Przykłady (max 15):');
  for (const a of assignments.slice(0, 15)) {
    console.log(`  [${a.method}] "${a.name.substring(0, 60)}" | Mamezi: "${a.mamaziCat}" → ${a.targetSlug} (BL: ${a.targetBlCatId})`);
  }

  if (dryRun) {
    console.log('\n🔍 DRY-RUN zakończony. Uruchom bez --dry-run żeby przypisać.');
    await prisma.$disconnect();
    return;
  }

  // 7. Przypisywanie kategorii
  console.log(`\n🚀 Przypisuję kategorie (${assignments.length} produktów)...`);
  
  let success = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    
    try {
      await blRequest('addInventoryProduct', {
        inventory_id: DOFIRMY_INV_ID,
        product_id: a.productId,
        category_id: a.targetBlCatId,
      });
      success++;
    } catch (err: any) {
      errors++;
      if (errors <= 10) {
        console.log(`   ❌ Błąd ID:${a.productId}: ${err.message}`);
      }
    }

    if ((i + 1) % 200 === 0 || i === assignments.length - 1) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = Math.round(success / (elapsed || 1) * 60);
      const eta = rate > 0 ? Math.round((assignments.length - i - 1) / (rate / 60)) : '?';
      console.log(`   [${i + 1}/${assignments.length}] ✅ ${success} | ❌ ${errors} | ${rate}/min | ETA: ~${eta}s | Req: ${requestCount}`);
    }

    await sleep(100);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ GOTOWE: ${success} przypisanych, ${errors} błędów`);
  console.log(`   Łącznie requestów BL: ${requestCount}`);
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
