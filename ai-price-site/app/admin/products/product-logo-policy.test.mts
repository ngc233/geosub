import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const productsDir = dirname(fileURLToPath(import.meta.url));

function readProductFile(...segments: string[]) {
  return readFileSync(resolve(productsDir, ...segments), "utf8");
}

test("official logo sync only stores high-confidence website icons", () => {
  const actions = readProductFile("actions.ts");
  const officialLogo = readProductFile("..", "..", "..", "lib", "official-site-logo.ts");

  assert.match(officialLogo, /const MIN_OFFICIAL_ICON_SCORE = 600/);
  assert.match(actions, /logoError=official-not-found/);
  assert.match(actions, /logoSynced=official-site/);
  assert.match(actions, /high-confidence official website icon/);
  assert.match(actions, /cacheRemoteProductLogo/);
  assert.match(actions, /logoSource: "official-site-cached"/);
  assert.match(actions, /logoError=download-failed/);
  assert.doesNotMatch(officialLogo, /return `\$\{siteUrl\.origin\}\/favicon\.ico`/);
  assert.doesNotMatch(actions, /logoSource = officialSiteLogo \? "official-site" : "app-store"/);
  assert.doesNotMatch(actions, /officialLogoUrl \|\| appStoreApp\.artworkUrl/);
});

test("public logos are served from the persistent GeoSub cache", () => {
  const route = readProductFile("..", "..", "api", "product-logos", "[slug]", "route.ts");
  const brandIcon = readProductFile("..", "..", "..", "components", "BrandIcon.tsx");
  const storage = readProductFile("..", "..", "..", "lib", "product-logo-storage.ts");

  assert.match(route, /cacheRemoteProductLogo/);
  assert.match(route, /fetchOfficialSiteIcon/);
  assert.match(route, /stale-while-revalidate/);
  assert.match(route, /X-Content-Type-Options/);
  assert.match(brandIcon, /\/api\/product-logos\//);
  assert.match(brandIcon, /officialUrl\?\.trim\(\)/);
  assert.match(brandIcon, /loadedLogoSrc/);
  assert.match(brandIcon, /image\.complete/);
  assert.match(brandIcon, /image\.naturalWidth > 0/);
  assert.ok(
    brandIcon.indexOf('if (image.naturalWidth > 0)') <
      brandIcon.indexOf('else if (image.complete)'),
    'cached image dimensions must win before the completion failure check',
  );
  assert.match(brandIcon, /event\.currentTarget\.style\.display = 'none'/);
  assert.match(storage, /GEOSUB_LOGO_STORAGE_DIR/);
  assert.match(storage, /\/var\/lib\/geosub\/product-logos/);
  assert.match(storage, /MAX_LOGO_BYTES/);
});

test("product edit page explains that App Store artwork is not a formal logo fallback", () => {
  const page = readProductFile("[id]", "edit", "page.tsx");

  assert.match(page, /官方网站高可信 icon/);
  assert.match(page, /不会自动写入 App Store artwork/);
  assert.match(page, /下载到 GeoSub 持久目录/);
  assert.match(page, /不会显示破损图片/);
  assert.doesNotMatch(page, /App Store 官方 artwork/);
});
