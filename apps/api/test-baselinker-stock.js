require('dotenv').config();

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';

async function test() {
  const formData = new URLSearchParams();
  formData.append('method', 'getInventoryProductsData');
  formData.append('parameters', JSON.stringify({
    inventory_id: 22951,
    products: [212537520, 212537521, 212537522]
  }));
  
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: {
      'X-BLToken': process.env.BASELINKER_API_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });
  
  const data = await response.json();
  
  console.log('Pełna odpowiedź:');
  console.log(JSON.stringify(data, null, 2));
}

test().catch(console.error);
