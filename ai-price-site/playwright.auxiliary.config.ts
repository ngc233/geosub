import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.GEOSUB_AUXILIARY_TEST_URL || 'http://127.0.0.1:3204';
if (!['127.0.0.1','localhost','[::1]'].includes(new URL(baseURL).hostname)) throw new Error('Local auxiliary fixture only');
export default defineConfig({ testDir:'./tests/production', testMatch:'auxiliary-canvas.spec.ts', workers:1, fullyParallel:false, timeout:60000, reporter:'list',
  use:{baseURL,trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome'],channel:'chrome'}},{name:'webkit',use:{...devices['Desktop Safari']}}],
});
