/**
 * Eksport mapowania kategorii BTP do Excela (CSV)
 * 
 * Dla każdego produktu BTP BEZ kategorii na BL:
 * - pokazuje SKU, nazwę, kategorię z CSV BTP, proponowaną kategorię sklepu
 * - NIE zapisuje nic na Baselinkerze
 * 
 * Wynik: plik Excel-friendly CSV z separatorem ; do łatwego przeglądu
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
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
        console.warn(`   ⏳ Rate limit. Czekam 65s...`);
        await sleep(65000);
        continue;
      }
      throw new Error(`BL API Error: ${data.error_message}`);
    }
    return data;
  }
  throw new Error('BL API: max retries exceeded');
}

interface MappingTarget {
  subSlug: string;
  comment: string;
}

async function main() {
  const csvIdx = process.argv.indexOf('--csv');
  const csvPath = csvIdx !== -1 ? process.argv[csvIdx + 1] : null;
  
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error('Użycie: npx tsx src/scripts/export-btp-mapping.ts --csv <ścieżka>');
    process.exit(1);
  }

  console.log('📄 Ładowanie CSV BTP (UTF-8)...');
  
  const text = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = text.split('\n');
  const header = lines[0].split(';');
  
  const colIdx: Record<string, number> = {};
  header.forEach((h, i) => colIdx[h.trim()] = i);
  
  // Load CSV: SKU → { group, primary, name }
  const csvBySku = new Map<string, { group: string; primary: string; name: string; ean: string }>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(';');
    const sku = (parts[colIdx['ItemPartNumber']] || '').replace(/"/g, '').trim();
    const group = (parts[colIdx['ProductGroupName']] || '').replace(/"/g, '').trim();
    const primary = (parts[colIdx['PrimaryProductGroupName']] || '').replace(/"/g, '').trim();
    const name = (parts[colIdx['Name']] || '').replace(/"/g, '').trim();
    const ean = (parts[colIdx['ItemEAN']] || '').replace(/"/g, '').trim();
    
    if (sku) {
      csvBySku.set(sku, { group, primary, name, ean });
    }
  }
  console.log(`   CSV: ${csvBySku.size} produktów`);

  // Load mapping
  console.log('📋 Ładowanie mapowania...');
  const mappingPath = path.join(__dirname, '../../config/btp-category-mapping.json');
  const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
  const mappingRules = new Map<string, MappingTarget>();
  for (const [key, val] of Object.entries(mappingData.mapping)) {
    if (key === '_comment') continue;
    mappingRules.set(key, val as MappingTarget);
  }
  console.log(`   Reguły: ${mappingRules.size}`);

  // Load slug → category name from DB
  const dbCats = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: {
      slug: true, name: true, baselinkerCategoryId: true,
      parent: { select: { name: true, parent: { select: { name: true } } } },
    },
  });
  
  const slugToInfo = new Map<string, { blCatId: string; fullName: string }>();
  for (const c of dbCats) {
    if (!c.baselinkerCategoryId) continue;
    let fullName = c.name;
    if (c.parent) {
      fullName = c.parent.name + ' > ' + c.name;
      if (c.parent.parent) fullName = c.parent.parent.name + ' > ' + fullName;
    }
    slugToInfo.set(c.slug, { blCatId: c.baselinkerCategoryId, fullName });
  }

  // Fetch ALL BTP products from BL
  console.log('\n📦 Pobieranie produktów BTP z Baselinkera...');
  const allProducts: { id: number; sku: string; name: string }[] = [];
  const nameById = new Map<number, string>();
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const resp = await blRequest('getInventoryProductsList', { inventory_id: BTP_INVENTORY_ID, page });
    const products = resp.products || {};
    const entries = Object.entries(products);
    for (const [id, p] of entries as [string, any][]) {
      const numId = parseInt(id);
      allProducts.push({ id: numId, sku: p.sku || '', name: p.name || '' });
      nameById.set(numId, p.name || '');
    }
    console.log(`   Strona ${page}: ${entries.length} (łącznie: ${allProducts.length})`);
    hasMore = entries.length === 1000;
    page++;
  }

  // Get category_id for all products
  console.log('\n🔍 Sprawdzanie category_id...');
  const withoutCat: { id: number; sku: string; name: string }[] = [];
  let withCatCount = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE).map(p => p.id);
    const resp = await blRequest('getInventoryProductsData', {
      inventory_id: BTP_INVENTORY_ID,
      products: batch,
    });
    
    for (const [id, data] of Object.entries(resp.products || {}) as [string, any][]) {
      const numId = parseInt(id);
      const catId = data.category_id || 0;
      // Name can be in text_fields or directly, or from list
      const name = data.text_fields?.name || data.name || nameById.get(numId) || '';
      if (!catId || catId === 0) {
        withoutCat.push({ id: numId, sku: data.sku || '', name });
      } else {
        withCatCount++;
      }
    }
    
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allProducts.length / BATCH_SIZE);
    console.log(`   Batch ${batchNum}/${totalBatches}: z kat: ${withCatCount}, bez: ${withoutCat.length}`);
  }

  console.log(`\n📊 BTP na BL: ${allProducts.length} łącznie | ${withCatCount} z kat | ${withoutCat.length} bez kat`);

  // Build Excel rows
  console.log('\n📝 Generowanie pliku Excel...');
  
  const rows: string[] = [];
  // Header
  rows.push('SKU;EAN;Nazwa produktu (BL);Kategoria BTP (główna);Kategoria BTP (podkategoria);Proponowana kategoria sklepu;Slug kategorii;BL Category ID;Status');

  let mapped = 0;
  let nocsv = 0;
  let nomapping = 0;
  let noblcat = 0;

  for (const product of withoutCat) {
    const csvInfo = csvBySku.get(product.sku);
    
    if (!csvInfo) {
      // Product not in CSV
      rows.push([
        product.sku,
        '',
        `"${product.name.replace(/"/g, '""')}"`,
        '',
        '',
        '',
        '',
        '',
        'BRAK W CSV'
      ].join(';'));
      nocsv++;
      continue;
    }
    
    // Find mapping
    const mappingKey = csvInfo.primary + ' > ' + csvInfo.group;
    const mapping = mappingRules.get(mappingKey);
    
    if (!mapping) {
      rows.push([
        product.sku,
        csvInfo.ean,
        `"${product.name.replace(/"/g, '""')}"`,
        csvInfo.primary,
        csvInfo.group,
        '',
        '',
        '',
        'BRAK MAPOWANIA'
      ].join(';'));
      nomapping++;
      continue;
    }
    
    // Find BL category ID
    const catInfo = slugToInfo.get(mapping.subSlug);
    if (!catInfo) {
      rows.push([
        product.sku,
        csvInfo.ean,
        `"${product.name.replace(/"/g, '""')}"`,
        csvInfo.primary,
        csvInfo.group,
        mapping.comment,
        mapping.subSlug,
        '',
        'BRAK BL CAT ID'
      ].join(';'));
      noblcat++;
      continue;
    }
    
    rows.push([
      product.sku,
      csvInfo.ean,
      `"${product.name.replace(/"/g, '""')}"`,
      csvInfo.primary,
      csvInfo.group,
      catInfo.fullName,
      mapping.subSlug,
      catInfo.blCatId,
      'OK'
    ].join(';'));
    mapped++;
  }

  // Write to file
  const outputPath = path.join(__dirname, '../../btp-category-export.csv');
  // Write with BOM for Excel compatibility
  const BOM = '\uFEFF';
  fs.writeFileSync(outputPath, BOM + rows.join('\n'), 'utf-8');

  console.log(`\n✅ Zapisano: ${outputPath}`);
  console.log(`   Wierszy: ${rows.length - 1} (bez nagłówka)`);
  console.log(`   ✅ Zmapowane: ${mapped}`);
  console.log(`   📭 Brak w CSV: ${nocsv}`);
  console.log(`   ❓ Brak mapowania: ${nomapping}`);
  console.log(`   🚫 Brak BL cat ID: ${noblcat}`);

  await prisma.$disconnect();
}

main();
