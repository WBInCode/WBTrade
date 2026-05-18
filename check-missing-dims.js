require('dotenv').config({ path: './apps/api/.env' });
const BL_TOKEN = process.env.BASELINKER_API_TOKEN;

async function main() {
  console.log('Start...');
  // Pobierz listę i znajdź ID produktów po SKU
  const skus = ['1928759', '1928805', '1928830', '1929087', '1929133'];
  
  let page = 1;
  let found = {};
  let hasMore = true;
  
  while (hasMore && Object.keys(found).length < skus.length) {
    const formData = new URLSearchParams();
    formData.append('method', 'getInventoryProductsList');
    formData.append('parameters', JSON.stringify({ inventory_id: 26746, page }));
    const resp = await fetch('https://api.baselinker.com/connector.php', {
      method: 'POST',
      headers: { 'X-BLToken': BL_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    const data = await resp.json();
    const products = data.products || {};
    Object.entries(products).forEach(([id, p]) => {
      if (skus.includes(p.sku)) {
        found[p.sku] = parseInt(id);
      }
    });
    hasMore = Object.keys(products).length === 1000;
    page++;
  }
  
  console.log('Znalezione ID:', found);
  const ids = Object.values(found);
  
  // Pobierz szczegóły
  const formData2 = new URLSearchParams();
  formData2.append('method', 'getInventoryProductsData');
  formData2.append('parameters', JSON.stringify({ inventory_id: 26746, products: ids }));
  const resp2 = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'X-BLToken': BL_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData2.toString(),
  });
  const data2 = await resp2.json();
  
  Object.entries(data2.products || {}).forEach(([id, p]) => {
    const tf = p.text_fields || {};
    const desc = (tf.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('\nID:', id, 'SKU:', p.sku);
    console.log('  Name:', (tf.name || '').substring(0, 60));
    console.log('  API dims - h:', p.height, 'w:', p.width, 'l:', p.length, 'wt:', p.weight);
    console.log('  Desc:', desc.substring(0, 400));
  });
}
main().catch(e => console.error('ERR:', e));
