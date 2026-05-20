const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile('C:\\Users\\Pracownik Biuro 1\\Downloads\\wx.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

function stripHtml(s) {
  return (s || '').toString()
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&oacute;/g, 'ó')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalize decimal: "12,5" -> 12.5
function normNum(s) {
  return s.replace(',', '.');
}

function extractDimensions(text) {
  const result = { width: null, height: null, depth: null, diameter: null, raw: [] };

  // RULE 1: "Szerokość/Wysokość/Głębokość produktu: N mm" (Huzaro-style structured specs)
  const szProd = text.match(/Szerokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const wysProd = text.match(/Wysokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const glProd = text.match(/Głębokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  if (szProd || wysProd || glProd) {
    if (szProd) result.width = parseFloat(normNum(szProd[1]));
    if (wysProd) result.height = parseFloat(normNum(wysProd[1]));
    if (glProd) result.depth = parseFloat(normNum(glProd[1]));
    result.unit = 'mm';
    result.rule = 'product-dims-mm';
    result.raw.push([szProd?.[0], wysProd?.[0], glProd?.[0]].filter(Boolean).join('; '));
    return result;
  }

  // RULE 2: "Wymiary zewnętrzne: NxNxN cm" or "wymiary: NxNxN cm" or "Wymiary: NxNxN cm"
  const wymAxBxC = text.match(/wymiar[yó]\s*(?:zewnętrzne|produktu|zestawu|po złożeniu|rozłożon[a-z]*)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxBxC) {
    result.width = parseFloat(normNum(wymAxBxC[1]));
    result.depth = parseFloat(normNum(wymAxBxC[2]));
    result.height = parseFloat(normNum(wymAxBxC[3]));
    result.unit = wymAxBxC[4];
    result.rule = 'wymiary-3d';
    result.raw.push(wymAxBxC[0].trim());
    return result;
  }

  // RULE 3: "wymiary: NxN cm" (2D)
  const wymAxB = text.match(/wymiar[yó]\s*(?:siedziska|blatu|produktu)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (wymAxB) {
    result.width = parseFloat(normNum(wymAxB[1]));
    result.depth = parseFloat(normNum(wymAxB[2]));
    result.unit = wymAxB[3];
    result.rule = 'wymiary-2d';
    result.raw.push(wymAxB[0].trim());
    return result;
  }

  // RULE 4: Labeled "Wymiary: długość: N cm szerokość: N cm wysokość: N cm"
  const dlLabel = text.match(/długość\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const szLabel = text.match(/szerokość\s*(?:kierownicy)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  const wysLabel = text.match(/wysokość\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if ((dlLabel && szLabel) || (dlLabel && wysLabel) || (szLabel && wysLabel)) {
    if (dlLabel) result.depth = parseFloat(normNum(dlLabel[1]));
    if (szLabel) result.width = parseFloat(normNum(szLabel[1]));
    if (wysLabel) result.height = parseFloat(normNum(wysLabel[1]));
    result.unit = (dlLabel || szLabel || wysLabel)[2];
    result.rule = 'labeled-dims';
    result.raw.push([dlLabel?.[0], szLabel?.[0], wysLabel?.[0]].filter(Boolean).join('; '));
    return result;
  }

  // RULE 5: Standalone "NxNxN cm/mm" (not preceded by dimension-specific context like "koła", "kółka", "deck")
  const standaloneAxBxC = text.match(/(?<!k[oó]ł[aek]?\s*[:(]?\s*)(?<!deck\s*[:(]?\s*)(?<!podest\s*[:(]?\s*)(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(cm|mm)(?!\s*(?:PU|kauczuk))/i);
  if (standaloneAxBxC) {
    result.width = parseFloat(normNum(standaloneAxBxC[1]));
    result.depth = parseFloat(normNum(standaloneAxBxC[2]));
    result.height = parseFloat(normNum(standaloneAxBxC[3]));
    result.unit = standaloneAxBxC[4];
    result.rule = 'standalone-3d';
    result.raw.push(standaloneAxBxC[0].trim());
    return result;
  }

  // RULE 6: "Wysokość (min): N cm" + "Szerokość produktu: N mm" (chairs with min/max)
  const wysMin = text.match(/Wysokość\s*\(min\)\s*:\s*(\d+[\.,]?\d*)\s*cm/i);
  const wysMax = text.match(/Wysokość\s*\(max\)\s*:\s*(\d+[\.,]?\d*)\s*cm/i);
  const szProd2 = text.match(/Szerokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  const glProd2 = text.match(/Głębokość produktu:\s*(\d+[\.,]?\d*)\s*mm/i);
  if ((wysMin || wysMax) && (szProd2 || glProd2)) {
    if (szProd2) result.width = parseFloat(normNum(szProd2[1]));
    if (glProd2) result.depth = parseFloat(normNum(glProd2[1]));
    if (wysMax) result.height = parseFloat(normNum(wysMax[1])) * 10; // convert cm to mm
    else if (wysMin) result.height = parseFloat(normNum(wysMin[1])) * 10;
    result.unit = 'mm';
    result.rule = 'chair-mixed-dims';
    result.raw.push([wysMax?.[0] || wysMin?.[0], szProd2?.[0], glProd2?.[0]].filter(Boolean).join('; '));
    return result;
  }

  // RULE 7: "Wysokość kierownicy: N cm" (for scooters - at least get height)
  const wysKier = text.match(/[Ww]ysokość\s*(?:kierownicy)?\s*(?:od podłogi)?\s*[:(]?\s*(\d+[\.,]?\d*)\s*(?:-\s*(\d+[\.,]?\d*)\s*)?(cm|mm)/i);
  if (wysKier) {
    const val = wysKier[2] ? wysKier[2] : wysKier[1]; // take max if range
    result.height = parseFloat(normNum(val));
    result.unit = wysKier[3];
    result.rule = 'height-only';
    result.raw.push(wysKier[0].trim());
    // try to find length too
    const dlLen = text.match(/(?:długość|dł\.?)\s*[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
    if (dlLen) {
      result.depth = parseFloat(normNum(dlLen[1]));
      result.raw.push(dlLen[0].trim());
    }
    return result;
  }

  // RULE 8: "średnica: N cm" (round objects)
  const srednica = text.match(/(?:średnic[aąeęy]|⌀)\s*(?:ok\.?\s*)?[:(]?\s*(\d+[\.,]?\d*)\s*(cm|mm)/i);
  if (srednica) {
    result.diameter = parseFloat(normNum(srednica[1]));
    result.unit = srednica[2];
    result.rule = 'diameter';
    result.raw.push(srednica[0].trim());
    return result;
  }

  // RULE 9: "Waga i rozmiary" section with "Szerokość/Wysokość" without "produktu"
  const szSiedz = text.match(/Szerokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  const glSiedz = text.match(/Głębokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  if (szSiedz && glSiedz) {
    result.width = parseFloat(normNum(szSiedz[1]));
    result.depth = parseFloat(normNum(glSiedz[1]));
    result.unit = 'cm';
    result.rule = 'seat-dims';
    result.raw.push(szSiedz[0] + '; ' + glSiedz[0]);
    return result;
  }

  // RULE 10: "blatu (SxG): N x N mm" (gaming desks)
  const blatSxG = text.match(/blatu\s*\(S\s*x\s*G\)\s*:\s*(\d+[\.,]?\d*)\s*x\s*(\d+[\.,]?\d*)\s*(mm|cm)/i);
  if (blatSxG) {
    result.width = parseFloat(normNum(blatSxG[1]));
    result.depth = parseFloat(normNum(blatSxG[2]));
    result.unit = blatSxG[3];
    result.rule = 'blat-sxg';
    result.raw.push(blatSxG[0].trim());
    // Try to find height too (Wysokość produktu or just Wysokość)
    const hProd = text.match(/Wysokość\s*(?:produktu)?\s*:\s*(\d+[\.,]?\d*)\s*(mm|cm)/i);
    if (hProd) {
      result.height = parseFloat(normNum(hProd[1]));
      if (hProd[2] === 'cm' && result.unit === 'mm') result.height *= 10;
      result.raw.push(hProd[0].trim());
    }
    return result;
  }

  // RULE 11: "Wysokość (max.): N cm" + "Szerokość siedziska: N cm" (chairs without "produktu" label)
  const wysMaxDot = text.match(/Wysokość\s*\(max\.?\)\s*[.:]\s*(\d+[\.,]?\d*)\s*cm/i);
  const szSiedz2 = text.match(/Szerokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
  if (wysMaxDot && szSiedz2) {
    result.height = parseFloat(normNum(wysMaxDot[1]));
    result.width = parseFloat(normNum(szSiedz2[1]));
    const glSiedz2 = text.match(/Głębokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
    if (glSiedz2) result.depth = parseFloat(normNum(glSiedz2[1]));
    result.unit = 'cm';
    result.rule = 'chair-max-seat';
    result.raw.push([wysMaxDot[0], szSiedz2[0], glSiedz2?.[0]].filter(Boolean).join('; '));
    return result;
  }

  // RULE 12: Just "Wysokość (min): N cm" with "Szerokość siedziska" (fallback for chairs)
  const wysMinOnly = text.match(/Wysokość\s*\(min\)\s*[.:]\s*(\d+[\.,]?\d*)\s*cm/i);
  if (wysMinOnly && szSiedz2) {
    result.height = parseFloat(normNum(wysMinOnly[1]));
    result.width = parseFloat(normNum(szSiedz2[1]));
    result.unit = 'cm';
    result.rule = 'chair-min-seat';
    result.raw.push(wysMinOnly[0] + '; ' + szSiedz2[0]);
    return result;
  }

  // RULE 13: Only "Szerokość siedziska" (last resort for chairs)
  if (szSiedz2) {
    result.width = parseFloat(normNum(szSiedz2[1]));
    const glSiedz3 = text.match(/Głębokość siedziska:\s*(\d+[\.,]?\d*)\s*cm/i);
    if (glSiedz3) result.depth = parseFloat(normNum(glSiedz3[1]));
    result.unit = 'cm';
    result.rule = 'seat-width-only';
    result.raw.push(szSiedz2[0] + (glSiedz3 ? '; ' + glSiedz3[0] : ''));
    return result;
  }

  return null;
}

// Process all rows
const results = [];
let extracted = 0;
let noData = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const id = row[0];
  const name = row[1] || '';
  const sku = row[4] || '';
  const category = row[5] || '';
  const desc = stripHtml(row[9]);

  const dims = extractDimensions(desc);

  if (dims && (dims.width || dims.height || dims.depth || dims.diameter)) {
    extracted++;
    // Convert all to cm
    const toCm = (v) => dims.unit === 'mm' ? v / 10 : v;
    results.push({
      id, sku, name: name.substring(0, 80), category: category.substring(0, 60),
      width: dims.width ? toCm(dims.width) : null,
      height: dims.height ? toCm(dims.height) : null,
      depth: dims.depth ? toCm(dims.depth) : null,
      diameter: dims.diameter ? toCm(dims.diameter) : null,
      unit: 'cm', rule: dims.rule, raw: dims.raw.join(' | ')
    });
  } else {
    noData++;
    results.push({
      id, sku, name: name.substring(0, 80), category: category.substring(0, 60),
      width: null, height: null, depth: null, diameter: null,
      unit: null, rule: 'NO_MATCH', raw: ''
    });
  }
}

console.log(`\n=== WYNIKI EKSTRAKCJI WYMIARÓW ===`);
console.log(`Produktów łącznie: ${data.length - 1}`);
console.log(`Wyekstrahowano wymiary: ${extracted}`);
console.log(`Brak wymiarów: ${noData}`);
console.log(`Skuteczność: ${(extracted / (data.length - 1) * 100).toFixed(1)}%`);

// Breakdown by rule
const byRule = {};
results.forEach(r => { byRule[r.rule] = (byRule[r.rule] || 0) + 1; });
console.log(`\nRozkład reguł:`);
Object.entries(byRule).sort((a, b) => b[1] - a[1]).forEach(([rule, count]) => {
  console.log(`  ${count.toString().padStart(4)}  ${rule}`);
});

// Show some examples per rule
console.log(`\nPrzykłady:`);
const shownRules = new Set();
results.filter(r => r.rule !== 'NO_MATCH').forEach(r => {
  if (!shownRules.has(r.rule)) {
    shownRules.add(r.rule);
    console.log(`  [${r.rule}] ${r.name.substring(0, 50)}`);
    console.log(`    W=${r.width} H=${r.height} D=${r.depth} Ø=${r.diameter} (${r.unit})`);
    console.log(`    Raw: ${r.raw.substring(0, 120)}`);
  }
});

// Write CSV output
const csvLines = ['id;sku;nazwa;kategoria;szerokość;wysokość;głębokość;średnica;jednostka;reguła;raw'];
results.forEach(r => {
  csvLines.push([
    r.id, r.sku, `"${(r.name||'').replace(/"/g, '""')}"`, `"${(r.category||'').replace(/"/g, '""')}"`,
    r.width || '', r.height || '', r.depth || '', r.diameter || '',
    r.unit || '', r.rule, `"${(r.raw||'').replace(/"/g, '""')}"`
  ].join(';'));
});
const outPath = path.join(__dirname, '..', '..', 'wx-wymiary.csv');
fs.writeFileSync(outPath, '\ufeff' + csvLines.join('\n'), 'utf8');
console.log(`\nZapisano: ${outPath}`);
