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

test("production sitemap allows only a validated complete LKG before failing closed", () => {
  const source = readFileSync(resolve(appDir, "sitemap.ts"), "utf8");
  const policy = readFileSync(resolve(siteDir, "..", "docs", "SEO_POLICY.md"), "utf8");

  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /process\.env\.NODE_ENV === "production"/);
  assert.match(source, /Sitemap generation failed/);
  assert.match(source, /Sitemap last-known-good snapshot accepted/);
  assert.match(source, /GEOSUB_SITEMAP_LKG_PATH/);
  assert.match(source, /throw error/);
  assert.match(source, /Development sitemap is using static routes only/);

  assert.match(policy, /Last Known Good/);
  assert.match(policy, /generatedAt/);
  assert.match(policy, /urlCount/);
  assert.match(policy, /policyVersion/);
  assert.match(policy, /contentHash/);
  assert.match(policy, /SHA-256/);
  assert.match(policy, /siteOrigin/);
  assert.match(policy, /schemaVersion/);
  assert.match(policy, /24 小时/);
  assert.match(policy, /不得用静态路由子集冒充完整快照/);
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
