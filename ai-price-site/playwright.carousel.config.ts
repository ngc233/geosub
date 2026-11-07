import { defineConfig } from "@playwright/test";

const baseURL = process.env.GEOSUB_CAROUSEL_TEST_ORIGIN ?? "http://127.0.0.1:3182";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(baseURL).hostname)) {
  throw new Error("Carousel production tests require a local build + start server.");
}
export default defineConfig({
  testDir: "./tests/production",
  testMatch: "homepage-carousel.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  use: { baseURL, channel: "chrome", trace: "retain-on-failure" },
});
