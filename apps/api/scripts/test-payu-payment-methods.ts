/**
 * Test PayU Payment Methods
 * 
 * This script helps test different PayU payment scenarios
 * and shows what information is passed to Baselinker.
 * 
 * NOTE: PayU handles the payment method selection on their side.
 * The actual method used (BLIK, card, transfer) is returned
 * in the webhook notification and order details.
 * 
 * Usage: npx tsx scripts/test-payu-payment-methods.ts
 */

import { config } from 'dotenv';
config();

// Check if we can fetch PayU order details to see payment method
async function getPayUAccessToken(): Promise<string | null> {
  const posId = process.env.PAYU_POS_ID;
  const clientId = process.env.PAYU_CLIENT_ID || posId;
  const clientSecret = process.env.PAYU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Missing PayU credentials (PAYU_CLIENT_ID, PAYU_CLIENT_SECRET)');
    return null;
  }

  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://secure.payu.com'
    : 'https://secure.snd.payu.com';

  try {
    const response = await fetch(`${baseUrl}/pl/standard/user/oauth/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const data = await response.json() as any;
    
    if (data.access_token) {
      console.log('✅ Got PayU access token');
      return data.access_token;
    } else {
      console.error('❌ Failed to get access token:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting access token:', error);
    return null;
  }
}

async function getPayUOrderDetails(orderId: string): Promise<any> {
  const token = await getPayUAccessToken();
  if (!token) return null;

  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://secure.payu.com'
    : 'https://secure.snd.payu.com';

  try {
    const response = await fetch(`${baseUrl}/api/v2_1/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    return null;
  }
}

// Example PayU webhook payload showing payment method
const exampleWebhookPayloads = {
  blik: {
    order: {
      orderId: "EXAMPLE_ORDER_ID",
      extOrderId: "order-123_1705555555555",
      orderCreateDate: "2026-01-20T10:00:00.000+01:00",
      notifyUrl: "https://yourstore.com/api/webhooks/payu",
      customerIp: "127.0.0.1",
      merchantPosId: "123456",
      description: "Zamówienie #WBT-2026-0001",
      currencyCode: "PLN",
      totalAmount: "2435", // 24.35 PLN in grosze
      status: "COMPLETED",
      payMethod: {
        type: "BLIK" // <-- This is what we want to save!
      },
      products: [
        { name: "Test Product", unitPrice: "2435", quantity: "1" }
      ],
      buyer: {
        email: "test@example.com",
        phone: "123456789",
        firstName: "Jan",
        lastName: "Kowalski"
      }
    },
    properties: [
      { name: "PAYMENT_ID", value: "1234567890" }
    ]
  },

  card: {
    order: {
      orderId: "EXAMPLE_ORDER_ID_2",
      extOrderId: "order-456_1705555555556",
      status: "COMPLETED",
      payMethod: {
        type: "CARD_TOKEN",
        value: "TOK*****1234" // Masked card token
      }
    }
  },

  transfer: {
    order: {
      orderId: "EXAMPLE_ORDER_ID_3",
      extOrderId: "order-789_1705555555557",
      status: "COMPLETED",
      payMethod: {
        type: "PBL", // Pay-by-link (bank transfer)
        value: "m" // mBank
      }
    }
  },

  googlePay: {
    order: {
      orderId: "EXAMPLE_ORDER_ID_4",
      extOrderId: "order-101_1705555555558",
      status: "COMPLETED",
      payMethod: {
        type: "GPAY"
      }
    }
  },

  applePay: {
    order: {
      orderId: "EXAMPLE_ORDER_ID_5",
      extOrderId: "order-102_1705555555559",
      status: "COMPLETED",
      payMethod: {
        type: "APAY"
      }
    }
  }
};

// Map PayU payMethod.type to human-readable names
const PAYU_METHOD_NAMES: Record<string, string> = {
  'BLIK': 'BLIK',
  'CARD_TOKEN': 'Karta płatnicza',
  'PBL': 'Przelew bankowy',
  'GPAY': 'Google Pay',
  'APAY': 'Apple Pay',
  'INSTALLMENTS': 'Raty PayU',
  'KLARNA_PAY_LATER': 'Klarna',
  'PAYPO': 'PayPo',
  'TWISTO': 'Twisto',
};

function mapPayUMethodToName(payMethod: { type: string; value?: string }): string {
  if (!payMethod) return 'PayU';
  
  const baseName = PAYU_METHOD_NAMES[payMethod.type] || payMethod.type;
  
  // For bank transfers, we could map the bank code to name
  if (payMethod.type === 'PBL' && payMethod.value) {
    const bankNames: Record<string, string> = {
      'm': 'mBank',
      'o': 'Pekao',
      'i': 'ING',
      'p': 'PKO BP',
      'n': 'BNP Paribas',
      's': 'Santander',
      'a': 'Alior',
    };
    return bankNames[payMethod.value] || 'Przelew bankowy';
  }
  
  return baseName;
}

async function main() {
  console.log('=====================================');
  console.log('  PayU Payment Methods Test');
  console.log('=====================================\n');

  console.log('📋 EXAMPLE WEBHOOK PAYLOADS:\n');
  console.log('PayU sends payMethod in webhook notification after payment.\n');

  for (const [method, payload] of Object.entries(exampleWebhookPayloads)) {
    const payMethod = payload.order.payMethod;
    const friendlyName = mapPayUMethodToName(payMethod as any);
    
    console.log(`${method.toUpperCase()}:`);
    console.log(`  payMethod.type: ${payMethod.type}`);
    console.log(`  payMethod.value: ${(payMethod as any).value || 'N/A'}`);
    console.log(`  → Friendly name: ${friendlyName}`);
    console.log(`  → For Baselinker: "${friendlyName}"`);
    console.log();
  }

  console.log('=====================================');
  console.log('  WHAT NEEDS TO BE DONE:');
  console.log('=====================================\n');

  console.log('1. Update PayU webhook handler to extract payMethod.type');
  console.log('2. Save the actual payment method to order.paymentMethod');
  console.log('3. This will then appear correctly in Baselinker\n');

  console.log('Current flow:');
  console.log('  Checkout → paymentMethod = "payu"');
  console.log('  PayU page → User selects BLIK');
  console.log('  Webhook → payMethod.type = "BLIK" (not currently saved!)');
  console.log('  Baselinker → shows "PayU"\n');

  console.log('Improved flow:');
  console.log('  Checkout → paymentMethod = "payu"');
  console.log('  PayU page → User selects BLIK');
  console.log('  Webhook → payMethod.type = "BLIK" → update order.paymentMethod = "blik"');
  console.log('  Baselinker → shows "BLIK"\n');

  // Check if we have a real PayU order to inspect
  const testOrderId = process.argv[2];
  if (testOrderId) {
    console.log('=====================================');
    console.log(`  FETCHING REAL ORDER: ${testOrderId}`);
    console.log('=====================================\n');

    const orderDetails = await getPayUOrderDetails(testOrderId);
    if (orderDetails) {
      console.log('Order details:', JSON.stringify(orderDetails, null, 2));
      
      if (orderDetails.orders?.[0]?.payMethod) {
        const payMethod = orderDetails.orders[0].payMethod;
        console.log('\n📍 Payment method used:');
        console.log(`   Type: ${payMethod.type}`);
        console.log(`   Friendly name: ${mapPayUMethodToName(payMethod)}`);
      }
    }
  } else {
    console.log('💡 TIP: Pass a PayU order ID as argument to fetch real order details:');
    console.log('   npx tsx scripts/test-payu-payment-methods.ts YOUR_PAYU_ORDER_ID\n');
  }
}

main().catch(console.error);
