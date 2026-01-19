/**
 * Global setup dla testów Playwright
 * Uruchamia API server przed testami
 */

import { startApiServer } from './e2e/helpers/start-servers';

async function globalSetup() {
  console.log('🔧 Global setup: Uruchamiam serwery...');
  await startApiServer();
  console.log('✅ Serwery gotowe do testów!');
}

export default globalSetup;
