require('dotenv').config();
const fs = require('fs');

const CSV_PATH = 'C:\\Users\\Pracownik Biuro 1\\Downloads\\BL__PRODUKTY_WACIWY__2026-05-14_08_43.csv';

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

// Same extractDimensions/extractWeight from _update-sport-dims2.js
function normNum(s) { return s.replace(',', '.'); }

function extractDimensions(text) {
  const szProd = text.match(/Szerokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const wysProd = text.match(/Wysokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const glProd = text.match(/Głębokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  if (szProd || wysProd || glProd) return true;

  const wymAxBxC = text.match(/wymiar[yó]\s*(?:zewnętrzne|produktu|zestawu|po złożeniu|rozłożon[a-z]*)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxBxC) return true;

  const wymAxB = text.match(/wymiar[yó]\s*(?:siedziska|blatu|produktu)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxB) return true;

  const dlLabel = text.match(/długość\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const szLabel = text.match(/szerokość\s*(?:kierownicy)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const wysLabel = text.match(/wysokość\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if ((dlLabel && szLabel) || (dlLabel && wysLabel) || (szLabel && wysLabel)) return true;

  const s3d = text.match(/(?<!k[oó]ł[aek]?\s*[:(]?\s*)(?<!deck\s*[:(]?\s*)(?<!podest\s*[:(]?\s*)(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)(?!\s*(?:PU|kauczuk))/i);
  if (s3d) return true;

  const wysMin = text.match(/Wysokość\s*\(min\)\s*:\s*(\d+[\.,]?\d*)\s*cm/i);
  const wysMax = text.match(/Wysokość\s*\(max\)\s*:\s*(\d+[\.,]?\d*)\s*cm/i);
  const szProd2 = text.match(/Szerokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const glProd2 = text.match(/Głębokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  if ((wysMin || wysMax) && (szProd2 || glProd2)) return true;

  const wysKier = text.match(/[Ww]ysokość\s*(?:kierownicy)?\s*(?:od podłogi)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(?:-\s*(\d+[\.,]?\d*)\s*)?(cm|mm)/i);
  if (wysKier) return true;

  const srednica = text.match(/(?:średnic[aąeęy]|⌀)\s*(?:ok\.?\s*)?[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (srednica) return true;

  const szSiedz = text.match(/Szerokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  const glSiedz = text.match(/Głębokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  if (szSiedz && glSiedz) return true;

  const blatSxG = text.match(/blatu\s*\(S\s*x\s*G\)\s*:\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(mm|cm)/i);
  if (blatSxG) return true;

  const wysMaxDot = text.match(/Wysokość\s*\(max\.?\)\s*[.:]\s*(\d+[\.,]?\d*)\s*cm/i);
  const szSiedz2 = text.match(/Szerokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  if (wysMaxDot && szSiedz2) return true;

  return false;
}

function extractWeight(text) {
  const wp = text.match(/Waga produktu\s*[:(]?\s*(\d+[\.,]?\d*)\s*(kg|g)\b/i);
  if (wp) return true;
  const allWaga = [...text.matchAll(/(?:Waga|waga)\s*[:(]\s*(\d+[\.,]?\d*)\s*(kg|g)\b/gi)];
  for (const m of allWaga) {
    const before = text.substring(Math.max(0, m.index - 40), m.index).toLowerCase();
    if (before.includes('użytkownik') || before.includes('max') || before.includes('maks') || before.includes('obciąż') || before.includes('limit')) continue;
    return true;
  }
  const wn = text.match(/Waga netto\s*[:(]?\s*(\d+[\.,]?\d*)\s*(kg|g)\b/i);
  if (wn) return true;
  return false;
}

const content = fs.readFileSync(CSV_PATH, 'utf8');
const lines = parseCsvRows(content);

// Find products without dims or weight and look for patterns
const missingDims = [];
const missingWeight = [];

for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  const desc = stripHtml(cols[9]);
  const name = (cols[1] || '').substring(0, 60);
  
  if (!extractDimensions(desc)) missingDims.push({ name, desc, id: cols[0] });
  if (!extractWeight(desc)) missingWeight.push({ name, desc, id: cols[0] });
}

console.log(`Brak wymiarow: ${missingDims.length} / ${lines.length - 1}`);
console.log(`Brak wagi: ${missingWeight.length} / ${lines.length - 1}`);

// Search for dimension-like patterns in unmatched descriptions
const dimPatterns = {};
const weightPatterns = {};

for (const p of missingDims) {
  // Look for NxN patterns without unit
  const nxn = p.desc.match(/(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(x\s*(\d+[\.,]?\d*))?\s*(cm|mm|m\b)?/i);
  if (nxn) {
    const ctx = p.desc.substring(Math.max(0, nxn.index - 30), nxn.index + nxn[0].length + 20);
    const key = ctx.replace(/\d+/g, 'N').substring(0, 60);
    dimPatterns[key] = (dimPatterns[key] || 0) + 1;
  }
  
  // Look for standalone dimensions
  const sz = p.desc.match(/(rozm|size|dim)[^.]{0,50}(\d+)/i);
  if (sz) {
    const key = p.desc.substring(sz.index, sz.index + 60).replace(/\d+/g, 'N');
    dimPatterns[key] = (dimPatterns[key] || 0) + 1;
  }

  // Height/width/length mentions
  const hw = p.desc.match(/(wysoko|szeroko|d[łl]ugo|grubo)[^.]{0,60}/i);
  if (hw) {
    const key = hw[0].replace(/\d+[\.,]?\d*/g, 'N').substring(0, 70);
    dimPatterns[key] = (dimPatterns[key] || 0) + 1;
  }
}

for (const p of missingWeight) {
  const wm = p.desc.match(/(wag[aąę]|masa|weight|gram)[^.]{0,60}/i);
  if (wm) {
    const before = p.desc.substring(Math.max(0, wm.index - 10), wm.index);
    const key = (before + wm[0]).replace(/\d+[\.,]?\d*/g, 'N').substring(0, 80);
    weightPatterns[key] = (weightPatterns[key] || 0) + 1;
  }
}

console.log('\n=== TOP WZORCE WYMIAROW (nieznalezione) ===');
Object.entries(dimPatterns).sort((a,b) => b[1] - a[1]).slice(0, 30).forEach(([k,v]) => console.log(`  [${v}x] ${k}`));

console.log('\n=== TOP WZORCE WAGI (nieznalezione) ===');
Object.entries(weightPatterns).sort((a,b) => b[1] - a[1]).slice(0, 20).forEach(([k,v]) => console.log(`  [${v}x] ${k}`));

// Show some examples of unmatched products with dimension-like info
console.log('\n=== PRZYKLADOWE OPISY BEZ WYMIAROW (z podejrzanymi wzorcami) ===');
let shown = 0;
for (const p of missingDims) {
  if (shown >= 20) break;
  const hasNum = p.desc.match(/(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)/);
  const hasDim = p.desc.match(/(wysoko|szeroko|d[łl]ugo|rozmi|grubo)/i);
  if (hasNum || hasDim) {
    const snippet = p.desc.substring(0, 200);
    console.log(`\n  [${p.id}] ${p.name}`);
    console.log(`    ${snippet}`);
    shown++;
  }
}

// Weight examples
console.log('\n=== PRZYKLADOWE OPISY BEZ WAGI ===');
shown = 0;
for (const p of missingWeight) {
  if (shown >= 15) break;
  const hasW = p.desc.match(/(wag|masa|gram|weight|\d+[\.,]?\d*\s*kg)/i);
  if (hasW) {
    const idx = hasW.index;
    const snippet = p.desc.substring(Math.max(0, idx - 20), idx + 80);
    console.log(`  [${p.id}] ${p.name}`);
    console.log(`    ...${snippet}...`);
    shown++;
  }
}
