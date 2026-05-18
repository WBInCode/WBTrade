// Check if categories are the same across inventories or different
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
  // Compare categories from two different inventories
  const INV_HP = 22954; // Hurtownia Przemysłowa
  const INV_SPORT = 26746; // Hurtownia Sportowa
  const INV_IKONKA = 22951; // ikonka

  for (const inv of [INV_HP, INV_SPORT, INV_IKONKA]) {
    await new Promise(r => setTimeout(r, 1200));
    const cats = await callBL('getInventoryCategories', { inventory_id: inv });
    const catNames = Object.values(cats.categories || {}).map(c => c.name);
    
    // Count categories with | and with /
    const pipeCategories = catNames.filter(n => n.includes('|'));
    const slashCategories = catNames.filter(n => n.includes('/'));
    const plainCategories = catNames.filter(n => !n.includes('|') && !n.includes('/'));
    
    console.log(`\n=== Inventory ${inv} ===`);
    console.log(`  Total: ${catNames.length}`);
    console.log(`  With "|" (pipe/shared): ${pipeCategories.length}`);
    console.log(`  With "/" (slash/sport): ${slashCategories.length}`);
    console.log(`  Plain (no separator): ${plainCategories.length}`);
    
    // Show some pipe categories
    if (pipeCategories.length > 0) {
      console.log(`  Sample pipe cats: ${pipeCategories.slice(0, 5).join(', ')}`);
    }
    // Show some slash categories
    if (slashCategories.length > 0) {
      console.log(`  Sample slash cats: ${slashCategories.slice(0, 5).join(', ')}`);
    }
    // Show plain categories
    if (plainCategories.length > 0) {
      console.log(`  Plain cats: ${plainCategories.join(', ')}`);
    }
  }
}

main().catch(console.error);
