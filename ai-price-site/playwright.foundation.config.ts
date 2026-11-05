import { defineConfig } from "@playwright/test";

export default defineConfig({
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3140", trace: "retain-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL },
  projects: [
    { name: "scoped-css", testDir: "./e2e", testMatch: "public-style-foundation.spec.ts" },
    { name: "foundation", testDir: "./design/preview", testMatch: "foundation.spec.ts" },
  ],
  webServer: {
    env: { GEOSUB_V1_SAMPLE: "1" },
    command: "node node_modules/next/dist/bin/next dev design/preview --webpack --hostname 127.0.0.1 --port 3140",
    url: "http://127.0.0.1:3140/zh", reuseExistingServer: !process.env.CI, timeout: 120000,
  },
});
