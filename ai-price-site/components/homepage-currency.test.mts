import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { homepageDisplayRates, homepageProducts } from "../lib/homepage-summary.ts";
import { fictionalHomepageSource } from "../lib/test-fixtures/homepage.ts";
import { getComparablePriceRows } from "../lib/country-hubs.ts";
import { getHomepageRepresentatives } from "../lib/homepage-representatives.ts";
import * as display from "../lib/homepage-display.ts";

// Execute the real page pricing component with a controlled CNY preference.
// Child widgets are irrelevant to the page's stale-rate fallback and warning.
test("expired CNY renders USD and the existing visible warning in HomepagePricing", () => {
  const require = createRequire(import.meta.url);
  const now = new Date("2026-11-06T08:00:00Z"), source = fictionalHomepageSource(now);
  const products = homepageProducts(getHomepageRepresentatives(getComparablePriceRows(source.prices, source.rates, now)).representatives);
  const empty = () => null;
  const overrides: Record<string, unknown> = {
    "next/link": ({ children, href }: { children: unknown; href: string }) => createElement("a", { href }, children as string),
    "./PublicCurrencySelect": { default: ({ displayCurrency }: { displayCurrency: string }) => createElement("button", {}, `折合为 ${displayCurrency}`), usePublicCurrency: () => ["CNY"], usePageDisplayRates: empty, __esModule: true },
    "./PublicControls": { PublicSegments: empty, PublicComparisonBar: empty },
    "../lib/homepage-display": display,
    "./HomepageMap": ({ controls }: { controls: unknown }) => controls,
    ...Object.fromEntries(["./HomepageCountryFlag", "./PublicPriceNumber", "./PublicIcon", "./BrandIcon", "./HomepageProductMark"].map(name => [name, empty])),
  };
  const testModule = { exports: {} as { default: typeof import("./HomepagePricing").default } };
  const code = ts.transpileModule(readFileSync(new URL("./HomepagePricing.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: testModule, exports: testModule.exports, require: (name: string) => name in overrides ? overrides[name] : require(name), Intl });
  const render = (at: Date) => renderToStaticMarkup(createElement(testModule.exports.default, { products, rates: homepageDisplayRates(source.rates, at), map: { land: "", points: {} } }));
  const fresh = render(now);
  assert.match(fresh, /折合为 CNY/); assert.doesNotMatch(fresh, /CNY 汇率不可用/);
  const expired = render(new Date(now.getTime() + 18 * 3_600_000 + 1));
  assert.match(expired, /折合为 USD/);
  assert.match(expired, /role="status">CNY 汇率不可用，当前显示 USD；可选择其他币种。/);
});
