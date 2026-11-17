import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DbPricingProduct } from "../lib/db-pricing-types.ts";

// Execute the real listing/card components. Only routing and the unrelated logo
// renderer are adapted for static rendering; price, cycle and copy logic is real.
const require = createRequire(import.meta.url);
const modules = new Map<string, unknown>();
function load(file: string): { default: ComponentType<Record<string, unknown>> } {
  if (modules.has(file)) return modules.get(file) as ReturnType<typeof load>;
  const testModule = { exports: {} };
  modules.set(file, testModule.exports);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: testModule.exports, module: testModule, Intl, URL, require: (name: string) => {
    if (name === "next/link") return function StaticLink({ children, ...props }: Record<string, unknown>) { return createElement("a", props, children as string); };
    if (name === "./BrandIcon") return () => null;
    if (name.startsWith(".")) {
      const base = resolve(dirname(file), name);
      const target = [base, `${base}.ts`, `${base}.tsx`].find(p => existsSync(p));
      if (target) return load(target);
    }
    return require(name);
  } });
  return testModule.exports as ReturnType<typeof load>;
}
const Client = load(resolve(import.meta.dirname, "DbAiPricingClient.tsx")).default;
const Card = load(resolve(import.meta.dirname, "DbPricingCard.tsx")).default;
const text = (html: string) => html.replace(/<[^>]*>/g, "").replace(/\s/g, "");
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
// Fictional boundary examples, never inserted into a database or served publicly.
function product(billingCycle = "MONTHLY", prices = [2, 2, 4, 9]): DbPricingProduct {
  return { slug: "fictional-test", name: "测试产品：用于排版边界验证的长名称", brand: "Fixture", category: "ai", description: "虚构测试描述；原文与链接必须保持。".repeat(5), updatedAt: "2026-11-14", plans: [{ slug: "personal", name: "测试套餐", billingCycle, indexingStatus: "current", regions: prices.map((priceUsd, i) => ({ rank: i + 1, code: ["TR", "PH", "US", "JP"][i], countryName: ["土耳其", "菲律宾", "美国", "日本"][i], localPrice: "1,234,567.89 本币", priceUsd, taxNote: "unknown", dataQuality: "verified", isReference: i === 2, isCheap: i < 2, isExpensive: i > 2 })) }] };
}
for (const cycle of ["MONTHLY", "YEARLY", "WEEKLY"]) {
  test(`canvas retains exact original card text, rows and destinations: ${cycle}`, () => {
    const p = product(cycle);
    const before = renderToStaticMarkup(createElement(Card, { product: p, locale: "zh" }));
    const after = renderToStaticMarkup(createElement(Card, { product: p, locale: "zh", canvas: true }));
    assert.equal(text(after), text(before));
    assert.deepEqual(hrefs(after), hrefs(before));
    assert.equal((after.match(/<tr/g) || []).length, (before.match(/<tr/g) || []).length);
    assert.match(after, /gs-listing-period/);
    assert.equal((after.match(/>最低价</g) || []).length, 2);
  });
}
test("empty and missing-plan cases keep the original fallback; no fake price", () => {
  const empty = renderToStaticMarkup(createElement(Client, { products: [], locale: "zh", canvas: true }));
  assert.match(empty, /当前分类暂无已发布价格数据。/); assert.doesNotMatch(empty, /gs-listing-card/);
  const p = product(); p.plans = [];
  assert.equal(renderToStaticMarkup(createElement(Card, { product: p, locale: "zh", canvas: true })), "");
});
test("no-US, zero-price, one-region and repeated-region behavior is unchanged", () => {
  for (const prices of [[2], [0, 0], [2, 4]]) {
    const p = product("MONTHLY", prices);
    p.plans[0].regions.push({ ...p.plans[0].regions[0] });
    const old = renderToStaticMarkup(createElement(Card, { product: p, locale: "zh" }));
    const next = renderToStaticMarkup(createElement(Card, { product: p, locale: "zh", canvas: true }));
    assert.equal(text(next), text(old)); assert.deepEqual(hrefs(next), hrefs(old));
  }
});
test("listing keeps cycle order, original words and overview link order", () => {
  const products = [product("YEARLY"), product("MONTHLY"), product("WEEKLY")].map((p, i) => ({ ...p, slug: `${p.slug}-${i}` }));
  const before = renderToStaticMarkup(createElement(Client, { products, locale: "zh" }));
  const after = renderToStaticMarkup(createElement(Client, { products, locale: "zh", canvas: true }));
  assert.equal(text(after), text(before)); assert.deepEqual(hrefs(after), hrefs(before));
  assert.equal(hrefs(after).length, 6);
  const en = renderToStaticMarkup(createElement(Client, { products, locale: "en" }));
  assert.doesNotMatch(en, /gs-listing/);
});
