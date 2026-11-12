import { defineConfig, devices } from '@playwright/test';
const baseURL=process.env.GEOSUB_GUIDES_TEST_URL || 'http://127.0.0.1:3202';
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(baseURL).hostname))throw new Error('Local guide fixture only');
export default defineConfig({ testDir:'./tests/production', testMatch:'guides-canvas.spec.ts', fullyParallel:false, workers:1, reporter:'list', timeout:60000,
 use:{baseURL,trace:'retain-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],channel:'chrome'}},{name:'webkit',use:{...devices['Desktop Safari']}}] });
