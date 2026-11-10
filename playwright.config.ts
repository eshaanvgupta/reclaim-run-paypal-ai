import { defineConfig, devices } from '@playwright/test';
process.env.RR_E2E_DB ||= './data/e2e-' + process.pid + '.sqlite';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  retries: 0,
  reporter: 'list',
  globalSetup: './tests/e2e/setup.ts',
  use: { baseURL: 'http://localhost:3101', trace: 'retain-on-failure', headless: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3101',
    reuseExistingServer: false,
    timeout: 60000,
    env: { PORT: '3101', APP_URL: 'http://localhost:3101', DATABASE_PATH: process.env.RR_E2E_DB },
  },
});
