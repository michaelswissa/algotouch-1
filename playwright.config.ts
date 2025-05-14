
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/playwright-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
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
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        timezoneId: 'Asia/Jerusalem',
        locale: 'he-IL',
        viewport: { width: 1280, height: 720 },
      },
      testDir: './e2e/performance',
    },
  ],
  webServer: {
    command: 'npm run preview',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});
