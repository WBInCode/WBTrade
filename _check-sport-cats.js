// Get top-level category names from Hurtownia Sportowa in Baselinker
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
  // Get categories from Hurtownia Sportowa (ID: 26746)
  const cats = await callBL('getInventoryCategories', { inventory_id: 26746 });
  
  if (!cats.categories) {
    console.log('ERROR:', JSON.stringify(cats));
    return;
  }

  // Extract unique top-level category names (first segment before /)
  const topLevelNames = new Set();
  for (const cid in cats.categories) {
    const c = cats.categories[cid];
    const topLevel = c.name.split('/')[0].trim();
    topLevelNames.add(topLevel);
  }

  console.log('=== TOP-LEVEL CATEGORIES FROM HURTOWNIA SPORTOWA ===');
  console.log(`Total categories: ${Object.keys(cats.categories).length}`);
  console.log(`\nUnique top-level names (${topLevelNames.size}):`);
  for (const name of [...topLevelNames].sort()) {
    console.log(`  - ${name}`);
  }

  // Now check what's in our DB - get categories that might match
  // List categories from the screenshot that the user is concerned about
  const adminCategories = [
    'Biurowe i papiernicze', 'Chemia gospodarcza', 'Chemia profesjonalna',
    'Dla dziecka', 'Dom', 'Elektronika i GSM', 'Gastronomia', 'Motoryzacja',
    'Narzędzia', 'Ogród i Gospodarstwo', 'Opakowania i materiały wysyłkowe',
    'Outlet', 'Sport i turystyka', 'Wagi', 'Zdrowie i Uroda'
  ];

  console.log('\n=== MATCHING ADMIN CATEGORIES ===');
  const sportTopNames = [...topLevelNames].map(n => n.toLowerCase());
  for (const ac of adminCategories) {
    const isFromSport = sportTopNames.includes(ac.toLowerCase()) || 
      sportTopNames.some(s => ac.toLowerCase().includes(s) || s.includes(ac.toLowerCase()));
    if (isFromSport) {
      console.log(`  MATCH: "${ac}" matches sport category`);
    }
  }

  // Also check for sport-specific top-level names not in admin
  console.log('\n=== SPORT CATEGORIES NOT IN ADMIN LIST ===');
  for (const name of [...topLevelNames].sort()) {
    const inAdmin = adminCategories.some(ac => ac.toLowerCase() === name.toLowerCase());
    if (!inAdmin) {
      console.log(`  + "${name}"`);
    }
  }
}

main().catch(console.error);
