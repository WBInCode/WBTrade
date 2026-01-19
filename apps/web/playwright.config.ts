import { defineConfig, devices } from '@playwright/test';

/**
 * Konfiguracja Playwright dla testów E2E
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Global setup/teardown - uruchom API server */
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
  
  /* Uruchom testy równolegle */
  fullyParallel: true,
  
  /* Fail build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI tylko */
  retries: process.env.CI ? 2 : 0,
  
  /* Liczba workerów */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter - HTML raport + lista w konsoli */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  /* Wspólne ustawienia dla wszystkich projektów */
  use: {
    /* Base URL - możesz zmienić na localhost:3000 lokalnie */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Zbieraj trace przy failach */
    trace: 'on-first-retry',
    
    /* Screenshoty przy failach */
    screenshot: 'only-on-failure',
    
    /* Video przy failach */
    video: 'retain-on-failure',
    
    /* Timeout dla actions */
    actionTimeout: 10000,
  },

  /* Konfiguracja dla różnych przeglądarek */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test na mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test na różnych przegladarkach - branded */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* Uruchom dev server przed testami */
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
