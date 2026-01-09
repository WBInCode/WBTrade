/**
 * Test script for PayU webhook and email integration
 * Simulates a successful payment notification from PayU
 */

const crypto = require('crypto');

// Test configuration
const API_URL = 'http://localhost:5000';
const PAYU_SECOND_KEY = process.env.PAYU_SECOND_KEY || 'test-second-key';

// Create a test order ID
const testOrderId = 'test-order-' + Date.now();

// Simulate PayU webhook payload
const webhookPayload = {
  order: {
    orderId: `PAYU-${testOrderId}`,
    extOrderId: `${testOrderId}_${Date.now()}`,
    orderCreateDate: new Date().toISOString(),
    notifyUrl: `${API_URL}/api/webhooks/payu`,
    customerIp: '127.0.0.1',
    merchantPosId: process.env.PAYU_POS_ID || '300746',
    description: 'Test order',
    currencyCode: 'PLN',
    totalAmount: '10050', // 100.50 PLN in grosze
    status: 'COMPLETED', // Successful payment
    products: [
      {
        name: 'Test product',
        unitPrice: '10050',
        quantity: '1'
      }
    ]
  },
  localReceiptDateTime: new Date().toISOString(),
  properties: []
};

// Generate signature like PayU does
function generateSignature(body) {
  const bodyString = JSON.stringify(body);
  const hash = crypto
    .createHash('md5')
    .update(bodyString + PAYU_SECOND_KEY)
    .digest('hex');
  return `signature=${hash};algorithm=MD5;sender=checkout`;
}

async function testWebhook() {
  console.log('🧪 Testing PayU Webhook Integration\n');
  console.log('Test Order ID:', testOrderId);
  console.log('PayU Order ID:', webhookPayload.order.orderId);
  console.log('Status:', webhookPayload.order.status);
  console.log('Amount:', webhookPayload.order.totalAmount, 'grosze\n');

  // Generate signature
  const signature = generateSignature(webhookPayload);
  console.log('Generated signature:', signature.substring(0, 50) + '...\n');

  // Send webhook
  console.log('📤 Sending webhook to:', `${API_URL}/api/webhooks/payu`);
  
  try {
    const response = await fetch(`${API_URL}/api/webhooks/payu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OpenPayU-Signature': signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log('\n📥 Response status:', response.status);
    const result = await response.json();
    console.log('📥 Response body:', JSON.stringify(result, null, 2));

    if (response.status === 200) {
      console.log('\n✅ Webhook processed successfully!');
      console.log('\n💡 Check the API console for:');
      console.log('   1. Payment verification log');
      console.log('   2. Order status update');
      console.log('   3. Email sending attempt');
      console.log('\nNote: Email will only be sent if SMTP is configured.');
      console.log('In development mode, check console for email preview.');
    } else {
      console.log('\n❌ Webhook failed!');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. API is running on http://localhost:5000');
    console.log('   2. Docker containers (Redis, PostgreSQL) are running');
    console.log('   3. Run: docker-compose up -d');
  }
}

// Run the test
console.log('⏳ Waiting for API to be ready...\n');
setTimeout(testWebhook, 2000);
