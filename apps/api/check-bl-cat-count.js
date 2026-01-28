require('dotenv').config();

async function main() {
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: {
      'X-BLToken': process.env.BASELINKER_API_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'method=getInventoryCategories&parameters={"inventory_id":11235}'
  });
  const data = await res.json();
  console.log('Baselinker API:', Object.keys(data.categories).length, 'kategorii');
  
  // Policz główne i podkategorie
  let main = 0, sub = 0;
  for (const [id, cat] of Object.entries(data.categories)) {
    if (cat.parent_id === 0) main++;
    else sub++;
  }
  console.log('Główne:', main);
  console.log('Podkategorie:', sub);
}

main();
