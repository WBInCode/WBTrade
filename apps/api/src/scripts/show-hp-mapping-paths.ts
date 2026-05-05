/**
 * Pokaż pełne ścieżki: kategoria HP (CSV) → kategoria sklepu (BL)
 * Wyświetla dla każdej kategorii sklepu jakie HP-owe ścieżki do niej trafiają
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const API_TOKEN = process.env.BASELINKER_API_TOKEN!;
const HP_INVENTORY_ID = 22954;

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function blRequest(method: string, params: Record<string, any> = {}): Promise<any> {
  await sleep(2100);
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(params));
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(BASELINKER_API_URL, {
      method: 'POST',
      headers: { 'X-BLToken': API_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    if (data.status === 'ERROR') {
      if (data.error_message?.includes('limit') || data.error_message?.includes('blocked')) {
        console.warn('   ⏳ Rate limit, czekam 65s...');
        await sleep(65000);
        continue;
      }
      throw new Error(`BL Error: ${data.error_message}`);
    }
    return data;
  }
  throw new Error('Max retries');
}

interface MappingTarget { subSlug: string; comment: string; }

function loadMapping(): Map<string, MappingTarget> {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/hp-category-mapping.json'), 'utf-8'));
  const map = new Map<string, MappingTarget>();
  for (const [prefix, target] of Object.entries(data.mapping)) {
    if (prefix === '_comment') continue;
    map.set(prefix, target as MappingTarget);
  }
  return map;
}

function loadCsv(filePath: string): Map<string, string> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const map = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const si = line.indexOf(';');
    if (si === -1) continue;
    const sku = line.substring(0, si).trim();
    const rest = line.substring(si + 1);
    const si2 = rest.indexOf(';');
    const cat = (si2 !== -1 ? rest.substring(0, si2) : rest).trim().replace(/"/g, '').trim();
    if (sku && cat) map.set(sku, cat);
  }
  return map;
}

function findMapping(hp: string, rules: Map<string, MappingTarget>): MappingTarget | null {
  let best: MappingTarget | null = null, bestLen = 0;
  for (const [prefix, target] of rules) {
    if ((hp === prefix || hp.startsWith(prefix + '/')) && prefix.length > bestLen) {
      best = target; bestLen = prefix.length;
    }
  }
  return best;
}

async function main() {
  const csvPath = process.argv.find((_, i, a) => a[i - 1] === '--csv') || '';
  if (!csvPath || !fs.existsSync(csvPath)) { console.error('--csv <path>'); process.exit(1); }

  const csvCats = loadCsv(csvPath);
  const mappingRules = loadMapping();
  console.log(`CSV: ${csvCats.size} | Reguły: ${mappingRules.size}`);

  // DB categories: slug → BL path (full path with |)
  const dbCats = await prisma.category.findMany({
    select: { slug: true, name: true, baselinkerCategoryId: true, baselinkerCategoryPath: true, parent: { select: { name: true, parent: { select: { name: true } } } } },
    where: { baselinkerCategoryId: { not: null } },
  });
  const slugToInfo = new Map<string, { blCatId: string; fullPath: string }>();
  for (const c of dbCats) {
    let fullPath = c.name;
    if (c.parent) {
      fullPath = c.parent.parent
        ? `${c.parent.parent.name} > ${c.parent.name} > ${c.name}`
        : `${c.parent.name} > ${c.name}`;
    }
    if (c.baselinkerCategoryId) slugToInfo.set(c.slug, { blCatId: c.baselinkerCategoryId, fullPath });
  }

  // Fetch uncategorized product IDs from BL
  console.log('\nPobieranie produktów BL bez kategorii...');
  const allIds: number[] = [];
  const skuById = new Map<number, string>();
  let page = 1, hasMore = true;
  while (hasMore) {
    const resp = await blRequest('getInventoryProductsList', { inventory_id: HP_INVENTORY_ID, page });
    const entries = Object.entries(resp.products || {});
    for (const [id, p] of entries as [string, any][]) {
      allIds.push(parseInt(id)); skuById.set(parseInt(id), p.sku || '');
    }
    hasMore = entries.length === 1000; page++;
  }
  console.log(`Produktów HP: ${allIds.length}`);

  // Check category_id
  const uncategorized: { id: number; sku: string }[] = [];
  for (let i = 0; i < allIds.length; i += 500) {
    const batch = allIds.slice(i, i + 500);
    const resp = await blRequest('getInventoryProductsData', { inventory_id: HP_INVENTORY_ID, products: batch });
    for (const [id, data] of Object.entries(resp.products || {}) as [string, any][]) {
      if (!data.category_id || data.category_id === 0) {
        uncategorized.push({ id: parseInt(id), sku: data.sku || skuById.get(parseInt(id)) || '' });
      }
    }
    process.stdout.write(`\r   Sprawdzono ${Math.min(i + 500, allIds.length)}/${allIds.length} | bez kat: ${uncategorized.length}`);
  }
  console.log(`\nBez kategorii: ${uncategorized.length}`);

  // Map each uncategorized product
  // Store: storeCatPath → { count, hpPaths: Set<string> }
  const result = new Map<string, { count: number; hpPaths: Set<string> }>();
  let notInCsv = 0, noMapping = 0, noBlId = 0;

  for (const prod of uncategorized) {
    const hpPath = csvCats.get(prod.sku);
    if (!hpPath) { notInCsv++; continue; }

    const mapping = findMapping(hpPath, mappingRules);
    if (!mapping) { noMapping++; continue; }

    const info = slugToInfo.get(mapping.subSlug);
    if (!info) { noBlId++; continue; }

    if (!result.has(info.fullPath)) result.set(info.fullPath, { count: 0, hpPaths: new Set() });
    const entry = result.get(info.fullPath)!;
    entry.count++;
    entry.hpPaths.add(hpPath);
  }

  // Print results
  console.log('\n' + '═'.repeat(100));
  console.log('MAPOWANIE: Kategoria HP (CSV) → Kategoria sklepu (BL)');
  console.log('═'.repeat(100));

  const sorted = [...result.entries()].sort((a, b) => b[1].count - a[1].count);
  let totalAssigned = 0;

  for (const [storePath, { count, hpPaths }] of sorted) {
    totalAssigned += count;
    console.log(`\n📂 ${storePath} (${count} produktów)`);
    const sortedHpPaths = [...hpPaths].sort();
    for (const hp of sortedHpPaths) {
      console.log(`   ← ${hp}`);
    }
  }

  console.log('\n' + '═'.repeat(100));
  console.log(`Łącznie do przypisania: ${totalAssigned}`);
  console.log(`Brak w CSV: ${notInCsv} | Brak mapowania: ${noMapping} | Brak BL ID: ${noBlId}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
