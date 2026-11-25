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
    if (name === "./BrandIcon" || name === "./HomepageCountryFlag") return () => null;
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
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
// Fictional boundary examples, never inserted into a database or served publicly.
function product(billingCycle = "MONTHLY", prices = [2, 2, 4, 9]): DbPricingProduct {
  return { slug: "fictional-test", name: "测试产品：用于排版边界验证的长名称", brand: "Fixture", category: "ai", description: "虚构测试描述；原文与链接必须保持。".repeat(5), updatedAt: "2026-11-14", plans: [{ slug: "personal", name: "测试套餐", billingCycle, indexingStatus: "current", regions: prices.map((priceUsd, i) => ({ rank: i + 1, code: ["TR", "PH", "US", "JP"][i], countryName: ["土耳其", "菲律宾", "美国", "日本"][i], localPrice: "1,234,567.89 本币", priceUsd, taxNote: "unknown", dataQuality: "verified", isReference: i === 2, isCheap: i < 2, isExpensive: i > 2 })) }] };
}
for (const cycle of ["MONTHLY", "YEARLY", "WEEKLY"]) {
  test(`canvas retains exact rows, tied-lowest badges, compact header and destinations: ${cycle}`, () => {
    const p = product(cycle);
    const before = renderToStaticMarkup(createElement(Card, { product: p, locale: "zh" }));
    const after = renderToStaticMarkup(createElement(Card, { product: p, locale: "zh", canvas: true }));
    assert.deepEqual(hrefs(after), hrefs(before));
    assert.equal((after.match(/<tr/g) || []).length, (before.match(/<tr/g) || []).length);
    assert.match(after, /gs-listing-period/);
    assert.doesNotMatch(after, /虚构测试描述/);
    assert.doesNotMatch(after, /各地区定价/);
    assert.equal((after.match(/>最低价</g) || []).length, 2);
  });
}
test("empty and missing-plan cases keep the original fallback; no fake price", () => {
  const empty = renderToStaticMarkup(createElement(Client, { products: [], locale: "zh", canvas: true }));
  assert.match(empty, /当前分类暂无已发布价格数据。/); assert.doesNotMatch(empty, /gs-listing-card/);
  const p = product(); p.plans = [];
  assert.equal(renderToStaticMarkup(createElement(Card, { product: p, locale: "zh", canvas: true })), "");
});
test("no-US, zero-price, one-region and repeated-region behavior guards contradictory badges", () => {
  for (const prices of [[2], [0, 0], [2, 4]]) {
    const p = product("MONTHLY", prices);
    p.plans[0].regions.push({ ...p.plans[0].regions[0] });
    const old = renderToStaticMarkup(createElement(Card, { product: p, locale: "zh" }));
    const next = renderToStaticMarkup(createElement(Card, { product: p, locale: "zh", canvas: true }));
    assert.deepEqual(hrefs(next), hrefs(old));
    if (prices.length < 2 || prices[0] === prices[prices.length - 1]) {
      assert.doesNotMatch(next, />最低价</);
      assert.doesNotMatch(next, />最高价</);
    } else {
      assert.match(next, />最高价</);
    }
  }
  const usdCard = product("MONTHLY", [4.4, 20]);
  usdCard.plans[0].regions[0].localPrice = "4.4 USD/月";
  const usdHtml = renderToStaticMarkup(createElement(Card, { product: usdCard, locale: "zh", canvas: true }));
  assert.doesNotMatch(usdHtml, /4\.4 USD/);
});
test("listing keeps cycle order, suppresses lone cycle heading, and renders 4-column directory links", () => {
  const products = [product("YEARLY"), product("MONTHLY"), product("WEEKLY")].map((p, i) => ({ ...p, slug: `${p.slug}-${i}` }));
  const before = renderToStaticMarkup(createElement(Client, { products, locale: "zh" }));
  const after = renderToStaticMarkup(createElement(Client, { products, locale: "zh", canvas: true }));
  assert.deepEqual(hrefs(after), hrefs(before));
  assert.equal(hrefs(after).length, 6);
  assert.match(after, /gs-listing-directory-grid/);
  assert.match(after, /年付/);
  assert.match(after, /月付/);
  assert.match(after, /周付/);
  const singleCycle = renderToStaticMarkup(createElement(Client, { products: [product("MONTHLY")], locale: "zh", canvas: true }));
  assert.doesNotMatch(singleCycle, /<h3/);
  const mixed = [
    { ...product("MONTHLY"), slug: "ai-prod", category: "ai" as const },
    { ...product("MONTHLY"), slug: "stream-prod", name: "流媒体测试产品", category: "streaming" as const },
  ];
  const streamingHeader = renderToStaticMarkup(createElement(Client, {
    products: mixed,
    locale: "zh",
    canvas: true,
    initialCategory: "streaming",
    showCategoryHeader: true,
  }));
  assert.match(streamingHeader, /gs-segment-slider/);
  assert.match(streamingHeader, /流媒体订阅价格对比/);
  assert.match(streamingHeader, /流媒体测试产品/);
  assert.doesNotMatch(streamingHeader, /ai-prod/);
  const en = renderToStaticMarkup(createElement(Client, { products, locale: "en" }));
  assert.doesNotMatch(en, /gs-listing/);
  const multiPlanProduct: DbPricingProduct = {
    ...product("MONTHLY"),
    slug: "multi-plan-test",
    totalPlans: 2,
  };
  const multiPlanCard = renderToStaticMarkup(createElement(Card, { product: multiPlanProduct, locale: "zh", canvas: true }));
  assert.deepEqual(hrefs(multiPlanCard), ["/zh/ai-pricing/multi-plan-test"]);
  assert.match(multiPlanCard, /对比 2 个套餐与地区价格/);
  assert.match(multiPlanCard, /共 2 个套餐/);
});
