import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_EVIDENCE_BASE_URL || 'http://127.0.0.1:3221';
const failureBaseURL = process.env.PLAYWRIGHT_EVIDENCE_FAILURE_BASE_URL || 'http://127.0.0.1:3223';
for (const value of [baseURL, failureBaseURL]) {
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Evidence navigation tests require local production-build servers only');
  }
}
if (new URL(baseURL).origin === new URL(failureBaseURL).origin) {
  throw new Error('The read-failure preview must be isolated from the normal fixture preview');
}

// The caller provides build + start instances. The failure instance has an
// independent build/cache and an unreachable loopback database address. This
// suite never starts services or seeds, changes or disables a database.
export default defineConfig({
  testDir: './tests/production', testMatch: 'evidence-navigation.spec.ts',
  workers: 1, fullyParallel: false, retries: 0, timeout: 60_000, reporter: 'list',
  metadata: { failureBaseURL },
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
