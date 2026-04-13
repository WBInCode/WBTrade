/**
 * Porównanie: produkty HP które JUŻ MAJĄ kategorie na Baselinkerze
 * vs co miały w pliku CSV z Hurtowni Przemysłowej
 * 
 * Pokazuje: Kategoria BL (istniejąca) ← jakie ścieżki z CSV tam trafiły
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

let reqCount = 0;
async function blRequest(method: string, params: Record<string, any> = {}): Promise<any> {
  reqCount++;
  if (reqCount > 1) await sleep(2100);
  for (let attempt = 0; attempt < 5; attempt++) {
    const formData = new URLSearchParams();
    formData.append('method', method);
    formData.append('parameters', JSON.stringify(params));
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

async function main() {
  const csvPath = process.argv.find((_, i, a) => a[i - 1] === '--csv') || '';
  if (!csvPath || !fs.existsSync(csvPath)) { console.error('--csv <path>'); process.exit(1); }

  const csvCats = loadCsv(csvPath);
  console.log(`📄 CSV: ${csvCats.size} produktów`);

  // Fetch BL categories id→name
  const catResp = await blRequest('getInventoryCategories', { inventory_id: HP_INVENTORY_ID });
  const blCatNames = new Map<number, string>();
  for (const c of (catResp.categories || [])) {
    blCatNames.set(c.category_id, c.name.replace(/\|/g, ' > '));
  }

  // Fetch all HP product IDs
  console.log('\n📦 Pobieranie produktów HP z Baselinkera...');
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
  console.log(`   Łącznie: ${allIds.length}`);

  // Get detailed data (category_id) for products WITH categories
  console.log('\n🔍 Sprawdzanie category_id...');
  // blCatId → { csvPaths: Map<csvPath, count>, totalCount }
  const catAnalysis = new Map<number, { totalCount: number; csvPaths: Map<string, number>; notInCsv: number }>();
  let withCat = 0, withoutCat = 0;

  for (let i = 0; i < allIds.length; i += 500) {
    const batch = allIds.slice(i, i + 500);
    const resp = await blRequest('getInventoryProductsData', { inventory_id: HP_INVENTORY_ID, products: batch });

    for (const [id, data] of Object.entries(resp.products || {}) as [string, any][]) {
      const catId = data.category_id || 0;
      if (!catId || catId === 0) { withoutCat++; continue; }
      withCat++;

      if (!catAnalysis.has(catId)) {
        catAnalysis.set(catId, { totalCount: 0, csvPaths: new Map(), notInCsv: 0 });
      }
      const entry = catAnalysis.get(catId)!;
      entry.totalCount++;

      const sku = data.sku || '';
      const csvPath = csvCats.get(sku);
      if (csvPath) {
        entry.csvPaths.set(csvPath, (entry.csvPaths.get(csvPath) || 0) + 1);
      } else {
        entry.notInCsv++;
      }
    }

    process.stdout.write(`\r   Sprawdzono ${Math.min(i + 500, allIds.length)}/${allIds.length} | z kat: ${withCat} | bez: ${withoutCat}`);
  }

  console.log(`\n\n📊 Produkty HP: ${allIds.length} łącznie | ${withCat} z kategorią | ${withoutCat} bez`);

  // Print analysis
  console.log('\n' + '═'.repeat(110));
  console.log('PRODUKTY JUŻ Z KATEGORIĄ NA BL: Kategoria BL ← Ścieżki z CSV HP');
  console.log('═'.repeat(110));

  const sorted = [...catAnalysis.entries()].sort((a, b) => b[1].totalCount - a[1].totalCount);

  for (const [catId, { totalCount, csvPaths, notInCsv }] of sorted) {
    const catName = blCatNames.get(catId) || `nieznana (ID: ${catId})`;
    console.log(`\n📂 ${catName} (${totalCount} produktów, ${notInCsv} brak w CSV)`);

    const sortedPaths = [...csvPaths.entries()].sort((a, b) => b[1] - a[1]);
    for (const [csvPath, count] of sortedPaths) {
      console.log(`   ← [${count}] ${csvPath}`);
    }
  }

  console.log('\n' + '═'.repeat(110));
  console.log(`Łącznie z kategorią: ${withCat} | Bez kategorii: ${withoutCat}`);
  console.log(`Kategorii BL użytych: ${catAnalysis.size}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
