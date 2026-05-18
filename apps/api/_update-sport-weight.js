/**
 * Update Baselinker products with weight extracted from xlsx descriptions.
 * Hurtownia Sportowa (inventory 26746).
 * Baselinker API: weight in kg.
 */
require('dotenv').config();
const XLSX = require('xlsx');

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

function extractWeight(text) {
  // RULE 1: "Waga produktu: N kg" (most reliable - Huzaro/Razor style)
  const wagaProduktu = text.match(/Waga produktu\s*[:(]?\s*(\d+[\.,]?\d*)\s*(kg|g)\b/i);
  if (wagaProduktu) {
    let val = parseFloat(wagaProduktu[1].replace(',', '.'));
    if (wagaProduktu[2] === 'g') val = val / 1000;
    // Sanity: skip if > 100 kg or < 0.05 kg (likely error)
    if (val >= 0.05 && val <= 100) return val;
  }

  // RULE 2: "Waga:" or "waga:" in spec context (not preceded by max/użytkownika)
  const allWaga = [...text.matchAll(/(?:Waga|waga)\s*[:(]\s*(\d+[\.,]?\d*)\s*(kg|g)\b/gi)];
  for (const m of allWaga) {
    const pos = m.index;
    const before = text.substring(Math.max(0, pos - 40), pos).toLowerCase();
    if (before.includes('użytkownik') || before.includes('max') || before.includes('maks') || 
        before.includes('obciąż') || before.includes('limit')) continue;
    let val = parseFloat(m[1].replace(',', '.'));
    if (m[2] === 'g') val = val / 1000;
    if (val >= 0.05 && val <= 100) return val;
  }

  // RULE 3: "Waga netto: N kg"
  const wagaNetto = text.match(/Waga netto\s*[:(]?\s*(\d+[\.,]?\d*)\s*(kg|g)\b/i);
  if (wagaNetto) {
    let val = parseFloat(wagaNetto[1].replace(',', '.'));
    if (wagaNetto[2] === 'g') val = val / 1000;
    if (val >= 0.05 && val <= 100) return val;
  }

  return null;
}

async function main() {
  if (!BL_TOKEN) { console.error('Brak BASELINKER_API_TOKEN'); process.exit(1); }

  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const productsToUpdate = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const productId = row[0];
    const desc = stripHtml(row[9]);
    const weight = extractWeight(desc);

    if (weight) {
      productsToUpdate.push({ productId, weight, name: (row[1] || '').substring(0, 50) });
    }
  }

  console.log(`Produktow z waga do aktualizacji: ${productsToUpdate.length}`);
  productsToUpdate.slice(0, 10).forEach(p => {
    console.log(`  ID=${p.productId} waga=${p.weight} kg - ${p.name}`);
  });

  if (!process.argv.includes('--go')) {
    console.log('\n(dry run - dodaj --go zeby zapisac)');
    return;
  }

  let updated = 0, errors = 0;
  for (const p of productsToUpdate) {
    try {
      await blRequest('addInventoryProduct', {
        inventory_id: INVENTORY_ID,
        product_id: p.productId,
        weight: p.weight
      });
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
  console.log(`Bledy: ${errors}`);
}

main().catch(err => { console.error(err); process.exit(1); });
