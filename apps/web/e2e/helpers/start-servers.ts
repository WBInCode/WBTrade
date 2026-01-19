/**
 * Helper do uruchamiania serwerów API i Web dla testów E2E
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let apiProcess: ChildProcess | null = null;

export async function startApiServer(): Promise<void> {
  console.log('🚀 Uruchamiam API server...');
  
  const apiDir = path.resolve(__dirname, '../../../api');
  
  apiProcess = spawn('pnpm', ['run', 'dev'], {
    cwd: apiDir,
    shell: true,
    stdio: 'pipe',
  });

  if (apiProcess.stdout) {
    apiProcess.stdout.on('data', (data) => {
      const message = data.toString();
      if (message.includes('Server is running')) {
        console.log('✅ API server uruchomiony!');
      }
    });
  }

  if (apiProcess.stderr) {
    apiProcess.stderr.on('data', (data) => {
      console.error('API Error:', data.toString());
    });
  }

  // Poczekaj 5 sekund na uruchomienie
  await new Promise(resolve => setTimeout(resolve, 5000));
}

export async function stopApiServer(): Promise<void> {
  if (apiProcess) {
    console.log('🛑 Zatrzymuję API server...');
    apiProcess.kill();
    apiProcess = null;
  }
}

// Cleanup on exit
process.on('exit', () => {
  if (apiProcess) {
    apiProcess.kill();
  }
});
