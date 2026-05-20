/**
 * Update BaseLinker products with dimensions and weight from CSV
 * Wymiary w mm, waga w g -> API przyjmuje: height/width/length w mm(?), weight w kg
 */
require('dotenv').config({ path: './apps/api/.env' });
const fs = require('fs');

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const BL_TOKEN = process.env.BASELINKER_API_TOKEN;
const INVENTORY_ID = 26746; // Hurtownia Sportowa

async function blRequest(method, parameters = {}) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));

  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': BL_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const data = await response.json();
  if (data.status === 'ERROR') {
    throw new Error(`Baselinker API error: ${data.error_message}`);
  }
  return data;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function main() {
  if (!BL_TOKEN) {
    console.error('Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  // Wczytaj CSV
  const csvPath = 'c:/Users/Pracownik Biuro 1/Downloads/lego-products - lego-products.csv.csv';
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  // Parse header
  const header = parseCsvLine(lines[0]);
  console.log('Nagłówki:', header);
  
  // Parse products
  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const sku = cols[1]?.trim();
    const wysokosc = parseInt(cols[3]) || 0;
    const glebokosc = parseInt(cols[4]) || 0;
    const szerokosc = parseInt(cols[5]) || 0;
    const waga = parseInt(cols[6]) || 0;
    
    if (sku && (wysokosc || glebokosc || szerokosc || waga)) {
      products.push({ sku, wysokosc, glebokosc, szerokosc, waga });
    }
  }
  
  console.log(`Produktów do aktualizacji: ${products.length}`);

  // Mapowanie SKU -> BaseLinker product ID
  console.log('\nPobieranie listy produktów z magazynu...');
  const skuToId = {};
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const resp = await blRequest('getInventoryProductsList', { inventory_id: INVENTORY_ID, page });
    const prods = resp.products || {};
    Object.entries(prods).forEach(([id, p]) => {
      skuToId[p.sku] = parseInt(id);
    });
    hasMore = Object.keys(prods).length === 1000;
    page++;
    if (hasMore) await sleep(150);
  }
  
  console.log(`Zmapowano ${Object.keys(skuToId).length} SKU -> ID`);

  // Aktualizuj produkty partiami
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const productId = skuToId[p.sku];
    
    if (!productId) {
      console.log(`  [!] SKU ${p.sku} nie znaleziono w magazynie`);
      notFound++;
      continue;
    }

    // BaseLinker updateInventoryProductsStock nie ma wymiarów
    // Użyjemy addInventoryProduct z istniejącym ID do aktualizacji
    // API: height, width, length w metrach? NIE - w dowolnych jednostkach, zależy od ustawień konta
    // Sprawdźmy - BL docs: weight w kg, height/width/length w cm
    // Konwersja: mm -> cm (dzielimy przez 10), g -> kg (dzielimy przez 1000)
    
    const params = {
      inventory_id: INVENTORY_ID,
      product_id: productId,
      height: p.wysokosc / 10,    // mm -> cm
      width: p.szerokosc / 10,     // mm -> cm
      length: p.glebokosc / 10,    // mm -> cm
      weight: p.waga / 1000,       // g -> kg
    };

    try {
      await blRequest('addInventoryProduct', params);
      updated++;
      if (updated % 20 === 0) {
        console.log(`  Zaktualizowano ${updated}/${products.length}...`);
      }
    } catch (err) {
      console.error(`  [ERR] SKU ${p.sku} (ID ${productId}): ${err.message}`);
      errors++;
    }

    await sleep(200); // Rate limit
  }

  console.log(`\n=== GOTOWE ===`);
  console.log(`Zaktualizowano: ${updated}`);
  console.log(`Nie znaleziono: ${notFound}`);
  console.log(`Błędy: ${errors}`);
}

main().catch(err => {
  console.error('Błąd:', err);
  process.exit(1);
});
