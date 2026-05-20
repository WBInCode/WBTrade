/**
 * Extract dimensions and weight from Kuchcikowo CSV and update in Baselinker.
 * Inventory ID: 28333
 * Mapping: CSV "Modelproduktu" (field 12) → BL product SKU
 * 
 * Usage:
 *   node _update-kuchcikowo-dims.js           # dry run
 *   node _update-kuchcikowo-dims.js --go      # upload
 *   node _update-kuchcikowo-dims.js --go --skip N  # resume from N
 */
require('dotenv').config();
const fs = require('fs');

const BL_TOKEN = process.env.BASELINKER_API_TOKEN;
const INVENTORY_ID = 28333;
const CSV_PATH = 'C:\\Users\\Pracownik Biuro 1\\Downloads\\6a0c57fbcf68bc9c835babfd671ff758.csv';

async function blRequest(method, params = {}) {
  const fd = new URLSearchParams();
  fd.append('method', method);
  fd.append('parameters', JSON.stringify(params));
  const r = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'X-BLToken': BL_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: fd.toString()
  });
  const data = await r.json();
  if (data.status === 'ERROR') throw new Error(`BL API: ${data.error_message}`);
  return data;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- CSV Parsing ----

function parseCsvRows(content) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      if (current.trim()) rows.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ';' && !inQuotes) {
      result.push(current); current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

function stripHtml(s) {
  return (s || '').toString()
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&oacute;/g, 'ó')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normNum(s) { return s.replace(',', '.'); }

// ---- Dimension Extraction (adapted for kuchcikowo kitchen products) ----

function extractDimensions(text, name) {
  name = name || '';

  // RULE 1: "długość: N cm / szerokość: N cm / wysokość: N cm"
  const dlLabel = text.match(/d[łl]ugo[śs][ćc]:?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const szLabel = text.match(/szeroko[śs][ćc]:?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const wysLabel = text.match(/wysoko[śs][ćc]:?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const grLabel = text.match(/grubo[śs][ćc]:?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if ((dlLabel && szLabel) || (dlLabel && wysLabel) || (szLabel && wysLabel)) {
    const toC = (m) => m ? parseFloat(normNum(m[1])) / (m[2] === 'mm' ? 10 : 1) : null;
    return { width: toC(szLabel), height: toC(wysLabel) || toC(grLabel), depth: toC(dlLabel) };
  }

  // RULE 2: "wymiary: NxNxN cm"
  const wymAxBxC = text.match(/wymiar[yó]\s*(?:[^:]*?)\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxBxC) {
    const div = wymAxBxC[4] === 'mm' ? 10 : 1;
    return { width: parseFloat(normNum(wymAxBxC[1])) / div, depth: parseFloat(normNum(wymAxBxC[2])) / div, height: parseFloat(normNum(wymAxBxC[3])) / div };
  }

  // RULE 3: "wymiary: NxN cm"
  const wymAxB = text.match(/wymiar[yó]\s*(?:[^:]*?)\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxB) {
    const div = wymAxB[3] === 'mm' ? 10 : 1;
    return { width: parseFloat(normNum(wymAxB[1])) / div, depth: parseFloat(normNum(wymAxB[2])) / div, height: null };
  }

  // RULE 4: "Ø N cm x N cm" (pots/pans: diameter x height)
  const diaXh = text.match(/[ØOø]\s*(\d+[\.,]?\d*)\s*(?:cm)?\s*x\s*(\d+[\.,]?\d*)\s*cm/i);
  if (diaXh) {
    const d = parseFloat(normNum(diaXh[1]));
    const h = parseFloat(normNum(diaXh[2]));
    return { width: d, depth: d, height: h };
  }

  // RULE 5: NxNxN cm (standalone 3D without "wymiary" prefix)
  const s3d = text.match(/(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (s3d) {
    const div = s3d[4] === 'mm' ? 10 : 1;
    return { width: parseFloat(normNum(s3d[1])) / div, depth: parseFloat(normNum(s3d[2])) / div, height: parseFloat(normNum(s3d[3])) / div };
  }

  // RULE 6: "średnica N cm" (round products)
  const srednica = text.match(/[śs]rednic[aąeęy]?\s*:?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (srednica) {
    const d = parseFloat(normNum(srednica[1])) / (srednica[2] === 'mm' ? 10 : 1);
    return { width: d, depth: d, height: null };
  }

  // RULE 7: NxN cm standalone 2D (e.g. "20 x 4,5cm" in description/name)
  const s2d = text.match(/(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (s2d) {
    const div = s2d[3] === 'mm' ? 10 : 1;
    const a = parseFloat(normNum(s2d[1])) / div;
    const b = parseFloat(normNum(s2d[2])) / div;
    // If b is small relative to a, it's likely width x height (e.g. pan diameter x depth)
    if (b < a * 0.5) return { width: a, depth: a, height: b };
    return { width: a, depth: b, height: null };
  }

  // RULE 8: Dimensions from product name "NxNxNcm" or "NxNcm"
  const nameAxBxC = name.match(/(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*cm/i);
  if (nameAxBxC) {
    return { width: parseFloat(normNum(nameAxBxC[1])), depth: parseFloat(normNum(nameAxBxC[2])), height: parseFloat(normNum(nameAxBxC[3])) };
  }
  const nameAxB = name.match(/(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*cm/i);
  if (nameAxB) {
    const a = parseFloat(normNum(nameAxB[1]));
    const b = parseFloat(normNum(nameAxB[2]));
    if (b < a * 0.5) return { width: a, depth: a, height: b };
    return { width: a, depth: b, height: null };
  }

  // RULE 9: Diameter from name "Ncm" after Ø or śr (e.g. "33cm" in pizza pan names)
  const nameDia = name.match(/[ØOø]\s*(\d+[\.,]?\d*)\s*cm/i);
  if (nameDia) {
    const d = parseFloat(normNum(nameDia[1]));
    return { width: d, depth: d, height: null };
  }

  return null;
}

function extractWeight(text, weightCol) {
  // Priority 1: Weight column from CSV (in kg)
  if (weightCol) {
    const val = parseFloat(weightCol.replace(',', '.'));
    if (val && val > 0 && val <= 200) return val;
  }

  // Priority 2: From description
  const allWaga = [...text.matchAll(/(?:Waga|waga|MASA|masa)\s*[-:( ]\s*(?:ok\.?\s*)?(\d+[\.,]?\d*)\s*(kg|g|gram)\b/gi)];
  for (const m of allWaga) {
    const before = text.substring(Math.max(0, m.index - 40), m.index).toLowerCase();
    if (before.includes('użytkownik') || before.includes('max') || before.includes('maks') || before.includes('obciąż')) continue;
    let val = parseFloat(m[1].replace(',', '.'));
    if (m[2] === 'g' || m[2] === 'gram') val /= 1000;
    if (val >= 0.05 && val <= 200) return val;
  }

  return null;
}

// ---- Main ----

async function main() {
  if (!BL_TOKEN) { console.error('Brak BASELINKER_API_TOKEN'); process.exit(1); }

  // Step 1: Parse CSV
  console.log('Parsowanie CSV...');
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = parseCsvRows(content);
  console.log(`Produktow w CSV: ${lines.length - 1}`);

  // Build map: SKU (Modelproduktu) → { dims, weight, name }
  const csvData = new Map(); // key = model (SKU in BL)
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const model = (cols[12] || '').trim(); // Modelproduktu = BL SKU
    if (!model) continue;
    const name = (cols[1] || '').trim();
    const desc = stripHtml(cols[5] || '');
    const weightCol = (cols[10] || '').trim();

    const dims = extractDimensions(desc, name);
    const weight = extractWeight(desc, weightCol);

    if ((dims && (dims.width || dims.height || dims.depth)) || weight) {
      csvData.set(model, { name, dims, weight });
    }
  }
  console.log(`Produktow z wymiarami/waga w CSV: ${csvData.size}`);

  // Step 2: Fetch all BL products from inventory to get BL_ID by SKU
  console.log('\nPobieranie produktow z Baselinkera (inv 28333)...');
  let page = 1;
  const skuToBLId = new Map(); // SKU → BL product ID
  while (true) {
    const res = await blRequest('getInventoryProductsList', { inventory_id: INVENTORY_ID, page });
    const products = res.products || {};
    const ids = Object.keys(products);
    if (ids.length === 0) break;
    for (const id of ids) {
      const p = products[id];
      if (p.sku) skuToBLId.set(p.sku, id);
    }
    console.log(`  Strona ${page}: ${ids.length} produktow (total: ${skuToBLId.size})`);
    page++;
    await sleep(300);
  }
  console.log(`Produktow w BL: ${skuToBLId.size}`);

  // Step 3: Match CSV → BL
  const productsToUpdate = [];
  for (const [sku, data] of csvData) {
    const blId = skuToBLId.get(sku);
    if (!blId) continue; // not in BL inventory
    productsToUpdate.push({
      productId: blId,
      sku,
      name: data.name.substring(0, 50),
      width: data.dims?.width || null,
      height: data.dims?.height || null,
      length: data.dims?.depth || null,
      weight: data.weight || null,
    });
  }

  console.log(`\nDo aktualizacji (matched): ${productsToUpdate.length}`);
  const withDims = productsToUpdate.filter(p => p.width || p.height || p.length).length;
  const withWeight = productsToUpdate.filter(p => p.weight).length;
  console.log(`  z wymiarami: ${withDims}`);
  console.log(`  z waga: ${withWeight}`);
  console.log('\nPrzykladowe:');
  productsToUpdate.slice(0, 15).forEach(p => {
    console.log(`  BL=${p.productId} SKU=${p.sku} W=${p.width}cm H=${p.height}cm L=${p.length}cm waga=${p.weight}kg - ${p.name}`);
  });

  if (!process.argv.includes('--go')) {
    console.log('\n(dry run - dodaj --go zeby zapisac)');
    return;
  }

  // --skip N to resume from position N
  const skipIdx = process.argv.findIndex(a => a === '--skip');
  const skip = skipIdx > -1 ? parseInt(process.argv[skipIdx + 1]) || 0 : 0;
  if (skip > 0) console.log(`\nPomijam pierwsze ${skip} produktow...`);

  let updated = 0, errors = 0;
  for (let i = 0; i < productsToUpdate.length; i++) {
    if (i < skip) continue;
    const p = productsToUpdate[i];
    const params = { inventory_id: INVENTORY_ID, product_id: p.productId };
    if (p.height) params.height = p.height;
    if (p.width) params.width = p.width;
    if (p.length) params.length = p.length;
    if (p.weight) params.weight = p.weight;

    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await blRequest('addInventoryProduct', params);
        updated++;
        success = true;
        if (updated % 20 === 0) console.log(`  Zaktualizowano ${updated}/${productsToUpdate.length - skip}... (idx ${i})`);
        break;
      } catch (err) {
        if (err.message.includes('limit exceeded') && attempt < 2) {
          console.log(`  [RATE LIMIT] idx=${i}, czekam 120s...`);
          await sleep(120000);
        } else {
          console.error(`  [ERR] BL_ID=${p.productId} SKU=${p.sku}: ${err.message}`);
          errors++;
          break;
        }
      }
    }
    if (success) await sleep(500);
  }

  console.log(`\n=== GOTOWE ===`);
  console.log(`Zaktualizowano: ${updated}`);
  console.log(`Bledy: ${errors}`);
}

main().catch(err => { console.error(err); process.exit(1); });
