import { defineConfig } from "@playwright/test";

const baseURL = process.env.GEOSUB_RANKING_TEST_ORIGIN ?? "http://127.0.0.1:3184";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(baseURL).hostname)) {
  throw new Error("Ranking tests require a local production build + start server.");
}
export default defineConfig({
  testDir: "./tests/production",
  testMatch: "homepage-ranking.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: { baseURL, channel: "chrome", trace: "retain-on-failure" },
});
