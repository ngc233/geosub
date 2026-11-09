import { defineConfig } from "@playwright/test";
const baseURL = process.env.GEOSUB_PRODUCT_TEST_ORIGIN ?? "http://127.0.0.1:3190";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) throw new Error("Local product fixture required");
export default defineConfig({
  testDir: "./tests/production", testMatch: "product-overview.spec.ts", workers: 1, retries: 0, timeout: 30_000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: ["chromium", "webkit"].flatMap(browser => [1280, 390].flatMap(width => ["light", "dark"].map(theme => ({
    name: `${browser}-${width}-${theme}`, use: { browserName: browser as "chromium" | "webkit", channel: browser === "chromium" ? "chrome" : undefined, colorScheme: theme as "light" | "dark", viewport: { width, height: width === 390 ? 844 : 720 } },
  })))),
});
