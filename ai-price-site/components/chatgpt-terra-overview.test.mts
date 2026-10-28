import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { SubscriptionProduct } from "../lib/public-pricing-model.ts";
import { preparedSiteLocaleDefinitions, type SiteLocale } from "../lib/site-locale.ts";

const require = createRequire(import.meta.url);
const componentDir = dirname(fileURLToPath(import.meta.url));
const modules = new Map<string, Record<string, unknown>>();

// Exercise the real component and its content/selection helpers with synthetic
// prices. Only CSS modules are substituted; no app server, database or network.
function load(path: string): Record<string, unknown> {
  const cached = modules.get(path);
  if (cached) return cached;
  const loadedModule = { exports: {} as Record<string, unknown> };
  modules.set(path, loadedModule.exports);
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  runInNewContext(source, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (specifier: string) => {
      if (specifier.endsWith(".module.css")) return { default: { scope: "scope" }, __esModule: true };
      if (!specifier.startsWith(".")) return require(specifier);
      const base = resolve(dirname(path), specifier);
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
      assert.ok(resolved, `Missing test dependency: ${specifier}`);
      return load(resolved);
    },
  }, { filename: path });
  return loadedModule.exports;
}

const ProductPlanOverview = load(resolve(componentDir, "ProductPlanOverview.tsx")).default as ComponentType<{
  product: SubscriptionProduct;
  locale: SiteLocale;
}>;

const product: SubscriptionProduct = {
  slug: "chatgpt", category: "ai", name: "ChatGPT", brand: "OpenAI",
  description: "Synthetic rendering fixture", defaultPlan: "plus", updatedAt: "2026-10-27",
  plans: ["plus", "pro"].map((slug, index) => ({
    slug, name: slug === "plus" ? "Plus" : "Pro", billing: "monthly",
    regions: [{ rank: 1, country: "United States", code: "US", priceUsd: index ? 200 : 20,
      localPrice: index ? "USD 200" : "USD 20", tax: "Varies", billingPlatform: "ios" }],
  })),
};
const approvedText = "2026年10月26日，OpenAI 开始向 Plus、Pro 等付费套餐推出用于 Work 和 Codex 的 GPT-6.1 Terra。此次更新不改变套餐整体用量上限，具体可用性以账号实际开放情况为准。";
const sourceUrl = "https://help.openai.com/en/articles/6825453-chatgpt-release-notes";
const render = (locale: SiteLocale, candidate = product) => renderToStaticMarkup(createElement(ProductPlanOverview, { locale, product: candidate }));

test("Chinese ChatGPT overview renders the approved, sourced Work/Codex note exactly once", () => {
  const html = render("zh");
  assert.equal(html.split(approvedText).length - 1, 1);
  assert.match(html, /role="note" aria-label="GPT-6\.1 Terra 更新说明"/);
  assert.ok(html.includes(`href="${sourceUrl}" target="_blank" rel="noopener noreferrer"`));
  assert.match(html, /OpenAI 官方更新说明/);
  assert.match(html, /min-h-11[^\"]*focus-visible:outline/);
  assert.ok(html.indexOf(approvedText) < html.indexOf('data-single-plan='));
});

test("Terra note stays absent from every other locale and representative other products", () => {
  for (const locale of Object.keys(preparedSiteLocaleDefinitions) as SiteLocale[]) {
    if (locale !== "zh") assert.ok(!render(locale).includes("GPT-6.1 Terra"), locale);
  }
  for (const slug of ["claude", "gemini", "grok", "netflix", "chatgpt-other"]) {
    assert.ok(!render("zh", { ...product, slug }).includes("GPT-6.1 Terra"), slug);
  }
});

test("note is independent of collected plan counts, without inventing any price data", () => {
  for (const plans of [product.plans.slice(0, 1), []]) {
    const html = render("zh", { ...product, plans });
    assert.ok(html.includes(approvedText));
    assert.equal((html.match(/data-single-plan=/g) || []).length, plans.length);
  }
});

test("overview presenter is unreachable from plan routes, including frozen Chinese Plus", () => {
  const path = resolve(componentDir, "PricingDetailPage.tsx");
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let calls = 0;
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "ProductPlanOverview") {
      calls += 1;
      let parent = node.parent;
      while (parent && !(ts.isIfStatement(parent) && parent.expression.getText(source) === "!routePlanSlug")) parent = parent.parent;
      assert.ok(parent, "ProductPlanOverview must remain inside the overview-only route guard");
      assert.ok(ts.isIfStatement(parent) && !parent.elseStatement);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(calls, 1);
  assert.ok(!readFileSync(resolve(componentDir, "../lib/product-editorial-content.ts"), "utf8").includes("GPT-6.1 Terra"));
});
