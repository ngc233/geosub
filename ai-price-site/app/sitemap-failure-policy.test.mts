import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(appDir, "..");
const deployCheckPath = resolve(
  siteDir,
  "..",
  "geosub-backend",
  "deploy",
  "linux-arm64",
  "post-deploy-check.sh",
);

test("production sitemap fails closed when dynamic routes cannot be generated", () => {
  const source = readFileSync(resolve(appDir, "sitemap.ts"), "utf8");

  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /process\.env\.NODE_ENV === "production"/);
  assert.match(source, /Sitemap generation failed/);
  assert.match(source, /throw error/);
  assert.match(source, /Development sitemap is using static routes only/);
});

test("post-deploy checks enforce sitemap range and dynamic sentinels", () => {
  const source = readFileSync(deployCheckPath, "utf8");

  assert.match(source, /GEOSUB_MIN_SITEMAP_URLS:-80/);
  assert.match(source, /sitemap_url_count >= MIN_SITEMAP_URLS/);
  assert.match(source, /\/zh\/ai-pricing\/chatgpt/);
  assert.match(source, /\/en\/ai-pricing\/chatgpt/);
  assert.match(source, /\/zh\/streaming-pricing\/netflix/);
  assert.match(source, /public sitemap missing dynamic sentinel/);
});
