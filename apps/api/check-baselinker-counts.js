require('dotenv').config();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

const warehouses = {
  'Ikonka': '22951',
  'Leker': '22952',
  'BTP': '22953',
  'HP': '22954'
};

async function blRequest(apiToken, method, parameters = {}) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(parameters));
  
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  const data = await response.json();
  
  if (data.status === 'ERROR') {
    throw new Error(`Baselinker error: ${data.error_message}`);
  }
  
  return data;
}

async function main() {
  const apiToken = process.env.BASELINKER_API_TOKEN;
  
  if (!apiToken) {
    throw new Error('Brak BASELINKER_API_TOKEN w .env!');
  }
  
  console.log('📊 Liczba produktów w Baselinker:\n');
  
  for (const [name, id] of Object.entries(warehouses)) {
    let totalCount = 0;
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await blRequest(apiToken, 'getInventoryProductsList', {
        inventory_id: parseInt(id),
        page: page
      });
      
      const products = Object.values(response.products || {});
      totalCount += products.length;
      
      if (products.length === 0) {
        hasMore = false;
      } else {
        page++;
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
    
    console.log(`🏢 ${name.padEnd(8)}: ${totalCount.toLocaleString('pl-PL')} produktów`);
  }
}

main().catch(console.error);
