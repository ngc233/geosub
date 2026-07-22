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

  assert.match(source, /App Store 各地区公开订阅价格/);
  assert.match(source, /Web 官网价格、Google Play 和其他公开价格/);
  assert.match(source, /不同来源不会混入同一价格排名/);
  assert.match(source, /每 12 小时更新一次/);
  assert.match(source, /不会把税率额外加入采集价格里重新排序/);
  assert.match(source, /待审核、忽略或拒绝的观测不会混入正式榜单/);
});

test("English data sources page matches current official source policy", () => {
  const source = readAppFile("en/data-sources/page.tsx");

  assert.match(source, /App Store regional subscription prices as the official ranking source/);
  assert.match(source, /Official web pricing, Google Play and other public prices/);
  assert.match(source, /Prices from different sources are not mixed into one ranking/);
  assert.match(source, /Rates are normally refreshed every 12 hours/);
  assert.match(source, /do not add tax again/);
  assert.match(source, /pending, ignored or rejected observations are excluded from rankings/);
});
