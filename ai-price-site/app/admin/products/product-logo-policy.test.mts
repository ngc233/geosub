import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const productsDir = dirname(fileURLToPath(import.meta.url));

function readProductFile(...segments: string[]) {
  return readFileSync(resolve(productsDir, ...segments), "utf8");
}

test("public brand icons use rights-reviewed local sources and deterministic fallbacks", () => {
  const brandIcon = readProductFile("..", "..", "..", "components", "BrandIcon.tsx");
  const policy = readProductFile("..", "..", "..", "lib", "product-brand-assets.ts");

  assert.match(brandIcon, /getApprovedLocalBrandAsset/);
  assert.match(brandIcon, /getSimpleIconCandidates/);
  assert.match(brandIcon, /getInitials/);
  assert.match(brandIcon, /rounded-\[22%\]/);
  assert.match(brandIcon, /aspect-square/);
  assert.match(brandIcon, /object-contain/);
  assert.doesNotMatch(brandIcon, /\/api\/product-logos\//);
  assert.doesNotMatch(brandIcon, /object-cover/);
  assert.doesNotMatch(brandIcon, /CustomBrandMark/);
  assert.doesNotMatch(brandIcon, /startsWith\(['"]https?:/);

  assert.match(policy, /written-permission/);
  assert.match(policy, /owned-by-geosub/);
  assert.match(policy, /neutral fallback is/);
  assert.match(policy, /Simple Icons is bundled locally under CC0-1\.0/);
  assert.match(policy, /app-store-restricted/);
});

test("legacy remote logo cache is restricted to authenticated diagnostics", () => {
  const route = readProductFile("..", "..", "api", "product-logos", "[slug]", "route.ts");
  const storage = readProductFile("..", "..", "..", "lib", "product-logo-storage.ts");

  assert.match(route, /getCurrentAdmin/);
  assert.match(route, /if \(!admin\) return notFoundResponse\(\)/);
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /public, max-age/);
  assert.doesNotMatch(route, /cacheRemoteProductLogo/);
  assert.doesNotMatch(route, /fetch\(/);
  assert.match(route, /X-Content-Type-Options/);
  assert.match(storage, /GEOSUB_LOGO_STORAGE_DIR/);
  assert.match(storage, /\/var\/lib\/geosub\/product-logos/);
  assert.match(storage, /MAX_LOGO_BYTES/);
});

test("logo release gate audits public rendering without downloading third-party artwork", () => {
  const script = readProductFile("..", "..", "..", "scripts", "sync-product-logos.mts");
  const packageJson = readProductFile("..", "..", "..", "package.json");

  assert.match(script, /status: "PUBLISHED"/);
  assert.match(script, /getApprovedLocalBrandAsset/);
  assert.match(script, /getSimpleIconCandidates/);
  assert.match(script, /GeoSub neutral initials/);
  assert.match(script, /legacy remote logo retained as diagnostic metadata only/);
  assert.match(script, /Remote and App Store artwork is not downloaded or published/);
  assert.doesNotMatch(script, /lookupAppStoreArtwork/);
  assert.doesNotMatch(script, /cacheRemoteProductLogo/);
  assert.doesNotMatch(script, /fetch\(/);
  assert.match(packageJson, /"check:logos"/);
  assert.match(packageJson, /"sync:logos"/);
});

test("admin logo workflow labels downloaded candidates as non-public evidence", () => {
  const actions = readProductFile("actions.ts");
  const page = readProductFile("[id]", "edit", "page.tsx");
  const syncAction = actions.slice(
    actions.indexOf("export async function syncProductOfficialLogoAction"),
    actions.indexOf("export async function saveProductSeoAction"),
  );

  assert.match(syncAction, /diagnostic-only-not-public/);
  assert.match(syncAction, /app-store-restricted-diagnostic/);
  assert.match(syncAction, /it was not published/);
  assert.doesNotMatch(syncAction, /data:\s*\{[\s\S]*logoUrl: selectedLogoUrl/);
  assert.match(page, /缓存候选图标（不发布）/);
  assert.match(page, /只有已登记许可的本地资产才能公开展示/);
  assert.match(page, /远程 URL 和 App Store artwork 不会直接显示在前台/);
});
