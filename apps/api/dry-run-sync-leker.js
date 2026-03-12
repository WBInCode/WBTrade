/**
 * Dry run synchronizacji — wywołuje te same endpointy co przyciski w panelu admina
 * i nasłuchuje SSE progress stream
 * 
 * Użycie:
 *   node dry-run-sync-leker.js update-only
 *   node dry-run-sync-leker.js new-only
 *   node dry-run-sync-leker.js full-resync
 *   node dry-run-sync-leker.js all          (uruchamia po kolei wszystkie 3)
 */

const http = require('http');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function listenSSE(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = http.get({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: { 'Accept': 'text/event-stream' },
    }, (res) => {
      let buffer = '';
      const events = [];
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.substring(6));
              events.push(event);
              
              // Print based on event type
              if (event.type === 'phase') {
                console.log(`\n  📋 ${event.message}`);
              } else if (event.type === 'progress' && event.percent !== undefined) {
                const pct = Math.round(event.percent);
                if (pct % 10 === 0 || event.current === event.total) {
                  process.stdout.write(`  [${pct}%] ${event.current}/${event.total} — ${event.message || ''}\r`);
                }
              } else if (event.type === 'warning') {
                console.log(`  ⚠️  ${event.message}`);
              } else if (event.type === 'error') {
                console.log(`  ❌ ${event.message}`);
              } else if (event.type === 'success') {
                console.log(`  ✅ ${event.message}`);
              } else if (event.type === 'complete') {
                console.log(`\n  🏁 ${event.message}`);
                res.destroy();
                resolve(events);
              } else if (event.type === 'aborted') {
                console.log(`\n  🛑 ${event.message}`);
                res.destroy();
                resolve(events);
              } else if (event.type === 'info') {
                console.log(`  ℹ️  ${event.message}`);
              }
            } catch {}
          }
        }
      });

      res.on('end', () => resolve(events));
      res.on('error', reject);
      
      // Timeout after 10 minutes
      setTimeout(() => {
        console.log('\n  ⏰ Timeout — 10min');
        res.destroy();
        resolve(events);
      }, 10 * 60 * 1000);
    });
    
    req.on('error', reject);
  });
}

async function login() {
  console.log('🔑 Logowanie jako admin...');
  const res = await httpRequest(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@wbtrade.pl', password: 'password123' }),
  });
  
  if (res.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
  }
  
  const token = res.data.tokens?.accessToken || res.data.accessToken || res.data.token;
  if (!token) throw new Error('No token in login response');
  console.log('   ✅ Zalogowano');
  return token;
}

async function getInventories(token) {
  const res = await httpRequest(`${API_URL}/admin/baselinker/inventories`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (res.status !== 200) throw new Error(`Failed to get inventories: ${res.status}`);
  
  const inventories = (res.data.inventories || []).filter(
    inv => !inv.name.includes('empik') && inv.name !== 'ikonka' && inv.name !== 'Główny'
  );
  return inventories;
}

async function startSync(token, mode, inventoryId) {
  const body = { type: 'products', mode };
  if (inventoryId) body.inventoryId = String(inventoryId);

  const res = await httpRequest(`${API_URL}/admin/baselinker/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Sync start failed: ${JSON.stringify(res.data)}`);
  }

  return res.data.syncLogId;
}

async function runSyncMode(token, mode, inventoryId, inventoryName) {
  const modeLabels = {
    'update-only': 'Aktualizuj istniejące produkty',
    'new-only': 'Dodaj nowe produkty',
    'full-resync': 'Pełna synchronizacja',
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${modeLabels[mode]}`);
  console.log(`  Magazyn: ${inventoryName} (ID: ${inventoryId})`);
  console.log(`  Tryb: ${mode}`);
  console.log(`${'='.repeat(60)}`);

  const syncLogId = await startSync(token, mode, inventoryId);
  console.log(`  SyncLogId: ${syncLogId}`);

  // Nasłuchuj SSE progress (tak samo jak frontend)
  const sseUrl = `${API_URL}/admin/baselinker/sync/progress/${syncLogId}?token=${token}`;
  await listenSSE(sseUrl);
}

async function main() {
  const requestedMode = process.argv[2] || 'all';
  const validModes = ['update-only', 'new-only', 'full-resync', 'all'];
  
  if (!validModes.includes(requestedMode)) {
    console.log(`Użycie: node dry-run-sync-leker.js [${validModes.join('|')}]`);
    process.exit(1);
  }

  const token = await login();
  
  // Pobierz magazyny (tak samo jak fetchInventories w frontend)
  console.log('\n📦 Pobieranie magazynów...');
  const inventories = await getInventories(token);
  
  console.log('   Dostępne magazyny:');
  for (const inv of inventories) {
    console.log(`     ${inv.inventory_id} — ${inv.name}`);
  }

  // Znajdź leker
  const leker = inventories.find(inv => inv.name.toLowerCase().includes('leker'));
  if (!leker) {
    console.error('❌ Nie znaleziono magazynu leker!');
    process.exit(1);
  }
  console.log(`\n   Wybrany: ${leker.name} (${leker.inventory_id})`);

  const modes = requestedMode === 'all' 
    ? ['update-only', 'new-only', 'full-resync'] 
    : [requestedMode];

  for (const mode of modes) {
    await runSyncMode(token, mode, leker.inventory_id, leker.name);
  }

  console.log('\n✅ Zakończono wszystkie dry runy\n');
}

main().catch(e => {
  console.error('❌ Błąd:', e.message);
  process.exit(1);
});
