/**
 * Export Lego products from BaseLinker - Hurtownia Sportowa
 * Pobiera: EAN, nazwa, SKU, opis
 */
require('dotenv').config({ path: './apps/api/.env' });
const fs = require('fs');

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const BL_TOKEN = process.env.BASELINKER_API_TOKEN;

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

async function getInventories() {
  const resp = await blRequest('getInventories');
  return resp.inventories || [];
}

async function getAllProductIds(inventoryId) {
  const allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`  Lista produktów - strona ${page}...`);
    const resp = await blRequest('getInventoryProductsList', {
      inventory_id: inventoryId,
      page,
    });

    const products = Object.entries(resp.products || {}).map(([id, p]) => ({
      id: parseInt(id),
      name: p.name || '',
      sku: p.sku || '',
    }));
    allProducts.push(...products);
    hasMore = products.length === 1000;
    page++;
    if (hasMore) await sleep(200);
  }

  return allProducts;
}

async function getProductsData(inventoryId, productIds) {
  const allData = [];
  const CHUNK_SIZE = 100;

  for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
    const chunk = productIds.slice(i, i + CHUNK_SIZE);
    console.log(`  Pobieranie szczegółów ${i + 1}-${Math.min(i + CHUNK_SIZE, productIds.length)} z ${productIds.length}...`);
    const resp = await blRequest('getInventoryProductsData', {
      inventory_id: inventoryId,
      products: chunk,
    });
    const products = Object.entries(resp.products || {}).map(([id, p]) => ({ ...p, id: parseInt(id) }));
    allData.push(...products);
    await sleep(200);
  }

  return allData;
}

function escapeCsv(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  if (!BL_TOKEN) {
    console.error('Brak BASELINKER_API_TOKEN w .env');
    process.exit(1);
  }

  console.log('Pobieranie listy magazynów...');
  const allInventories = await getInventories();

  const sportowa = allInventories.find(inv => inv.name.toLowerCase().includes('sportow'));
  if (!sportowa) {
    console.error('Nie znaleziono magazynu "Hurtownia Sportowa"!');
    console.log('Dostępne magazyny:', allInventories.map(i => i.name).join(', '));
    process.exit(1);
  }

  console.log(`Magazyn: ${sportowa.name} (ID: ${sportowa.inventory_id})`);

  // Pobierz listę wszystkich produktów
  console.log('\nPobieranie listy produktów...');
  const allProducts = await getAllProductIds(sportowa.inventory_id);
  console.log(`Łącznie produktów w magazynie: ${allProducts.length}`);

  // Filtruj potencjalne produkty Lego po nazwie/SKU
  const potentialLego = allProducts.filter(p => {
    const name = p.name.toLowerCase();
    const sku = p.sku.toLowerCase();
    return name.includes('lego') || sku.includes('lego');
  });

  console.log(`Produkty z "lego" w nazwie/SKU: ${potentialLego.length}`);

  if (potentialLego.length === 0) {
    // Jeśli nie znaleziono po nazwie, sprawdź wszystkie po producencie
    console.log('Nie znaleziono po nazwie/SKU. Sprawdzam producenta dla wszystkich produktów...');
    const allIds = allProducts.map(p => p.id);
    const allDetailed = await getProductsData(sportowa.inventory_id, allIds);
    const legoByMfr = allDetailed.filter(p => (p.manufacturer || '').toLowerCase().includes('lego'));
    console.log(`Produkty z producentem "Lego": ${legoByMfr.length}`);
    writeCSV(legoByMfr);
    return;
  }

  // Pobierz pełne dane dla produktów Lego
  console.log('\nPobieranie pełnych danych produktów Lego...');
  const ids = potentialLego.map(p => p.id);
  const detailed = await getProductsData(sportowa.inventory_id, ids);

  console.log(`Pobrano szczegóły dla ${detailed.length} produktów.`);
  writeCSV(detailed);
}

function extractDimension(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : '';
}

function writeCSV(products) {
  if (products.length === 0) {
    console.log('Brak produktów do eksportu.');
    return;
  }

  const sep = ';';
  const headers = ['ean', 'sku', 'name', 'wysokosc_opak_mm', 'glebokosc_opak_mm', 'szerokosc_opak_mm', 'waga_g', 'description'];
  const rows = [headers.join(sep)];

  for (const p of products) {
    const textFields = p.text_fields || {};
    const name = textFields.name || '';
    const rawDesc = (textFields.description || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Wyciągnij wymiary opakowania z opisu
    let wysokosc = extractDimension(rawDesc, /Wysoko[sś][cć] opakowania:\s*(\d+)\s*mm/i);
    let glebokosc = extractDimension(rawDesc, /G[lł][eę]boko[sś][cć] opakowania:\s*(\d+)\s*mm/i);
    let szerokosc = extractDimension(rawDesc, /Szeroko[sś][cć] opakowania:\s*(\d+)\s*mm/i);
    let waga = extractDimension(rawDesc, /Waga wraz z opakowaniem:\s*(\d+)\s*g/i);

    // Fallback: wymiary produktu jeśli brak wymiarów opakowania
    if (!wysokosc) wysokosc = extractDimension(rawDesc, /Wysoko[sś][cć] produktu:\s*(\d+)\s*mm/i);
    if (!glebokosc) {
      glebokosc = extractDimension(rawDesc, /G[lł][eę]boko[sś][cć] produktu:\s*(\d+)\s*mm/i);
      if (!glebokosc) glebokosc = extractDimension(rawDesc, /D[lł]ugo[sś][cć] produktu:\s*(\d+)\s*mm/i);
    }
    if (!szerokosc) szerokosc = extractDimension(rawDesc, /Szeroko[sś][cć] produktu:\s*(\d+)\s*mm/i);
    // Fallback waga: "Waga brutto" lub "Waga produktu" lub "Waga netto"
    if (!waga) {
      const wagaKg = rawDesc.match(/Waga brutto:\s*([\d,.]+)\s*kg/i)
        || rawDesc.match(/Waga produktu:\s*([\d,.]+)\s*kg/i)
        || rawDesc.match(/Waga netto:\s*([\d,.]+)\s*kg/i);
      if (wagaKg) {
        waga = String(Math.round(parseFloat(wagaKg[1].replace(',', '.')) * 1000));
      } else {
        const wagaG = rawDesc.match(/Waga produktu:\s*(\d+)\s*g/i)
          || rawDesc.match(/Waga brutto:\s*(\d+)\s*g/i);
        if (wagaG) waga = wagaG[1];
      }
    }

    const desc = rawDesc.substring(0, 1000);

    const row = [
      escapeCsv(p.ean || ''),
      escapeCsv(p.sku || ''),
      escapeCsv(name),
      escapeCsv(wysokosc),
      escapeCsv(glebokosc),
      escapeCsv(szerokosc),
      escapeCsv(waga),
      escapeCsv(desc),
    ];
    rows.push(row.join(sep));
  }

  const outputPath = './lego-products.csv';
  fs.writeFileSync(outputPath, '\ufeff' + rows.join('\n'), 'utf8');
  console.log(`\nZapisano ${products.length} produktów do: ${outputPath}`);
}

main().catch(err => {
  console.error('Błąd:', err);
  process.exit(1);
});
