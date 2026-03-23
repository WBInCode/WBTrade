/**
 * Skrypt do odpalenia resync zdjęć na produkcji.
 * Loguje się jako admin i odpala sync typu "images".
 *
 * Użycie: node resync-images-prod.js <admin-password>
 */

const API_BASE = 'https://wbtradeprod.onrender.com/api';
const ADMIN_EMAIL = 'admin@wbtrade.pl';

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Użycie: node resync-images-prod.js <admin-password>');
    process.exit(1);
  }

  // 1. Login
  console.log('🔐 Logowanie jako admin...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.text();
    console.error(`❌ Login failed (${loginRes.status}): ${err}`);
    process.exit(1);
  }

  const loginData = await loginRes.json();
  const token = loginData.tokens?.accessToken;
  if (!token) {
    console.error('❌ Brak accessToken w odpowiedzi:', JSON.stringify(loginData));
    process.exit(1);
  }
  console.log('✅ Zalogowano pomyślnie');

  // 2. Trigger images-only sync
  console.log('🖼️  Uruchamianie sync zdjęć...');
  const syncRes = await fetch(`${API_BASE}/admin/baselinker/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ type: 'images' }),
  });

  if (!syncRes.ok) {
    const err = await syncRes.text();
    console.error(`❌ Sync failed (${syncRes.status}): ${err}`);
    process.exit(1);
  }

  const syncData = await syncRes.json();
  console.log('✅ Sync zdjęć uruchomiony!');
  console.log(`   Message: ${syncData.message}`);
  console.log(`   SyncLogId: ${syncData.syncLogId}`);
  console.log('\n📊 Postęp możesz śledzić w panelu admina → Import produktów');
}

main().catch((err) => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
