import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const productsDir = dirname(fileURLToPath(import.meta.url));

function readProductFile(...segments: string[]) {
  return readFileSync(resolve(productsDir, ...segments), "utf8");
}

test("official logo sync prefers websites and persists App Store artwork as fallback", () => {
  const actions = readProductFile("actions.ts");
  const officialLogo = readProductFile("..", "..", "..", "lib", "official-site-logo.ts");

  assert.match(officialLogo, /const MIN_OFFICIAL_ICON_SCORE = 600/);
  assert.match(actions, /logoError=official-not-found/);
  assert.match(actions, /officialSiteLogo \|\| appStoreLogo\?\.logoUrl/);
  assert.match(actions, /app-store-cached/);
  assert.match(actions, /high-confidence official website icon/);
  assert.match(actions, /official App Store artwork/);
  assert.match(actions, /cacheRemoteProductLogo/);
  assert.match(actions, /logoError=download-failed/);
  assert.doesNotMatch(officialLogo, /return `\$\{siteUrl\.origin\}\/favicon\.ico`/);
  assert.match(actions, /officialLogoUrl \|\| \(!product\.logoUrl \? appStoreApp\.artworkUrl : null\)/);
});

test("public logos are served from the persistent GeoSub cache", () => {
  const route = readProductFile("..", "..", "api", "product-logos", "[slug]", "route.ts");
  const brandIcon = readProductFile("..", "..", "..", "components", "BrandIcon.tsx");
  const storage = readProductFile("..", "..", "..", "lib", "product-logo-storage.ts");

  assert.match(route, /readStoredProductLogo/);
  assert.doesNotMatch(route, /cacheRemoteProductLogo/);
  assert.doesNotMatch(route, /fetchOfficialSiteIcon/);
  assert.doesNotMatch(route, /fetch\(/);
  assert.match(route, /stale-while-revalidate/);
  assert.match(route, /X-Content-Type-Options/);
  assert.match(brandIcon, /\/api\/product-logos\//);
  assert.match(brandIcon, /\?source=\$\{encodeURIComponent\(src\)\}/);
  assert.match(brandIcon, /officialUrl\?\.trim\(\)/);
  assert.match(brandIcon, /loadedLogoSrc/);
  assert.match(brandIcon, /loading="eager"/);
  assert.match(brandIcon, /image\.complete/);
  assert.match(brandIcon, /image\.naturalWidth > 0/);
  assert.ok(
    brandIcon.indexOf('if (image.naturalWidth > 0)') <
      brandIcon.indexOf('else if (image.complete)'),
    'cached image dimensions must win before the completion failure check',
  );
  assert.doesNotMatch(
    brandIcon,
    /transition-opacity/,
    'logo visibility must not depend on a CSS transition completing',
  );
  assert.match(
    brandIcon,
    /absolute inset-0 h-full w-full object-cover/,
    'cached official images should fill the rounded app-icon frame',
  );
  assert.doesNotMatch(
    brandIcon,
    /h-\[72%\] w-\[72%\] object-contain/,
    'official images should not look inset inside a second tile',
  );
  assert.match(brandIcon, /event\.currentTarget\.style\.display = 'none'/);
  assert.match(storage, /GEOSUB_LOGO_STORAGE_DIR/);
  assert.match(storage, /\/var\/lib\/geosub\/product-logos/);
  assert.match(storage, /MAX_LOGO_BYTES/);
});

test("published product logos have a reusable full-catalog synchronization command", () => {
  const script = readProductFile("..", "..", "..", "scripts", "sync-product-logos.mts");
  const packageJson = readProductFile("..", "..", "..", "package.json");

  assert.match(script, /status: "PUBLISHED"/);
  assert.match(script, /readStoredProductLogo/);
  assert.match(script, /fetchOfficialSiteIcon/);
  assert.match(script, /lookupAppStoreArtwork/);
  assert.match(script, /cacheRemoteProductLogo/);
  assert.match(script, /process\.argv\.includes\("--check"\)/);
  assert.match(packageJson, /"check:logos"/);
  assert.match(packageJson, /"sync:logos"/);
});

test("product edit page explains the persistent official logo fallback", () => {
  const page = readProductFile("[id]", "edit", "page.tsx");

  assert.match(page, /官方网站高可信图标/);
  assert.match(page, /Apple 官方应用图标/);
  assert.match(page, /GeoSub 持久目录/);
  assert.match(page, /不会显示破损图片/);
  assert.match(page, /source\.type = 'app_store'/);
  assert.doesNotMatch(page, /source\.source_key/);
  assert.match(page, /getPricingDetailPath\("zh", product\.category, product\.slug\)/);
});
