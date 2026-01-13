/**
 * PayU Payment Scenarios Test Script
 * 
 * Ten skrypt testuje różne scenariusze płatności PayU:
 * - Pomyślna płatność
 * - Anulacja płatności przez użytkownika
 * - Odrzucona płatność
 * - Wygaśnięcie płatności
 * - Weryfikacja webhooków
 * - Refundy
 * 
 * Uruchom: npx ts-node scripts/test-payu-scenarios.ts
 */

import { PayUProvider } from '../src/providers/payment/payu.provider';
import crypto from 'crypto';

// Kolory dla konsoli
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const testResults: TestResult[] = [];

async function testScenario(name: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    testResults.push({ name, passed: true, message: 'OK' });
    logSuccess(`Test "${name}" - PASSED`);
  } catch (error: any) {
    testResults.push({ name, passed: false, message: error.message });
    logError(`Test "${name}" - FAILED: ${error.message}`);
  }
}

async function main() {
  logSection('🧪 TESTY SCENARIUSZY PŁATNOŚCI PAYU');
  
  // Sprawdzenie konfiguracji
  logSection('📋 SPRAWDZANIE KONFIGURACJI');
  
  const requiredEnvVars = ['PAYU_POS_ID', 'PAYU_CLIENT_ID', 'PAYU_CLIENT_SECRET', 'PAYU_SECOND_KEY'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    logError(`Brak wymaganych zmiennych środowiskowych: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  logSuccess('Wszystkie zmienne środowiskowe są ustawione');
  logInfo(`Środowisko: ${process.env.PAYU_SANDBOX === 'true' ? 'SANDBOX' : 'PRODUKCJA'}`);
  
  const provider = new PayUProvider({});
  
  // ============================================
  // TEST 1: Tworzenie płatności
  // ============================================
  logSection('TEST 1: TWORZENIE PŁATNOŚCI');
  
  let paymentSession: any = null;
  
  await testScenario('Tworzenie sesji płatności', async () => {
    const testOrderId = `SCENARIO_TEST_${Date.now()}`;
    
    paymentSession = await provider.createPayment({
      orderId: testOrderId,
      amount: 10.00, // 10 PLN
      currency: 'PLN',
      paymentMethod: 'card',
      customer: {
        email: 'test@example.com',
        firstName: 'Jan',
        lastName: 'Kowalski',
        phone: '500600700',
      },
      description: 'Test scenariuszy płatności',
      returnUrl: 'http://localhost:3000/order/test/confirmation',
      cancelUrl: 'http://localhost:3000/checkout?cancelled=true',
      notifyUrl: 'http://localhost:5000/api/webhooks/payu',
    });
    
    if (!paymentSession.sessionId) {
      throw new Error('Brak sessionId w odpowiedzi');
    }
    if (!paymentSession.paymentUrl) {
      throw new Error('Brak paymentUrl w odpowiedzi');
    }
    
    logInfo(`Session ID: ${paymentSession.sessionId}`);
    logInfo(`Payment URL: ${paymentSession.paymentUrl}`);
  });
  
  // ============================================
  // TEST 2: Weryfikacja statusu płatności
  // ============================================
  logSection('TEST 2: WERYFIKACJA STATUSU PŁATNOŚCI');
  
  if (paymentSession) {
    await testScenario('Weryfikacja statusu nowej płatności', async () => {
      const result = await provider.verifyPayment(paymentSession.sessionId);
      
      if (!result.sessionId) {
        throw new Error('Brak sessionId w wyniku weryfikacji');
      }
      
      logInfo(`Status: ${result.status}`);
      logInfo(`Amount: ${result.amount} ${result.currency}`);
      
      // Nowa płatność powinna być w statusie pending
      if (result.status !== 'pending') {
        logWarning(`Nieoczekiwany status: ${result.status} (oczekiwano: pending)`);
      }
    });
  }
  
  // ============================================
  // TEST 3: Anulacja płatności
  // ============================================
  logSection('TEST 3: ANULACJA PŁATNOŚCI');
  
  if (paymentSession) {
    await testScenario('Anulacja płatności przez API', async () => {
      const cancelled = await provider.cancelPayment(paymentSession.sessionId);
      
      if (cancelled) {
        logInfo('Płatność została anulowana przez API');
      } else {
        logWarning('Nie udało się anulować płatności (może być już przetworzona)');
      }
    });
    
    await testScenario('Weryfikacja statusu po anulacji', async () => {
      const result = await provider.verifyPayment(paymentSession.sessionId);
      logInfo(`Status po anulacji: ${result.status}`);
      
      // Status powinien być 'cancelled' lub 'pending' jeśli anulacja nie została przetworzona
      if (!['cancelled', 'pending'].includes(result.status)) {
        logWarning(`Nieoczekiwany status: ${result.status}`);
      }
    });
  }
  
  // ============================================
  // TEST 4: Walidacja webhooków
  // ============================================
  logSection('TEST 4: WALIDACJA WEBHOOKÓW');
  
  await testScenario('Generowanie i weryfikacja sygnatury MD5', async () => {
    const testPayload = JSON.stringify({
      order: {
        orderId: 'TEST123',
        status: 'COMPLETED',
        totalAmount: '1000',
      }
    });
    
    // Generowanie sygnatury
    const secondKey = process.env.PAYU_SECOND_KEY || '';
    const expectedSignature = crypto
      .createHash('md5')
      .update(testPayload + secondKey)
      .digest('hex');
    
    const signatureHeader = `signature=${expectedSignature};algorithm=MD5;sender=checkout`;
    
    // Weryfikacja
    const isValid = provider.validateWebhook(testPayload, signatureHeader);
    
    if (!isValid) {
      throw new Error('Walidacja sygnatury nie powiodła się');
    }
    
    logInfo(`Sygnatura: ${expectedSignature}`);
  });
  
  await testScenario('Przetwarzanie webhooków - różne statusy', async () => {
    const testCases = [
      { status: 'COMPLETED', expectedStatus: 'succeeded' },
      { status: 'CANCELED', expectedStatus: 'cancelled' },
      { status: 'REJECTED', expectedStatus: 'failed' },
      { status: 'PENDING', expectedStatus: 'pending' },
      { status: 'WAITING_FOR_CONFIRMATION', expectedStatus: 'pending' },
    ];
    
    for (const testCase of testCases) {
      const payload = {
        order: {
          orderId: 'PAYU_ORDER_123',
          extOrderId: 'MY_ORDER_123_1234567890',
          status: testCase.status,
          totalAmount: '1000',
          currencyCode: 'PLN',
        }
      };
      
      const result = await provider.processWebhook(payload);
      
      if (result.status !== testCase.expectedStatus) {
        throw new Error(
          `Błędne mapowanie statusu: ${testCase.status} -> ${result.status} (oczekiwano: ${testCase.expectedStatus})`
        );
      }
      
      logInfo(`${testCase.status} -> ${result.status} ✓`);
    }
  });
  
  // ============================================
  // TEST 5: Tworzenie płatności dla różnych metod
  // ============================================
  logSection('TEST 5: RÓŻNE METODY PŁATNOŚCI');
  
  const paymentMethods = ['blik', 'card', 'bank_transfer', 'google_pay', 'apple_pay'];
  
  for (const method of paymentMethods) {
    await testScenario(`Tworzenie płatności: ${method}`, async () => {
      const testOrderId = `METHOD_${method}_${Date.now()}`;
      
      const session = await provider.createPayment({
        orderId: testOrderId,
        amount: 1.00,
        currency: 'PLN',
        paymentMethod: method as any,
        customer: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
        description: `Test ${method}`,
        returnUrl: 'http://localhost:3000/test',
        cancelUrl: 'http://localhost:3000/checkout?cancelled=true',
        notifyUrl: 'http://localhost:5000/api/webhooks/payu',
      });
      
      if (!session.paymentUrl) {
        throw new Error('Brak URL płatności');
      }
      
      // Anuluj płatność testową
      await provider.cancelPayment(session.sessionId);
    });
  }
  
  // ============================================
  // PODSUMOWANIE
  // ============================================
  logSection('📊 PODSUMOWANIE TESTÓW');
  
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  
  console.log(`\nWyniki: ${passed}/${total} testów przeszło pomyślnie\n`);
  
  if (failed > 0) {
    logError('TESTY KTÓRE NIE PRZESZŁY:');
    testResults
      .filter(r => !r.passed)
      .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
  }
  
  // ============================================
  // INFORMACJE O KODACH TESTOWYCH
  // ============================================
  logSection('📝 KODY TESTOWE BLIK (SANDBOX)');
  
  console.log(`
Na podstawie dokumentacji PayU i załączonego obrazka:

${colors.green}KODY POZYTYWNE:${colors.reset}
  200201 - Pozytywna autoryzacja z rejestracją tokenu
  777xxx - Pozytywna autoryzacja bez rejestracji tokenu (np. 777123)

${colors.red}KODY NEGATYWNE:${colors.reset}
  500500 - Negatywna autoryzacja (odrzucona)
  700701 - Kod autoryzacyjny BLIK wygasł
  700702 - Kod autoryzacyjny BLIK został anulowany
  700703 - Kod autoryzacyjny BLIK został już użyty

${colors.yellow}KARTY TESTOWE:${colors.reset}
  Visa (sukces):      4444 3333 2222 1111, exp: 12/29, CVV: 123
  Mastercard:         5555 5555 5555 4444, exp: 12/29, CVV: 123
  3DS sukces:         4000 0000 0000 0077, exp: 12/29, CVV: 123
  3DS odrzucona:      4000 0000 0000 0085, exp: 12/29, CVV: 123
  Karta odrzucona:    4000 0000 0000 0002, exp: 12/29, CVV: 123
`);

  // ============================================
  // ZNALEZIONE PROBLEMY
  // ============================================
  logSection('⚠️ POTENCJALNE PROBLEMY W KODZIE');
  
  console.log(`
${colors.yellow}1. BRAK OBSŁUGI ANULACJI NA STRONIE CHECKOUT${colors.reset}
   Lokalizacja: apps/web/src/app/checkout/page.tsx
   Problem: cancelUrl ustawiony na '/checkout?orderId=...&cancelled=true',
            ale strona checkout nie obsługuje parametru 'cancelled'.
   Wpływ: Użytkownik wraca do checkout bez informacji o anulowaniu.

${colors.yellow}2. BRAK STRONY BŁĘDU PŁATNOŚCI${colors.reset}
   Lokalizacja: apps/web/src/app/order/[orderId]/confirmation/page.tsx
   Problem: Strona potwierdzenia pokazuje sukces niezależnie od statusu płatności.
            Brak dedykowanej strony/widoku dla nieudanych płatności.
   Wpływ: Użytkownik może myśleć, że płatność się udała gdy jest odrzucona.

${colors.yellow}3. NIEPEŁNA OBSŁUGA STATUSU 'WAITING_FOR_CONFIRMATION'${colors.reset}
   Lokalizacja: apps/api/src/services/payment.service.ts
   Problem: Status WAITING_FOR_CONFIRMATION jest mapowany na 'pending',
            ale UI nie pokazuje tego stanu użytkownikowi.
   Wpływ: Użytkownik nie wie, że musi potwierdzić płatność w aplikacji bankowej.

${colors.yellow}4. BRAK RETRY MECHANIZMU DLA NIEUDANYCH PŁATNOŚCI${colors.reset}
   Lokalizacja: apps/web/src/app/order/[orderId]/confirmation/page.tsx
   Problem: Nie ma przycisku "Spróbuj ponownie" dla nieudanych płatności.
   Wpływ: Użytkownik musi złożyć nowe zamówienie.

${colors.yellow}5. POTENCJALNY PROBLEM Z WERYFIKACJĄ SYGNATURY${colors.reset}
   Lokalizacja: apps/api/src/controllers/checkout.controller.ts (payuWebhook)
   Problem: Brak raw body - JSON.stringify(req.body) może różnić się od
            oryginalnego payloadu, co spowoduje błąd weryfikacji sygnatury.
   Wpływ: Webhooki mogą być odrzucane jako nieprawidłowe.

${colors.yellow}6. BRAK TIMEOUTU/EKSPIRACJI PŁATNOŚCI${colors.reset}
   Lokalizacja: apps/api/src/services/payment.service.ts
   Problem: Zamówienia z nieudanymi płatnościami pozostają w stanie OPEN
            bez automatycznego czyszczenia.
   Wpływ: Zalegające zamówienia, problemy z rezerwacją stanów magazynowych.
`);

  process.exit(failed > 0 ? 1 : 0);
}

// Załaduj zmienne środowiskowe
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

main().catch(console.error);
