import { defineConfig } from "@playwright/test";
const baseURL = process.env.GEOSUB_COUNTRY_TEST_ORIGIN ?? "http://127.0.0.1:3198";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) throw new Error("Local fictional country fixture required");
export default defineConfig({
  testDir: "./tests/production", testMatch: "country-canvas.spec.ts", workers: 1, retries: 0, timeout: 45_000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: ["chromium", "webkit"].flatMap(browser => [1280, 390].flatMap(width => ["light", "dark"].map(theme => ({
    name: `${browser}-${width}-${theme}`, use: { browserName: browser as "chromium" | "webkit", channel: browser === "chromium" ? "chrome" : undefined, colorScheme: theme as "light" | "dark", viewport: { width, height: width === 390 ? 844 : 720 } },
  })))),
});
