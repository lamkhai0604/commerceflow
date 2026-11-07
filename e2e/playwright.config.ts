import { defineConfig } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL || 'https://localhost:8443';
if (baseURL !== 'https://localhost:8443') throw new Error('OWNED_HTTPS_ORIGIN_REQUIRED');
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, retries: 0,
  timeout: 60000, forbidOnly: true, quiet: true,
  reporter: [['./support/safeReporter.ts']],
  outputDir: '/tmp/cf-s1c-playwright-output',
  use: {
    baseURL,
    ignoreHTTPSErrors: false, trace: 'off', screenshot: 'off', video: 'off',
    launchOptions: { executablePath: process.env.E2E_CHROMIUM, args: ['--no-sandbox'] },
  },
});
