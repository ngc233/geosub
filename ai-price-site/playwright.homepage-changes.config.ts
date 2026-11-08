import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.HOMEPAGE_TEST_URL || "http://127.0.0.1:3188";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) throw new Error("Local build + start only");
export default defineConfig({
  testDir: "./e2e", testMatch: "homepage-changes-resilience.spec.ts", workers: 1, retries: 0,
  use: { ...devices["Desktop Chrome"], channel: "chrome", baseURL, trace: "retain-on-failure" },
});
