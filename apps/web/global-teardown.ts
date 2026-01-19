/**
 * Global teardown dla testów Playwright
 * Zatrzymuje API server po testach
 */

import { stopApiServer } from './e2e/helpers/start-servers';

async function globalTeardown() {
  console.log('🧹 Global teardown: Sprzątam...');
  await stopApiServer();
  console.log('✅ Cleanup zakończony!');
}

export default globalTeardown;
