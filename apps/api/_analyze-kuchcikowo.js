/**
 * Analyze kuchcikowo CSV to understand dimension/weight patterns in descriptions
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join('C:\\Users\\Pracownik Biuro 1\\Downloads', '6a0c57fbcf68bc9c835babfd671ff758.csv');

// Parse semicolon-delimited CSV with quoted fields (may contain ; inside quotes)
function parseCSV(raw) {
  const records = [];
  let i = 0;
  const lines = [];
  
  // Split into logical lines (handling multi-line quoted fields)
  let currentLine = '';
  let inQuotes = false;
  for (let ci = 0; ci < raw.length; ci++) {
    const ch = raw[ci];
    if (ch === '"') {
      inQuotes = !inQuotes;
      currentLine += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && raw[ci + 1] === '\n') ci++; // skip \r\n
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += ch;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);

  // Parse each line into fields
  for (let li = 1; li < lines.length; li++) { // skip header
    const line = lines[li];
    const fields = [];
    let field = '';
    let fInQuotes = false;
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      if (ch === '"') {
        if (fInQuotes && line[ci + 1] === '"') {
          field += '"';
          ci++;
        } else {
          fInQuotes = !fInQuotes;
        }
      } else if (ch === ';' && !fInQuotes) {
        fields.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field);
    if (fields.length >= 11) {
      records.push(fields);
    }
  }
  return records;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

const raw = fs.readFileSync(CSV_PATH, 'utf-8');
const records = parseCSV(raw);

console.log(`Total records: ${records.length}`);

// Check weight field (index 10)
let withWeight = 0;
let withDesc = 0;
let dimPatterns = {};

for (const fields of records) {
  const weight = fields[10]?.trim();
  const desc = stripHtml(fields[5] || '');
  const name = fields[1] || '';
  
  if (weight) withWeight++;
  if (desc.length > 10) withDesc++;
}

console.log(`With weight field: ${withWeight}`);
console.log(`With description: ${withDesc}`);
console.log('');

// Now analyze dimension patterns in descriptions
const dimRegexes = [
  { name: 'dlugosc/szerokosc/grubosc', re: /d[łl]ugo[śs][ćc]:?\s*(\d+[.,]?\d*)\s*cm.*?szeroko[śs][ćc]:?\s*(\d+[.,]?\d*)\s*cm.*?grubo[śs][ćc]:?\s*(\d+[.,]?\d*)\s*cm/i },
  { name: 'dlugosc/szerokosc/wysokosc', re: /d[łl]ugo[śs][ćc]:?\s*(\d+[.,]?\d*)\s*cm.*?szeroko[śs][ćc]:?\s*(\d+[.,]?\d*)\s*cm.*?wysoko[śs][ćc]:?\s*(\d+[.,]?\d*)\s*cm/i },
  { name: 'wymiary NxNxN cm', re: /wymiary:?\s*(\d+[.,]?\d*)\s*x\s*(\d+[.,]?\d*)\s*x\s*(\d+[.,]?\d*)\s*cm/i },
  { name: 'NxNxN cm', re: /(\d+[.,]?\d*)\s*x\s*(\d+[.,]?\d*)\s*x\s*(\d+[.,]?\d*)\s*cm/i },
  { name: 'NxN cm (2D)', re: /(\d+[.,]?\d*)\s*x\s*(\d+[.,]?\d*)\s*cm/i },
  { name: 'Ø N cm x N cm', re: /[ØO]\s*(\d+[.,]?\d*)\s*cm\s*x\s*(\d+[.,]?\d*)\s*cm/i },
  { name: 'srednica N cm', re: /[śs]rednica:?\s*(\d+[.,]?\d*)\s*cm/i },
  { name: 'pojemnosc N L', re: /pojemno[śs][ćc]:?\s*(\d+[.,]?\d*)\s*[lL]/i },
];

const weightRegexes = [
  { name: 'waga N kg', re: /waga:?\s*(\d+[.,]?\d*)\s*kg/i },
  { name: 'waga N g', re: /waga:?\s*(\d+[.,]?\d*)\s*g(?:ram)?/i },
  { name: 'masa N kg', re: /masa:?\s*(\d+[.,]?\d*)\s*kg/i },
  { name: 'N kg (weight context)', re: /ci[eę][żz]ar:?\s*(\d+[.,]?\d*)\s*kg/i },
];

let dimHits = {};
let weightHits = {};
let noDims = 0;
let noWeight = 0;
let dimExamples = {};
let weightExamples = {};

for (const fields of records) {
  const desc = stripHtml(fields[5] || '');
  const name = fields[1] || '';
  const combined = name + ' ' + desc;
  
  let foundDim = false;
  for (const { name: pName, re } of dimRegexes) {
    const m = combined.match(re);
    if (m) {
      dimHits[pName] = (dimHits[pName] || 0) + 1;
      if (!dimExamples[pName]) {
        dimExamples[pName] = { id: fields[0], name: fields[1]?.substring(0, 50), match: m[0].substring(0, 80) };
      }
      foundDim = true;
      break;
    }
  }
  if (!foundDim) noDims++;

  let foundWeight = false;
  for (const { name: pName, re } of weightRegexes) {
    const m = combined.match(re);
    if (m) {
      weightHits[pName] = (weightHits[pName] || 0) + 1;
      if (!weightExamples[pName]) {
        weightExamples[pName] = { id: fields[0], name: fields[1]?.substring(0, 50), match: m[0].substring(0, 80) };
      }
      foundWeight = true;
      break;
    }
  }
  if (!foundWeight) noWeight++;
}

console.log('=== DIMENSION PATTERNS ===');
for (const [pat, count] of Object.entries(dimHits).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pat}: ${count} hits`);
  if (dimExamples[pat]) console.log(`    Example: [${dimExamples[pat].id}] ${dimExamples[pat].name} → "${dimExamples[pat].match}"`);
}
console.log(`  No dims found: ${noDims}`);

console.log('\n=== WEIGHT PATTERNS ===');
for (const [pat, count] of Object.entries(weightHits).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pat}: ${count} hits`);
  if (weightExamples[pat]) console.log(`    Example: [${weightExamples[pat].id}] ${weightExamples[pat].name} → "${weightExamples[pat].match}"`);
}
console.log(`  No weight found: ${noWeight}`);

// Show some records that have NO dimension data found
console.log('\n=== SAMPLES WITHOUT DIMS (first 10) ===');
let shown = 0;
for (const fields of records) {
  if (shown >= 10) break;
  const desc = stripHtml(fields[5] || '');
  const name = fields[1] || '';
  const combined = name + ' ' + desc;
  
  let found = false;
  for (const { re } of dimRegexes) {
    if (re.test(combined)) { found = true; break; }
  }
  if (!found) {
    console.log(`  [${fields[0]}] ${name.substring(0, 70)}`);
    console.log(`    Desc preview: ${desc.substring(0, 120)}`);
    shown++;
  }
}

// Show weight column samples
console.log('\n=== WEIGHT COLUMN SAMPLES (field 10) ===');
let wShown = 0;
for (const fields of records) {
  if (wShown >= 20) break;
  const wt = fields[10]?.trim();
  if (wt) {
    console.log(`  [${fields[0]}] ${fields[1]?.substring(0, 40)} → weight col: "${wt}"`);
    wShown++;
  }
}
