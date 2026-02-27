/**
 * Wyświetla pełne drzewko kategorii z Basielinkera BTP
 * + porównanie z bazą danych
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const BTP_INVENTORY_ID = 22953;
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

async function getApiToken() {
  try {
    const config = await prisma.baselinkerConfig.findFirst();
    if (config) {
      const key = process.env.BASELINKER_ENCRYPTION_KEY;
      if (key) {
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(config.encryptionIv, 'hex'));
        decipher.setAuthTag(Buffer.from(config.authTag, 'hex'));
        let token = decipher.update(config.apiTokenEncrypted, 'hex', 'utf8');
        token += decipher.final('utf8');
        return token;
      }
    }
  } catch (e) {}
  return process.env.BASELINKER_API_TOKEN;
}

async function blRequest(token, method, parameters = {}) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: { 'X-BLToken': token, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    signal: AbortSignal.timeout(30000),
  });
  return await response.json();
}

async function main() {
  const token = await getApiToken();

  // 1. Pobierz kategorie BL
  console.log('Pobieranie kategorii z Basielinkera BTP...\n');
  const resp = await blRequest(token, 'getInventoryCategories', { inventory_id: BTP_INVENTORY_ID });
  const blCategories = resp.categories || [];

  // 2. Pobierz DB kategorie z baselinkerCategoryId
  const dbCats = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { id: true, name: true, baselinkerCategoryId: true },
  });
  const dbCatMap = new Map();
  for (const c of dbCats) {
    dbCatMap.set(c.baselinkerCategoryId, c);
  }

  // 3. Pobierz liczbę produktów per kategoria (z BL)
  console.log('Pobieranie listy produktów BTP (dla zliczania per kategoria)...\n');
  let allProducts = [];
  let page = 1;
  while (true) {
    const r = await blRequest(token, 'getInventoryProductsList', { inventory_id: BTP_INVENTORY_ID, page });
    const products = Object.entries(r.products || {}).map(([id, p]) => ({ id: parseInt(id), ...p }));
    if (products.length === 0) break;
    allProducts = allProducts.concat(products);
    page++;
  }

  // Zlicz produkty per category_id
  const catProductCount = new Map();
  for (const p of allProducts) {
    if (p.category_id) {
      catProductCount.set(p.category_id, (catProductCount.get(p.category_id) || 0) + 1);
    }
  }

  // 4. Buduj drzewko
  const catMap = new Map();
  for (const cat of blCategories) {
    catMap.set(cat.category_id, cat);
  }

  // Grupuj children
  const children = new Map(); // parent_id -> [cat]
  const roots = [];
  for (const cat of blCategories) {
    if (!cat.parent_id || cat.parent_id === 0) {
      roots.push(cat);
    } else {
      if (!children.has(cat.parent_id)) children.set(cat.parent_id, []);
      children.get(cat.parent_id).push(cat);
    }
  }

  // Sortuj
  roots.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  for (const [, kids] of children) {
    kids.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }

  // 5. Wyświetl drzewko
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║            DRZEWKO KATEGORII BTP (Baselinker)                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log(`Łącznie kategorii w BL: ${blCategories.length}`);
  console.log(`Łącznie kategorii w DB: ${dbCats.length}`);
  console.log(`Łącznie produktów BTP:  ${allProducts.length}\n`);

  let totalMapped = 0;
  let totalMissing = 0;

  function printTree(cats, indent = 0) {
    for (const cat of cats) {
      const prefix = indent === 0 ? '' : '  '.repeat(indent - 1) + '├─ ';
      const count = catProductCount.get(cat.category_id) || 0;
      const inDb = dbCatMap.has(String(cat.category_id));
      const dbIcon = inDb ? '✅' : '❌';
      
      if (inDb) totalMapped++;
      else totalMissing++;

      const countStr = String(count).padStart(5);
      console.log(`${dbIcon} ${prefix}${cat.name}  [${countStr} prod]  (blId: ${cat.category_id})`);

      const kids = children.get(cat.category_id);
      if (kids && kids.length > 0) {
        printTree(kids, indent + 1);
      }
    }
  }

  printTree(roots);

  console.log('\n' + '═'.repeat(70));
  console.log(`✅ W bazie:     ${totalMapped} / ${blCategories.length}`);
  console.log(`❌ Brakujące:   ${totalMissing} / ${blCategories.length}`);

  // Pokaż brakujące osobno
  if (totalMissing > 0) {
    console.log('\n--- BRAKUJĄCE KATEGORIE (do dodania) ---');
    function listMissing(cats, path = '') {
      for (const cat of cats) {
        const fullPath = path ? `${path} > ${cat.name}` : cat.name;
        const inDb = dbCatMap.has(String(cat.category_id));
        if (!inDb) {
          const count = catProductCount.get(cat.category_id) || 0;
          console.log(`  ❌ blId: ${cat.category_id} | ${fullPath} | ${count} produktów`);
        }
        const kids = children.get(cat.category_id);
        if (kids) listMissing(kids, fullPath);
      }
    }
    listMissing(roots);
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
