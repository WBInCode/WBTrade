/**
 * PayU Sandbox Payment Test Script
 * 
 * Ten skrypt testuje integrację z PayU w środowisku sandbox.
 * Uruchom: npx ts-node scripts/test-payu.ts
 */

import { PayUProvider } from '../src/providers/payment/payu.provider';

async function testPayUIntegration() {
  console.log('🧪 Test integracji PayU Sandbox\n');
  console.log('='.repeat(50));
  
  // Sprawdź zmienne środowiskowe
  console.log('\n📋 Sprawdzanie konfiguracji...');
  const config = {
    posId: process.env.PAYU_POS_ID,
    clientId: process.env.PAYU_CLIENT_ID,
    clientSecret: process.env.PAYU_CLIENT_SECRET ? '***ukryty***' : undefined,
    secondKey: process.env.PAYU_SECOND_KEY ? '***ukryty***' : undefined,
    sandbox: process.env.PAYU_SANDBOX,
  };
  console.log('Konfiguracja:', config);

  if (!process.env.PAYU_POS_ID || !process.env.PAYU_CLIENT_SECRET) {
    console.error('\n❌ Brak wymaganych zmiennych środowiskowych!');
    console.log('Wymagane zmienne:');
    console.log('  - PAYU_POS_ID');
    console.log('  - PAYU_CLIENT_ID');
    console.log('  - PAYU_CLIENT_SECRET');
    console.log('  - PAYU_SECOND_KEY');
    console.log('  - PAYU_SANDBOX=true');
    process.exit(1);
  }

  const provider = new PayUProvider({});
  console.log('\n✅ PayU Provider zainicjalizowany');
  console.log('   Środowisko:', provider.config.sandbox ? 'SANDBOX' : 'PRODUKCJA');
  console.log('   URL API:', provider.config.apiUrl);

  // Test 1: Pobierz metody płatności
  console.log('\n📱 Test 1: Pobieranie metod płatności...');
  try {
    const methods = await provider.getAvailableMethods();
    console.log('   Dostępne metody:', methods.map(m => m.name).join(', '));
  } catch (error) {
    console.error('   ❌ Błąd:', error);
  }

  // Test 2: Utwórz testową płatność
  console.log('\n💳 Test 2: Tworzenie testowej płatności...');
  try {
    const testOrderId = `TEST_${Date.now()}`;
    
    const paymentSession = await provider.createPayment({
      orderId: testOrderId,
      amount: 1.00, // 1 PLN
      currency: 'PLN',
      paymentMethod: 'card',
      customer: {
        email: 'test@example.com',
        firstName: 'Jan',
        lastName: 'Testowy',
        phone: '500600700',
      },
      description: 'Testowa płatność sandbox',
      returnUrl: 'http://localhost:3000/checkout/success',
      cancelUrl: 'http://localhost:3000/checkout/cancel',
      notifyUrl: 'http://localhost:3001/api/webhooks/payu',
    });

    console.log('\n   ✅ Płatność utworzona pomyślnie!');
    console.log('   Session ID:', paymentSession.sessionId);
    console.log('   Status:', paymentSession.status);
    console.log('   Kwota:', paymentSession.amount, paymentSession.currency);
    console.log('\n   🔗 URL do płatności (otwórz w przeglądarce):');
    console.log(`   ${paymentSession.paymentUrl}`);

    // Test 3: Sprawdź status płatności
    console.log('\n🔍 Test 3: Sprawdzanie statusu płatności...');
    const result = await provider.verifyPayment(paymentSession.sessionId);
    console.log('   Status:', result.status);
    console.log('   Kwota:', result.amount, result.currency);

    // Informacje o testowych danych kart
    console.log('\n' + '='.repeat(50));
    console.log('📝 DANE TESTOWE DO PŁATNOŚCI SANDBOX:');
    console.log('='.repeat(50));
    console.log('\n🔢 BLIK (kod testowy):');
    console.log('   Kod BLIK: 777123 (automatycznie zaakceptowany)');
    console.log('   Kod BLIK: 777456 (wymaga potwierdzenia w aplikacji)');
    console.log('   Kod BLIK: 777789 (odrzucony)');
    
    console.log('\n💳 Karty testowe:');
    console.log('   Visa (sukces):     4444 3333 2222 1111, exp: 12/29, CVV: 123');
    console.log('   Mastercard:        5555 5555 5555 4444, exp: 12/29, CVV: 123');
    console.log('   Karta odrzucona:   4000 0000 0000 0002, exp: 12/29, CVV: 123');
    
    console.log('\n🔐 3D Secure karty:');
    console.log('   3DS sukces:        4000 0000 0000 0077, exp: 12/29, CVV: 123');
    console.log('   3DS odrzucona:     4000 0000 0000 0085, exp: 12/29, CVV: 123');

    console.log('\n✨ Otwórz powyższy URL płatności i przetestuj różne scenariusze!');

  } catch (error: any) {
    console.error('   ❌ Błąd:', error.message || error);
    if (error.response) {
      console.error('   Odpowiedź:', await error.response.text?.() || error.response);
    }
  }
}

// Załaduj zmienne środowiskowe z pliku .env
import dotenv from 'dotenv';
import path from 'path';

// Ładuj z głównego katalogu projektu
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

testPayUIntegration().catch(console.error);
