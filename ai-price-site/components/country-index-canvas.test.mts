import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { priorityCountries } from "../lib/country-hubs.ts";

const require = createRequire(import.meta.url);
type Row = { productSlug: string; category: string };
// Handwritten fictional rows, used only in this process; no fixture routes or DB writes.
const fixture: Row[] = [
  { productSlug: "fictional-ai", category: "ai" },
  { productSlug: "fictional-ai", category: "ai" },
  { productSlug: "fictional-streaming", category: "streaming" },
];
async function render(locale: "zh" | "en" | "zh-tw" | "ja" | "ko" | "es", unavailable: string[] = [], empty: string[] = []) {
  const calls: string[] = [];
  const mod = { exports: {} as { CountryIndexPage: (props: { locale: string }) => Promise<ReactNode> } };
  const compile = (file: string) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const tag = (name: string) => function StaticTag({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) { return createElement(name, props, children); };
  const localRequire = (name: string): unknown => {
    if (name === "./PriceEvidenceShared") {
      const shared = { exports: {} };
      vm.runInNewContext(compile("./PriceEvidenceShared.tsx"), { ...shared, module: shared, Intl, URL, require: localRequire });
      return shared.exports;
    }
    if (name === "next/link") return tag("a");
    if (name === "next/cache") return { unstable_cache: (f: unknown) => f };
    if (name === "./AuxiliaryStyles") return function StaticStyles({ kind }: { kind: string }) { return createElement("style", { "data-gs-auxiliary": kind }); };
    if (name === "./BrandIcon") return function StaticBrand({ product }: { product: { slug: string } }) { return createElement("span", { "aria-hidden": true, "data-brand": product.slug }); };
    if (name === "./CountryIdentity") return function StaticIdentity({ code }: { code: string }) { return createElement("span", { "aria-hidden": true, "data-country": code }); };
    if (name === "./ui/PublicPage") return { PublicSection: tag("section"), DataNote: tag("div") };
    if (name === "../lib/country-hubs") return { priorityCountries };
    if (name === "../lib/cached-country-hub") return { loadCountryHub: async (code: string) => {
      calls.push(code);
      if (unavailable.includes(code)) throw new Error("Fictional read failure");
      return empty.includes(code) ? [] : fixture;
    } };
    if (name === "../lib/price-evidence-preview") return { getPriceEvidencePreview: () => null };
    if (name.endsWith(".module.css")) return { page: "legacy-page" };
    if (name.startsWith(".")) return {};
    return require(name);
  };
  vm.runInNewContext(compile("./PriceEvidencePages.tsx"), { ...mod, module: mod, Intl, URL, require: localRequire });
  return { html: renderToStaticMarkup(await mod.exports.CountryIndexPage({ locale })), calls };
}
const texts = (html: string) => html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, "");
test("directory retains featured country links, order and count semantics without duplicate sub-nav", async () => {
  const { html, calls } = await render("zh");
  assert.deepEqual(calls, ["TR", "IN", "PH", "JP"]);
  assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]), [
    ...priorityCountries.map(c => `/zh/countries/${c.slug}`),
  ]);
  assert.equal((texts(html).match(/2 个产品 · 3 个套餐 · AI 2 \/ 流媒体 1/g) || []).length, 4);
  assert.match(html, /gs-public-unified gs-country-index/);
  assert.doesNotMatch(texts(html), /GEOSUB 订阅价格数据/);
  assert.doesNotMatch(html, /gs-country-index-nav/);
  assert.doesNotMatch(html, /data-gs-motion-card/);
  assert.match(html, /gs-country-index-grid/);
  assert.equal((html.match(/class="gs-country-index-card"/g) || []).length, 4);
  assert.match(texts(html), /收录范围：App Store · 月付 · 已核验。逐个套餐与美国相同套餐比较，不发布国家综合指数，也不保证跨区购买资格。/);
});
test("one rejected country leaves the other cards and counts available", async () => {
  const { html, calls } = await render("zh", ["IN"]);
  assert.equal(calls.length, 4);
  assert.equal((texts(html).match(/覆盖数量暂时无法读取/g) || []).length, 1);
  assert.equal((texts(html).match(/2 个产品 · 3 个套餐/g) || []).length, 3);
  assert.equal((html.match(/class="gs-country-index-card"/g) || []).length, 4);
});
test("empty coverage is zero, all failures remain unavailable, never invented counts", async () => {
  const empty = await render("zh", [], ["TR", "IN", "PH", "JP"]);
  assert.equal((texts(empty.html).match(/0 个产品 · 0 个套餐 · AI 0 \/ 流媒体 0/g) || []).length, 4);
  const failed = await render("zh", ["TR", "IN", "PH", "JP"]);
  assert.equal((texts(failed.html).match(/覆盖数量暂时无法读取/g) || []).length, 4);
  assert.doesNotMatch(texts(failed.html), /0 个产品/);
});
test("English uses the unified country directory canvas with localized English copy and links", async () => {
  const { html } = await render("en");
  assert.match(html, /gs-public-unified gs-country-index/);
  assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]), [
    ...priorityCountries.map(c => `/en/countries/${c.slug}`),
  ]);
  assert.equal((html.match(/class="gs-country-index-card"/g) || []).length, 4);
  assert.match(texts(html), /2 products · 3 plans · AI 2 \/ Streaming 1/);
  assert.match(texts(html), /Scope: verified monthly App Store plans\./);
});
test("zh-tw, ja, ko and es render localized unified country directory canvas and locale-prefixed links", async () => {
  for (const locale of ["zh-tw", "ja", "ko", "es"] as const) {
    const { html } = await render(locale);
    assert.match(html, /gs-public-unified gs-country-index/);
    assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]), [
      ...priorityCountries.map(c => `/${locale}/countries/${c.slug}`),
    ]);
    assert.equal((html.match(/class="gs-country-index-card"/g) || []).length, 4);
  }
});
