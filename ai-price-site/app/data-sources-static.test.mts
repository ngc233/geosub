import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(fileName: string) {
  return readFileSync(resolve(appDir, fileName), "utf8");
}

test("Chinese data sources page matches current official source policy", () => {
  const source = readAppFile("zh/data-sources/page.tsx");

  assert.match(source, /正式价格榜优先使用 App Store/);
  assert.match(source, /Web 官网价格、Google Play、公开价格页和人工线索/);
  assert.match(source, /不混入排行/);
  assert.match(source, /每 12 小时同步一次汇率/);
  assert.match(source, /不会把税率额外加入采集价格里重新排序/);
  assert.match(source, /待审核、忽略或拒绝的观测不会混入正式榜单/);
});

test("English data sources page matches current official source policy", () => {
  const source = readAppFile("en/data-sources/page.tsx");

  assert.match(source, /App Store regional subscription prices as the official ranking source/);
  assert.match(source, /Official web pricing, Google Play, public pages and manual leads/);
  assert.match(source, /Not ranked/);
  assert.match(source, /refreshes rates every 12 hours/);
  assert.match(source, /do not add tax again/);
  assert.match(source, /pending, ignored or rejected observations are excluded from rankings/);
});
