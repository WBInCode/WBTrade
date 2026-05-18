// Compare categories across all inventories to find sport-only categories
const TOKEN = '6010965-6007581-8JLR71SHB190BOWX9LVHNMA34E71LI0QIRZ902SG33XD0ES0LMM357JD4GCUS1KT';

async function callBL(method, params = {}) {
  const body = new URLSearchParams();
  body.append('method', method);
  body.append('parameters', JSON.stringify(params));
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'X-BLToken': TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return res.json();
}

async function main() {
  const SPORT_ID = 26746;
  // IDs of inventories we actually USE (not sport)
  const USED_IDS = [11235, 22951, 22952, 22953, 22954, 26423, 26477, 26591, 28051];
  
  // Get sport categories - extract unique top-level names
  const sportCats = await callBL('getInventoryCategories', { inventory_id: SPORT_ID });
  const sportTopLevel = new Set();
  for (const cid in sportCats.categories) {
    const name = sportCats.categories[cid].name.split('|')[0].split('/')[0].trim();
    if (name) sportTopLevel.add(name);
  }

  // Get categories from all OTHER inventories
  const otherTopLevel = new Set();
  for (const invId of USED_IDS) {
    await new Promise(r => setTimeout(r, 1200)); // rate limiting
    const cats = await callBL('getInventoryCategories', { inventory_id: invId });
    if (cats.categories) {
      for (const cid in cats.categories) {
        const name = cats.categories[cid].name.split('|')[0].split('/')[0].trim();
        if (name) otherTopLevel.add(name);
      }
    }
  }

  console.log('=== CATEGORIES ONLY IN HURTOWNIA SPORTOWA (not in other warehouses) ===');
  const sportOnly = [...sportTopLevel].filter(n => !otherTopLevel.has(n)).sort();
  for (const name of sportOnly) {
    console.log(`  - ${name}`);
  }

  console.log(`\n=== CATEGORIES SHARED (exist in both sport and others) ===`);
  const shared = [...sportTopLevel].filter(n => otherTopLevel.has(n)).sort();
  for (const name of shared) {
    console.log(`  - ${name}`);
  }

  console.log(`\n=== CATEGORIES ONLY IN OTHER WAREHOUSES (not in sport) ===`);
  const othersOnly = [...otherTopLevel].filter(n => !sportTopLevel.has(n)).sort();
  for (const name of othersOnly) {
    console.log(`  - ${name}`);
  }
  
  console.log(`\nSummary: Sport-only: ${sportOnly.length}, Shared: ${shared.length}, Others-only: ${othersOnly.length}`);
}

main().catch(console.error);
