/**
 * Update Baselinker products with dimensions extracted from xlsx descriptions.
 * Products are from Hurtownia Sportowa (inventory 26746).
 * produkt_id from xlsx = Baselinker product_id directly.
 * 
 * Baselinker API addInventoryProduct:
 *   height, width, length - in cm
 *   weight - in kg
 */
require('dotenv').config();
const XLSX = require('xlsx');
const path = require('path');

const BL_TOKEN = process.env.BASELINKER_API_TOKEN;
const INVENTORY_ID = 26746;
const XLSX_PATH = 'C:\\Users\\Pracownik Biuro 1\\Downloads\\wx.xlsx';

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

function extractDimensions(text) {
  const result = { width: null, height: null, depth: null, unit: null };

  // RULE 1: "Szerokość/Wysokość/Głębokość produktu: N mm"
  const szProd = text.match(/Szerokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const wysProd = text.match(/Wysokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const glProd = text.match(/Głębokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  if (szProd || wysProd || glProd) {
    if (szProd) result.width = parseFloat(normNum(szProd[1]));
    if (wysProd) result.height = parseFloat(normNum(wysProd[1]));
    if (glProd) result.depth = parseFloat(normNum(glProd[1]));
    result.unit = 'mm';
    return result;
  }

  // RULE 2: "wymiary: NxNxN cm/mm"
  const wymAxBxC = text.match(/wymiar[yó]\s*(?:zewnętrzne|produktu|zestawu|po złożeniu|rozłożon[a-z]*)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxBxC) {
    result.width = parseFloat(normNum(wymAxBxC[1]));
    result.depth = parseFloat(normNum(wymAxBxC[2]));
    result.height = parseFloat(normNum(wymAxBxC[3]));
    result.unit = wymAxBxC[4];
    return result;
  }

  // RULE 3: "wymiary: NxN cm/mm" (2D)
  const wymAxB = text.match(/wymiar[yó]\s*(?:siedziska|blatu|produktu)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxB) {
    result.width = parseFloat(normNum(wymAxB[1]));
    result.depth = parseFloat(normNum(wymAxB[2]));
    result.unit = wymAxB[3];
    return result;
  }

  // RULE 4: Labeled dims
  const dlLabel = text.match(/długość\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const szLabel = text.match(/szerokość\s*(?:kierownicy)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const wysLabel = text.match(/wysokość\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if ((dlLabel && szLabel) || (dlLabel && wysLabel) || (szLabel && wysLabel)) {
    if (dlLabel) result.depth = parseFloat(normNum(dlLabel[1]));
    if (szLabel) result.width = parseFloat(normNum(szLabel[1]));
    if (wysLabel) result.height = parseFloat(normNum(wysLabel[1]));
    result.unit = (dlLabel || szLabel || wysLabel)[2];
    return result;
  }

  // RULE 5: Standalone NxNxN cm/mm (not wheel/deck)
  const standaloneAxBxC = text.match(/(?<!k[oó]ł[aek]?\s*[:(]?\s*)(?<!deck\s*[:(]?\s*)(?<!podest\s*[:(]?\s*)(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)(?!\s*(?:PU|kauczuk))/i);
  if (standaloneAxBxC) {
    result.width = parseFloat(normNum(standaloneAxBxC[1]));
    result.depth = parseFloat(normNum(standaloneAxBxC[2]));
    result.height = parseFloat(normNum(standaloneAxBxC[3]));
    result.unit = standaloneAxBxC[4];
    return result;
  }

  // RULE 6: "Wysokość (min/max)" + "Szerokość/Głębokość produktu"
  const wysMin = text.match(/Wysokość\s*\(min\)\s*:\s*(\d+[\.,]?\d*)\s*cm/i);
  const wysMax = text.match(/Wysokość\s*\(max\)\s*:\s*(\d+[\.,]?\d*)\s*cm/i);
  const szProd2 = text.match(/Szerokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const glProd2 = text.match(/Głębokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  if ((wysMin || wysMax) && (szProd2 || glProd2)) {
    if (szProd2) result.width = parseFloat(normNum(szProd2[1]));
    if (glProd2) result.depth = parseFloat(normNum(glProd2[1]));
    if (wysMax) result.height = parseFloat(normNum(wysMax[1])) * 10;
    else if (wysMin) result.height = parseFloat(normNum(wysMin[1])) * 10;
    result.unit = 'mm';
    return result;
  }

  // RULE 7: Height + length (scooters)
  const wysKier = text.match(/[Ww]ysokość\s*(?:kierownicy)?\s*(?:od podłogi)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(?:-\s*(\d+[\.,]?\d*)\s*)?(cm|mm)/i);
  if (wysKier) {
    const val = wysKier[2] ? wysKier[2] : wysKier[1];
    result.height = parseFloat(normNum(val));
    result.unit = wysKier[3];
    const dlLen = text.match(/(?:długość|dł\.?)\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
    if (dlLen) result.depth = parseFloat(normNum(dlLen[1]));
    return result;
  }

  // RULE 8: Diameter (round objects like medicine balls)
  const srednica = text.match(/(?:średnic[aąeęy]|⌀)\s*(?:ok\.?\s*)?[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (srednica) {
    const d = parseFloat(normNum(srednica[1]));
    result.width = d;
    result.depth = d;
    result.height = d;
    result.unit = srednica[2];
    return result;
  }

  // RULE 9: Seat dims
  const szSiedz = text.match(/Szerokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  const glSiedz = text.match(/Głębokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  if (szSiedz && glSiedz) {
    result.width = parseFloat(normNum(szSiedz[1]));
    result.depth = parseFloat(normNum(glSiedz[1]));
    result.unit = 'cm';
    return result;
  }

  // RULE 10: blatu (SxG)
  const blatSxG = text.match(/blatu\s*\(S\s*x\s*G\)\s*:\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(mm|cm)/i);
  if (blatSxG) {
    result.width = parseFloat(normNum(blatSxG[1]));
    result.depth = parseFloat(normNum(blatSxG[2]));
    result.unit = blatSxG[3];
    const hProd = text.match(/Wysokość\s*(?:produktu)?\s*:\s*(\d+[\.,]?\d*)\s*(mm|cm)/i);
    if (hProd) {
      result.height = parseFloat(normNum(hProd[1]));
      if (hProd[2] === 'cm' && result.unit === 'mm') result.height *= 10;
    }
    return result;
  }

  // RULE 11: Chair Wysokość(max) + Szerokość siedziska
  const wysMaxDot = text.match(/Wysokość\s*\(max\.?\)\s*[.:]\s*(\d+[\.,]?\d*)\s*cm/i);
  const szSiedz2 = text.match(/Szerokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  if (wysMaxDot && szSiedz2) {
    result.height = parseFloat(normNum(wysMaxDot[1]));
    result.width = parseFloat(normNum(szSiedz2[1]));
    const glSiedz2 = text.match(/Głębokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
    if (glSiedz2) result.depth = parseFloat(normNum(glSiedz2[1]));
    result.unit = 'cm';
    return result;
  }

  return null;
}

// Convert to cm for Baselinker
function toCm(value, unit) {
  if (!value) return null;
  if (unit === 'mm') return value / 10;
  return value; // already cm
}

async function main() {
  if (!BL_TOKEN) { console.error('Brak BASELINKER_API_TOKEN'); process.exit(1); }

  // Read xlsx
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Extract dimensions for products that have them
  const productsToUpdate = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const productId = row[0]; // produkt_id = Baselinker product ID
    const desc = stripHtml(row[9]);
    const dims = extractDimensions(desc);

    if (dims && (dims.width || dims.height || dims.depth)) {
      const width = toCm(dims.width, dims.unit);
      const height = toCm(dims.height, dims.unit);
      const length = toCm(dims.depth, dims.unit);
      productsToUpdate.push({ productId, width, height, length, name: (row[1] || '').substring(0, 50) });
    }
  }

  console.log(`Produktów z wymiarami do aktualizacji: ${productsToUpdate.length}`);
  console.log(`Przykłady:`);
  productsToUpdate.slice(0, 5).forEach(p => {
    console.log(`  ID=${p.productId} W=${p.width}cm H=${p.height}cm L=${p.length}cm - ${p.name}`);
  });

  // Verify first product exists in BL
  console.log('\nWeryfikacja - sprawdzam pierwszy produkt w Baselinker...');
  const checkResp = await blRequest('getInventoryProductsData', {
    inventory_id: INVENTORY_ID,
    products: [productsToUpdate[0].productId]
  });
  const checkProd = Object.values(checkResp.products || {})[0];
  if (checkProd) {
    console.log(`  OK: "${checkProd.name}" (obecne: W=${checkProd.width} H=${checkProd.height} L=${checkProd.length})`);
  } else {
    console.log('  UWAGA: Produkt nie znaleziony! Sprawdź czy ID jest poprawne.');
    process.exit(1);
  }

  // Ask for confirmation
  console.log(`\nGotowy do aktualizacji ${productsToUpdate.length} produktów. Uruchom z --go żeby wykonać.`);
  if (!process.argv.includes('--go')) {
    console.log('(dry run - dodaj --go żeby zapisać)');
    return;
  }

  // Update products
  let updated = 0, errors = 0;
  for (const p of productsToUpdate) {
    const params = {
      inventory_id: INVENTORY_ID,
      product_id: p.productId,
    };
    if (p.height) params.height = p.height;
    if (p.width) params.width = p.width;
    if (p.length) params.length = p.length;

    try {
      await blRequest('addInventoryProduct', params);
      updated++;
      if (updated % 20 === 0) console.log(`  Zaktualizowano ${updated}/${productsToUpdate.length}...`);
    } catch (err) {
      console.error(`  [ERR] ID=${p.productId}: ${err.message}`);
      errors++;
    }
    await sleep(200);
  }

  console.log(`\n=== GOTOWE ===`);
  console.log(`Zaktualizowano: ${updated}`);
  console.log(`Błędy: ${errors}`);
}

main().catch(err => { console.error(err); process.exit(1); });
