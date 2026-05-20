/**
 * Extract dimensions and weight from BL CSV and update in Baselinker.
 * Same logic as _update-sport-dims.js + _update-sport-weight.js combined.
 */
require('dotenv').config();
const fs = require('fs');

const BL_TOKEN = process.env.BASELINKER_API_TOKEN;
const INVENTORY_ID = 26746;
const CSV_PATH = 'C:\\Users\\Pracownik Biuro 1\\Downloads\\BL__PRODUKTY_WACIWY__2026-05-14_08_43.csv';

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

function extractDimensions(text, name) {
  name = name || '';
  // RULE 1: "Szerokość/Wysokość/Głębokość produktu: N mm"
  const szProd = text.match(/Szerokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const wysProd = text.match(/Wysokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const glProd = text.match(/Głębokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  if (szProd || wysProd || glProd) {
    return {
      width: szProd ? parseFloat(normNum(szProd[1])) / 10 : null,
      height: wysProd ? parseFloat(normNum(wysProd[1])) / 10 : null,
      depth: glProd ? parseFloat(normNum(glProd[1])) / 10 : null,
    };
  }

  // RULE 2: "wymiary: NxNxN cm/mm"
  const wymAxBxC = text.match(/wymiar[yó]\s*(?:zewnętrzne|produktu|zestawu|po złożeniu|rozłożon[a-z]*)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxBxC) {
    const div = wymAxBxC[4] === 'mm' ? 10 : 1;
    return { width: parseFloat(normNum(wymAxBxC[1])) / div, depth: parseFloat(normNum(wymAxBxC[2])) / div, height: parseFloat(normNum(wymAxBxC[3])) / div };
  }

  // RULE 3: "wymiary: NxN cm/mm"
  const wymAxB = text.match(/wymiar[yó]\s*(?:siedziska|blatu|produktu)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxB) {
    const div = wymAxB[3] === 'mm' ? 10 : 1;
    return { width: parseFloat(normNum(wymAxB[1])) / div, depth: parseFloat(normNum(wymAxB[2])) / div, height: null };
  }

  // RULE 4: Labeled dims
  const dlLabel = text.match(/długość\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const szLabel = text.match(/szerokość\s*(?:kierownicy)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const wysLabel = text.match(/wysokość\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if ((dlLabel && szLabel) || (dlLabel && wysLabel) || (szLabel && wysLabel)) {
    const toC = (m) => m ? parseFloat(normNum(m[1])) / (m[2] === 'mm' ? 10 : 1) : null;
    return { width: toC(szLabel), height: toC(wysLabel), depth: toC(dlLabel) };
  }

  // RULE 5: Standalone NxNxN cm/mm
  const s3d = text.match(/(?<!k[oó]ł[aek]?\s*[:(]?\s*)(?<!deck\s*[:(]?\s*)(?<!podest\s*[:(]?\s*)(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)(?!\s*(?:PU|kauczuk))/i);
  if (s3d) {
    const div = s3d[4] === 'mm' ? 10 : 1;
    return { width: parseFloat(normNum(s3d[1])) / div, depth: parseFloat(normNum(s3d[2])) / div, height: parseFloat(normNum(s3d[3])) / div };
  }

  // RULE 6: "Wysokość (min/max)" + "Szerokość/Głębokość produktu"
  const wysMin = text.match(/Wysokość\s*\(min\)\s*:\s*(\d+[\.,]?\d*)\s*cm/i);
  const wysMax = text.match(/Wysokość\s*\(max\)\s*:\s*(\d+[\.,]?\d*)\s*cm/i);
  const szProd2 = text.match(/Szerokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const glProd2 = text.match(/Głębokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  if ((wysMin || wysMax) && (szProd2 || glProd2)) {
    return {
      width: szProd2 ? parseFloat(normNum(szProd2[1])) / 10 : null,
      depth: glProd2 ? parseFloat(normNum(glProd2[1])) / 10 : null,
      height: wysMax ? parseFloat(normNum(wysMax[1])) : (wysMin ? parseFloat(normNum(wysMin[1])) : null),
    };
  }

  // RULE 7: Height + length (scooters)
  const wysKier = text.match(/[Ww]ysokość\s*(?:kierownicy)?\s*(?:od podłogi)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(?:-\s*(\d+[\.,]?\d*)\s*)?(cm|mm)/i);
  if (wysKier) {
    const val = wysKier[2] ? wysKier[2] : wysKier[1];
    const div = wysKier[3] === 'mm' ? 10 : 1;
    const dlLen = text.match(/(?:długość|dł\.?)\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
    return {
      width: null,
      height: parseFloat(normNum(val)) / div,
      depth: dlLen ? parseFloat(normNum(dlLen[1])) / (dlLen[2] === 'mm' ? 10 : 1) : null,
    };
  }

  // RULE 8: Diameter (round objects)
  const srednica = text.match(/(?:średnic[aąeęy]|⌀)\s*(?:ok\.?\s*)?[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (srednica) {
    const d = parseFloat(normNum(srednica[1])) / (srednica[2] === 'mm' ? 10 : 1);
    return { width: d, depth: d, height: d };
  }

  // RULE 9: Seat dims
  const szSiedz = text.match(/Szerokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  const glSiedz = text.match(/Głębokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  if (szSiedz && glSiedz) {
    return { width: parseFloat(normNum(szSiedz[1])), depth: parseFloat(normNum(glSiedz[1])), height: null };
  }

  // RULE 10: blatu (SxG)
  const blatSxG = text.match(/blatu\s*\(S\s*x\s*G\)\s*:\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(mm|cm)/i);
  if (blatSxG) {
    const div = blatSxG[3] === 'mm' ? 10 : 1;
    const hProd = text.match(/Wysokość\s*(?:produktu)?\s*:\s*(\d+[\.,]?\d*)\s*(mm|cm)/i);
    return {
      width: parseFloat(normNum(blatSxG[1])) / div,
      depth: parseFloat(normNum(blatSxG[2])) / div,
      height: hProd ? parseFloat(normNum(hProd[1])) / (hProd[2] === 'mm' ? 10 : 1) : null,
    };
  }

  // RULE 11: Chair Wysokość(max) + Szerokość siedziska
  const wysMaxDot = text.match(/Wysokość\s*\(max\.?\)\s*[.:]\s*(\d+[\.,]?\d*)\s*cm/i);
  const szSiedz2 = text.match(/Szerokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  if (wysMaxDot && szSiedz2) {
    const glSiedz2 = text.match(/Głębokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
    return {
      width: parseFloat(normNum(szSiedz2[1])),
      height: parseFloat(normNum(wysMaxDot[1])),
      depth: glSiedz2 ? parseFloat(normNum(glSiedz2[1])) : null,
    };
  }

  // RULE 12: "Rozmiar: N cm x N cm x N cm" or "N cm x N cm x N cm"
  const rozmCm3 = text.match(/(?:Rozmiar|wymiary?)\s*[:(]?\s*(\d+[\.,]?\d*)\s*cm\s*x\s*(\d+[\.,]?\d*)\s*cm\s*x\s*(\d+[\.,]?\d*)\s*cm/i);
  if (rozmCm3) {
    return { width: parseFloat(normNum(rozmCm3[1])), depth: parseFloat(normNum(rozmCm3[2])), height: parseFloat(normNum(rozmCm3[3])) };
  }

  // RULE 13: "Szerokość opakowania: N mm" + "Wysokość opakowania: N mm" (packaging as fallback)
  const szOpak = text.match(/Szerokość opakowania:\s*(\d+[\.,]?\d*)\s*mm/i);
  const wysOpak = text.match(/Wysokość opakowania:\s*(\d+[\.,]?\d*)\s*mm/i);
  const dlOpak = text.match(/(?:Długość|Głębokość) opakowania:\s*(\d+[\.,]?\d*)\s*mm/i);
  if (szOpak && wysOpak) {
    return {
      width: parseFloat(normNum(szOpak[1])) / 10,
      height: parseFloat(normNum(wysOpak[1])) / 10,
      depth: dlOpak ? parseFloat(normNum(dlOpak[1])) / 10 : null,
    };
  }

  // RULE 14: Dimensions in product name "NxNcm" or "NxNxNcm"
  const nameAxBxC = name.match(/(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*cm/i);
  if (nameAxBxC) {
    return { width: parseFloat(normNum(nameAxBxC[1])), depth: parseFloat(normNum(nameAxBxC[2])), height: parseFloat(normNum(nameAxBxC[3])) };
  }
  const nameAxB = name.match(/(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*cm/i);
  if (nameAxB) {
    return { width: parseFloat(normNum(nameAxB[1])), depth: parseFloat(normNum(nameAxB[2])), height: null };
  }

  // RULE 15: "długości N cm" or standalone single dim with unit
  const dlSingle = text.match(/długość(?:i)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (dlSingle) {
    const val = parseFloat(normNum(dlSingle[1])) / (dlSingle[2] === 'mm' ? 10 : 1);
    if (val >= 10 && val <= 500) return { width: null, height: null, depth: val };
  }

  return null;
}

function extractWeight(text) {
  // "Waga produktu: N kg"
  const wp = text.match(/Waga produktu\s*[:(]?\s*(\d+[\.,]?\d*)\s*(kg|g)\b/i);
  if (wp) {
    let val = parseFloat(wp[1].replace(',', '.'));
    if (wp[2] === 'g') val /= 1000;
    if (val >= 0.05 && val <= 100) return val;
  }

  // "Waga:" / "waga:" not preceded by max/użytkownika - also match dash/space separator
  const allWaga = [...text.matchAll(/(?:Waga|waga)\s*[-:( ]\s*(?:ok\.?\s*)?(\d+[\.,]?\d*)\s*(kg|g|gram)\b/gi)];
  for (const m of allWaga) {
    const before = text.substring(Math.max(0, m.index - 40), m.index).toLowerCase();
    if (before.includes('użytkownik') || before.includes('max') || before.includes('maks') || before.includes('obciąż') || before.includes('limit') || before.includes('nadwag') || before.includes('równowag')) continue;
    let val = parseFloat(m[1].replace(',', '.'));
    if (m[2] === 'g' || m[2] === 'gram') val /= 1000;
    if (val >= 0.05 && val <= 100) return val;
  }

  // "Waga netto"
  const wn = text.match(/Waga netto\s*[:(]?\s*(\d+[\.,]?\d*)\s*(kg|g|gram)\b/i);
  if (wn) {
    let val = parseFloat(wn[1].replace(',', '.'));
    if (wn[2] === 'g' || wn[2] === 'gram') val /= 1000;
    if (val >= 0.05 && val <= 100) return val;
  }

  // "Waga całkowita: N gram"
  const wc = text.match(/Waga całkowita\s*[:(]\s*(\d+[\.,]?\d*)\s*(kg|g|gram)\b/i);
  if (wc) {
    let val = parseFloat(wc[1].replace(',', '.'));
    if (wc[2] === 'g' || wc[2] === 'gram') val /= 1000;
    if (val >= 0.05 && val <= 100) return val;
  }

  // "waga kasku w rozmiarze X - N gram" (take first valid)
  const wagaKasku = text.match(/waga\s+(?:kasku|produktu)?\s*(?:w rozmiarze\s*\w+)?\s*[-:]\s*(\d+[\.,]?\d*)\s*(g|gram|kg)\b/i);
  if (wagaKasku) {
    let val = parseFloat(wagaKasku[1].replace(',', '.'));
    if (wagaKasku[2] === 'g' || wagaKasku[2] === 'gram') val /= 1000;
    if (val >= 0.05 && val <= 100) return val;
  }

  return null;
}

function parseCsvRows(content) {
  // Handle multiline quoted fields
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

async function main() {
  if (!BL_TOKEN) { console.error('Brak BASELINKER_API_TOKEN'); process.exit(1); }

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = parseCsvRows(content);
  console.log('Produktow w CSV: ' + (lines.length - 1));

  const productsToUpdate = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const productId = cols[0];
    const name = cols[1] || '';
    const desc = stripHtml(cols[9]);

    const dims = extractDimensions(desc, name);
    const weight = extractWeight(desc);

    if ((dims && (dims.width || dims.height || dims.depth)) || weight) {
      productsToUpdate.push({
        productId,
        name: name.substring(0, 50),
        width: dims?.width || null,
        height: dims?.height || null,
        length: dims?.depth || null,
        weight: weight || null,
      });
    }
  }

  console.log(`Produktow do aktualizacji: ${productsToUpdate.length}`);
  const withDims = productsToUpdate.filter(p => p.width || p.height || p.length).length;
  const withWeight = productsToUpdate.filter(p => p.weight).length;
  console.log(`  z wymiarami: ${withDims}`);
  console.log(`  z waga: ${withWeight}`);
  console.log('\nPrzykladowe:');
  productsToUpdate.slice(0, 10).forEach(p => {
    console.log(`  ID=${p.productId} W=${p.width}cm H=${p.height}cm L=${p.length}cm waga=${p.weight}kg - ${p.name}`);
  });

  if (!process.argv.includes('--go')) {
    console.log('\n(dry run - dodaj --go zeby zapisac)');
    return;
  }

  // --skip N to resume from position N
  const skipIdx = process.argv.findIndex(a => a === '--skip');
  const skip = skipIdx > -1 ? parseInt(process.argv[skipIdx + 1]) || 0 : 0;
  if (skip > 0) console.log(`Pomijam pierwsze ${skip} produktow...`);

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
          console.error(`  [ERR] ID=${p.productId}: ${err.message}`);
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
