import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.GEOSUB_PRODUCT_COUNTRY_TEST_URL || 'http://127.0.0.1:3218';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname)) {
  throw new Error('Product-country acceptance requires a local fictional test database');
}

// The caller supplies an existing production build + start instance. This suite
// neither starts a server nor seeds, migrates or writes to a database.
export default defineConfig({
  testDir: './tests/production', testMatch: 'product-country-canvas.spec.ts',
  workers: 1, fullyParallel: false, retries: 0, timeout: 60_000, reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
