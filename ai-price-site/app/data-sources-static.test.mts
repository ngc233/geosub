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
  assert.match(source, /按所选显示币种换算地区价格/);
  assert.match(source, /价格采集、汇率和套餐复核日期分别标注/);
  assert.match(source, /通常每 12 小时同步一次/);
  assert.match(source, /不会把税率额外加入采集价格里重新排序/);
  assert.match(source, /地区排行只使用已通过检查/);
});

test("English data sources page matches current official source policy", () => {
  const source = readAppFile("en/data-sources/page.tsx");

  assert.match(source, /Public App Store subscription prices across supported regions/);
  assert.match(source, /Regional prices converted into the selected display currency/);
  assert.match(source, /Collection, exchange-rate and plan-review dates are labelled separately/);
  assert.match(source, /Reference rates normally synchronize every 12 hours/);
  assert.match(source, /do not add tax again/);
  assert.match(source, /Regional rankings use only prices that pass checks/);
});
