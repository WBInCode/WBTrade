// Quick script to check Baselinker inventories and categories
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
  // 1. Get all inventories (warehouses)
  console.log('=== BASELINKER INVENTORIES ===');
  const inv = await callBL('getInventories');
  if (inv.inventories) {
    for (const i of inv.inventories) {
      console.log(`  ID: ${i.inventory_id} | Name: ${i.name} | Description: ${i.description || '-'}`);
    }
  }

  // 2. Get categories for each inventory
  for (const i of (inv.inventories || [])) {
    console.log(`\n=== CATEGORIES FOR: ${i.name} (ID: ${i.inventory_id}) ===`);
    const cats = await callBL('getInventoryCategories', { inventory_id: i.inventory_id });
    if (cats.categories) {
      const catMap = {};
      for (const cid in cats.categories) {
        catMap[cid] = cats.categories[cid];
      }
      // Build tree
      for (const cid in catMap) {
        const c = catMap[cid];
        const parentName = c.parent_id && catMap[c.parent_id] ? catMap[c.parent_id].name : '(root)';
        console.log(`  [${cid}] ${c.name} (parent: ${parentName})`);
      }
    }
  }
}

main().catch(console.error);
