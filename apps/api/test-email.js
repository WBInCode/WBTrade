/**
 * Skrypt do testowania wysyłania emaili
 * Uruchom: node test-email.js
 */

const { Resend } = require('resend');

// Konfiguracja - wstaw swój klucz API
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@wb-trade.pl';
const TEST_EMAIL = process.argv[2] || 'twoj-email@gmail.com'; // Podaj swój email jako argument

async function testEmail() {
  console.log('=== TEST WYSYŁANIA EMAILI ===\n');
  
  // 1. Sprawdź konfigurację
  console.log('1. Sprawdzanie konfiguracji...');
  console.log(`   RESEND_API_KEY: ${RESEND_API_KEY ? '✓ Ustawiony (' + RESEND_API_KEY.substring(0, 8) + '...)' : '✗ BRAK!'}`);
  console.log(`   FROM_EMAIL: ${FROM_EMAIL}`);
  console.log(`   TEST_EMAIL: ${TEST_EMAIL}\n`);
  
  if (!RESEND_API_KEY) {
    console.log('❌ Błąd: Brak RESEND_API_KEY!');
    console.log('   Ustaw zmienną środowiskową lub edytuj skrypt.');
    console.log('   Możesz też przekazać przez: $env:RESEND_API_KEY="re_xxxxx"; node test-email.js twoj@email.com');
    return;
  }
  
  // 2. Inicjalizacja Resend
  console.log('2. Inicjalizacja Resend...');
  const resend = new Resend(RESEND_API_KEY);
  
  // 3. Wysyłanie testowego emaila
  console.log('3. Wysyłanie testowego emaila...\n');
  
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TEST_EMAIL],
      subject: '🧪 Test wysyłania emaili - WBTrade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f97316;">✅ Email działa!</h1>
          <p>To jest testowy email z systemu WBTrade.</p>
          <p>Jeśli widzisz tę wiadomość, konfiguracja emaili jest poprawna.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Wysłano: ${new Date().toLocaleString('pl-PL')}<br>
            Z: ${FROM_EMAIL}
          </p>
        </div>
      `,
      text: 'Test wysyłania emaili - WBTrade. Jeśli widzisz tę wiadomość, konfiguracja jest poprawna.',
    });
    
    if (error) {
      console.log('❌ Błąd wysyłania:');
      console.log(error);
      return;
    }
    
    console.log('✅ Email wysłany pomyślnie!');
    console.log('   ID:', data?.id);
    console.log(`\n   Sprawdź skrzynkę: ${TEST_EMAIL}`);
    console.log('   (może trafić do spamu)\n');
    
  } catch (err) {
    console.log('❌ Wyjątek podczas wysyłania:');
    console.log(err.message);
    
    if (err.message.includes('API key')) {
      console.log('\n   Wskazówka: Sprawdź czy klucz API jest poprawny na https://resend.com/api-keys');
    }
    if (err.message.includes('domain')) {
      console.log('\n   Wskazówka: Musisz zweryfikować domenę na https://resend.com/domains');
    }
  }
}

testEmail();
