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

  assert.match(actions, /const MIN_OFFICIAL_ICON_SCORE = 600/);
  assert.match(actions, /logoError=official-not-found/);
  assert.match(actions, /logoSynced=official-site/);
  assert.match(actions, /high-confidence official website icon/);
  assert.doesNotMatch(actions, /return `\$\{siteUrl\.origin\}\/favicon\.ico`/);
  assert.doesNotMatch(actions, /logoSource = officialSiteLogo \? "official-site" : "app-store"/);
  assert.doesNotMatch(actions, /officialLogoUrl \|\| appStoreApp\.artworkUrl/);
});

test("product edit page explains that App Store artwork is not a formal logo fallback", () => {
  const page = readProductFile("[id]", "edit", "page.tsx");

  assert.match(page, /官方网站高可信 icon/);
  assert.match(page, /不会自动写入 App Store artwork/);
  assert.match(page, /不再把 App Store artwork 当作正式 Logo/);
  assert.doesNotMatch(page, /App Store 官方 artwork/);
});
