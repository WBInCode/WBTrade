/**
 * Send order cmm1ybzye002cekzuq4hjbq3w to Baselinker
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Client } = require('pg');
const https = require('https');
const crypto = require('crypto');

const ORDER_ID = 'cmm1ybzye002cekzuq4hjbq3w';

function decryptToken(ciphertext, iv, authTag) {
  const key = Buffer.from(process.env.BASELINKER_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}

function callBaselinker(token, method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      method,
      parameters: JSON.stringify(params),
    }).toString();
    const options = {
      hostname: 'api.baselinker.com',
      path: '/connector.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-BLToken': token,
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'ERROR') reject(new Error(`BL: ${parsed.error_code} - ${parsed.error_message}`));
          else resolve(parsed);
        } catch (e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Get BL config
  const cfgRes = await client.query('SELECT * FROM baselinker_configs LIMIT 1');
  if (cfgRes.rows.length === 0) { console.log('No BL config!'); await client.end(); return; }
  const cfg = cfgRes.rows[0];
  const blToken = decryptToken(cfg.api_token_encrypted, cfg.encryption_iv, cfg.auth_tag);
  console.log('BL token decrypted OK');

  // Get order
  const orderRes = await client.query('SELECT * FROM orders WHERE id = $1', [ORDER_ID]);
  if (orderRes.rows.length === 0) { console.log('Order not found!'); await client.end(); return; }
  const order = orderRes.rows[0];
  console.log('Order:', order.order_number, '| status:', order.status, '| payment:', order.payment_status, '| total:', order.total);
  
  if (order.baselinker_order_id) {
    console.log('Already synced to BL:', order.baselinker_order_id);
    await client.end(); return;
  }

  // Get items with product data
  const itemsRes = await client.query(`
    SELECT oi.*, pv.sku as variant_sku, pv.baselinker_variant_id, p.baselinker_product_id, p.tags, p.name as p_name
    FROM order_items oi
    LEFT JOIN product_variants pv ON oi.variant_id = pv.id
    LEFT JOIN products p ON pv.product_id = p.id
    WHERE oi.order_id = $1
  `, [ORDER_ID]);
  console.log('Items:', itemsRes.rows.length);

  // Get addresses
  let shippingAddr = null;
  if (order.shipping_address_id) {
    const addrRes = await client.query('SELECT * FROM addresses WHERE id = $1', [order.shipping_address_id]);
    shippingAddr = addrRes.rows[0] || null;
  }
  
  let billingAddr = null;
  if (order.billing_address_id) {
    const addrRes = await client.query('SELECT * FROM addresses WHERE id = $1', [order.billing_address_id]);
    billingAddr = addrRes.rows[0] || null;
  }

  // Get user
  let user = null;
  if (order.user_id) {
    const uRes = await client.query('SELECT id, email, first_name, last_name, phone FROM users WHERE id = $1', [order.user_id]);
    user = uRes.rows[0] || null;
  }

  console.log('User:', user ? `${user.first_name} ${user.last_name} (${user.email})` : 'guest');
  console.log('Shipping:', shippingAddr ? `${shippingAddr.first_name} ${shippingAddr.last_name}, ${shippingAddr.street}, ${shippingAddr.city} ${shippingAddr.postal_code}` : 'none');

  // Build products
  const products = {};
  itemsRes.rows.forEach((item, i) => {
    products[i] = {
      name: item.product_name,
      sku: item.sku || item.variant_sku || '',
      quantity: item.quantity,
      price_brutto: parseFloat(item.unit_price),
      variant_id: 0,
      auction_id: '0',
    };
  });

  const email = user ? user.email : (order.guest_email || '');
  const phone = user ? (user.phone || '') : (order.guest_phone || '');
  const addr = shippingAddr || {};
  const bAddr = billingAddr || shippingAddr || {};

  // Determine status: CONFIRMED + PAID = Nowe zamowienia
  let statusId = 65823; // Nieoplacone
  if (order.payment_status === 'PAID' || order.status === 'CONFIRMED') {
    statusId = 65342; // Nowe zamowienia
  }

  const blOrder = {
    order_status_id: statusId,
    date_add: Math.floor(new Date(order.created_at).getTime() / 1000),
    currency: 'PLN',
    payment_method: order.payment_method || '',
    payment_method_cod: 0,
    paid: (order.payment_status === 'PAID') ? 1 : 0,
    user_comments: order.customer_notes || '',
    admin_comments: `Zamowienie ${order.order_number} z WBTrade`,
    email: email,
    phone: phone,
    user_login: email,
    delivery_method: order.shipping_method || '',
    delivery_price: parseFloat(order.shipping || 0),
    delivery_fullname: `${addr.first_name || ''} ${addr.last_name || ''}`.trim(),
    delivery_company: addr.company || '',
    delivery_address: addr.street || '',
    delivery_city: addr.city || '',
    delivery_postcode: addr.postal_code || '',
    delivery_country_code: addr.country || 'PL',
    delivery_point_id: order.paczkomat_code || '',
    delivery_point_name: order.paczkomat_address || '',
    invoice_fullname: `${bAddr.first_name || ''} ${bAddr.last_name || ''}`.trim(),
    invoice_company: order.billing_company_name || '',
    invoice_nip: order.billing_nip || '',
    invoice_address: bAddr.street || '',
    invoice_city: bAddr.city || '',
    invoice_postcode: bAddr.postal_code || '',
    invoice_country_code: bAddr.country || 'PL',
    products: products,
  };

  console.log('\nSending to Baselinker...');
  console.log('Status:', statusId === 65342 ? 'Nowe zamowienia' : 'Nieoplacone');
  console.log('Products:', Object.keys(products).length);
  itemsRes.rows.forEach(item => console.log(`  - ${item.product_name} x${item.quantity} @ ${item.unit_price} PLN`));

  const result = await callBaselinker(blToken, 'addOrder', blOrder);
  console.log('\nBaselinker response:', JSON.stringify(result, null, 2));

  if (result.order_id) {
    await client.query(
      'UPDATE orders SET baselinker_order_id = $1, baselinker_synced_at = NOW() WHERE id = $2',
      [result.order_id.toString(), ORDER_ID]
    );
    console.log(`\nSUCCESS! Order synced to Baselinker, BL Order ID: ${result.order_id}`);
  }

  await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
