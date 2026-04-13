/**
 * Analiza istniejących kategorii produktów BTP na Baselinkerze
 * Porównuje z CSV żeby zobaczyć jak ProductGroupName mapuje się na kategorie BL
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import 'dotenv/config';

const prisma = new PrismaClient();
const API = 'https://api.baselinker.com/connector.php';
const TOKEN = process.env.BASELINKER_API_TOKEN!;
const BTP_INVENTORY_ID = 22953;

let reqCount = 0;
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function blRequest(method: string, params: any = {}): Promise<any> {
  reqCount++;
  if (reqCount > 1) await sleep(2100);
  
  for (let attempt = 0; attempt < 5; attempt++) {
    const fd = new URLSearchParams();
    fd.append('method', method);
    fd.append('parameters', JSON.stringify(params));
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'X-BLToken': TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: fd.toString(),
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json();
    if (data.status === 'ERROR') {
      if (data.error_message?.includes('Query limit exceeded') || data.error_message?.includes('token blocked')) {
        const waitMs = 65000;
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

async function main() {
  const csvPath = process.argv[process.argv.indexOf('--csv') + 1];
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error('Użycie: npx tsx src/scripts/analyze-btp-categories.ts --csv <ścieżka>');
    process.exit(1);
  }

  // 1. Load CSV - SKU (ItemPartNumber) → { ProductGroupName, PrimaryProductGroupName }
  console.log('📄 Ładowanie CSV BTP...');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');
  const header = lines[0].split(';');
  
  // Find column indices
  const colIdx: Record<string, number> = {};
  header.forEach((h, i) => colIdx[h.trim()] = i);
  
  console.log('   Kolumny:', Object.keys(colIdx).join(', '));
  console.log(`   ItemPartNumber: col ${colIdx['ItemPartNumber']}`);
  console.log(`   ProductGroupName: col ${colIdx['ProductGroupName']}`);
  console.log(`   PrimaryProductGroupName: col ${colIdx['PrimaryProductGroupName']}`);
  
  const csvBySku = new Map<string, { group: string; primary: string; name: string }>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse semicolon CSV carefully (some fields may have quotes)
    const parts = line.split(';');
    const sku = (parts[colIdx['ItemPartNumber']] || '').replace(/"/g, '').trim();
    const group = (parts[colIdx['ProductGroupName']] || '').replace(/"/g, '').trim();
    const primary = (parts[colIdx['PrimaryProductGroupName']] || '').replace(/"/g, '').trim();
    const name = (parts[colIdx['Name']] || '').replace(/"/g, '').trim();
    
    if (sku) {
      csvBySku.set(sku, { group, primary, name });
    }
  }
  console.log(`   CSV: ${csvBySku.size} produktów\n`);

  // 2. Get BL category ID → name from DB
  const dbCats = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: {
      slug: true, name: true, baselinkerCategoryId: true,
      parent: { select: { name: true, parent: { select: { name: true } } } },
    },
  });
  
  const blCatIdToInfo = new Map<number, { name: string; slug: string }>();
  for (const c of dbCats) {
    if (!c.baselinkerCategoryId) continue;
    let path = c.name;
    if (c.parent) {
      path = c.parent.name + ' > ' + c.name;
      if (c.parent.parent) path = c.parent.parent.name + ' > ' + path;
    }
    blCatIdToInfo.set(parseInt(c.baselinkerCategoryId, 10), { name: path, slug: c.slug });
  }

  // 3. Fetch ALL BTP products from BL with category_id
  console.log('📦 Pobieranie produktów BTP z Baselinkera...');
  const allProducts: { id: number; sku: string; name: string }[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const resp = await blRequest('getInventoryProductsList', { inventory_id: BTP_INVENTORY_ID, page });
    const products = resp.products || {};
    const entries = Object.entries(products);
    for (const [id, p] of entries as [string, any][]) {
      allProducts.push({ id: parseInt(id), sku: p.sku || '', name: p.name || '' });
    }
    console.log(`   Strona ${page}: ${entries.length} (łącznie: ${allProducts.length})`);
    hasMore = entries.length === 1000;
    page++;
  }

  // 4. Get category_id for all products (batches of 500)
  console.log('\n🔍 Sprawdzanie category_id...');
  const withCat: { id: number; sku: string; name: string; catId: number }[] = [];
  const withoutCat: { id: number; sku: string; name: string }[] = [];
  const BATCH_SIZE = 500;

  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(p => p.id);
    const resp = await blRequest('getInventoryProductsData', {
      inventory_id: BTP_INVENTORY_ID,
      products: batchIds,
    });
    
    const productsData = resp.products || {};
    for (const [id, data] of Object.entries(productsData) as [string, any][]) {
      const numId = parseInt(id);
      const catId = data.category_id || 0;
      const sku = data.sku || allProducts.find(p => p.id === numId)?.sku || '';
      const name = data.name || '';
      
      if (catId && catId !== 0) {
        withCat.push({ id: numId, sku, name, catId });
      } else {
        withoutCat.push({ id: numId, sku, name });
      }
    }
    
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allProducts.length / BATCH_SIZE);
    console.log(`   Batch ${batchNum}/${totalBatches}: z kat: ${withCat.length}, bez: ${withoutCat.length}`);
  }

  console.log(`\n📊 Produkty BTP na BL:`);
  console.log(`   Łącznie: ${allProducts.length}`);
  console.log(`   Z kategorią: ${withCat.length}`);
  console.log(`   Bez kategorii: ${withoutCat.length}`);

  // 5. Analyze: BL category ← CSV ProductGroupName
  console.log('\n' + '═'.repeat(110));
  console.log('PRODUKTY Z KATEGORIĄ: Kategoria BL ← Grupa produktowa z CSV BTP');
  console.log('═'.repeat(110));

  // Group by BL category
  const byCat = new Map<string, { catName: string; products: { sku: string; csvGroup: string; csvPrimary: string }[] }>();
  
  for (const p of withCat) {
    const catInfo = blCatIdToInfo.get(p.catId);
    const catKey = catInfo ? catInfo.name : `Nieznana (ID: ${p.catId})`;
    
    if (!byCat.has(catKey)) byCat.set(catKey, { catName: catKey, products: [] });
    
    const csvInfo = csvBySku.get(p.sku);
    byCat.get(catKey)!.products.push({
      sku: p.sku,
      csvGroup: csvInfo ? csvInfo.group : '',
      csvPrimary: csvInfo ? csvInfo.primary : '',
    });
  }

  // Sort by product count desc
  const sortedCats = [...byCat.entries()].sort((a, b) => b[1].products.length - a[1].products.length);

  for (const [catName, data] of sortedCats) {
    const total = data.products.length;
    const nocsv = data.products.filter(p => !p.csvGroup).length;
    
    console.log(`\n📂 ${catName} (${total} produktów, ${nocsv} brak w CSV)`);
    
    // Group by CSV category combination
    const byGroup = new Map<string, number>();
    for (const p of data.products) {
      if (!p.csvGroup && !p.csvPrimary) continue;
      const key = p.csvPrimary + ' > ' + p.csvGroup;
      byGroup.set(key, (byGroup.get(key) || 0) + 1);
    }
    
    const sortedGroups = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);
    for (const [group, count] of sortedGroups) {
      console.log(`   ← [${count}] ${group}`);
    }
  }

  // 6. Analyze products WITHOUT category
  console.log('\n' + '═'.repeat(110));
  console.log('PRODUKTY BEZ KATEGORII: rozkład CSV ProductGroupName');
  console.log('═'.repeat(110));

  const noCatByGroup = new Map<string, number>();
  let noCatNoCsv = 0;
  
  for (const p of withoutCat) {
    const csvInfo = csvBySku.get(p.sku);
    if (!csvInfo) {
      noCatNoCsv++;
      continue;
    }
    const key = csvInfo.primary + ' > ' + csvInfo.group;
    noCatByGroup.set(key, (noCatByGroup.get(key) || 0) + 1);
  }

  const sortedNoCat = [...noCatByGroup.entries()].sort((a, b) => b[1] - a[1]);
  for (const [group, count] of sortedNoCat) {
    console.log(`   [${count}] ${group}`);
  }
  console.log(`\n   Brak w CSV: ${noCatNoCsv}`);
  console.log(`   Łącznie bez kategorii z CSV: ${withoutCat.length - noCatNoCsv}`);

  console.log('\n' + '═'.repeat(110));
  console.log(`Łącznie z kategorią: ${withCat.length} | Bez kategorii: ${withoutCat.length}`);

  await prisma.$disconnect();
}

main();
