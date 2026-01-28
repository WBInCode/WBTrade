require('dotenv').config();

async function main() {
  const productId = 212580651;
  
  // Sprawdź w każdym magazynie
  const warehouses = [
    { id: 22951, name: 'Ikonka' },
    { id: 22952, name: 'Leker' },
    { id: 22953, name: 'BTP' },
    { id: 22954, name: 'HP' },
  ];
  
  for (const wh of warehouses) {
    const res = await fetch('https://api.baselinker.com/connector.php', {
      method: 'POST',
      headers: {
        'X-BLToken': process.env.BASELINKER_API_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `method=getInventoryProductsData&parameters={"inventory_id":${wh.id},"products":[${productId}]}`
    });
    const data = await res.json();
    
    if (data.products && data.products[productId]) {
      console.log(`\n=== ZNALEZIONO w ${wh.name} (${wh.id}) ===`);
      const prod = data.products[productId];
      console.log(`category_id: ${prod.category_id}`);
      console.log(`sku: ${prod.sku}`);
      console.log(`name: ${prod.text_fields?.name || 'brak'}`);
      return;
    }
  }
  
  console.log('Produkt nie znaleziony w żadnym magazynie');
}

main();
