import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SubscriptionProduct, ProductPlan, RegionPrice } from "../lib/public-pricing-model.ts";
import { countryPagePilots } from "../lib/country-page-pilot.ts";

// Handwritten fictional boundary prices, never inserted into a DB or exposed by
// a fixture route. Existing editorial pilot events are read from the real module.
const require = createRequire(import.meta.url);
const source = resolve(import.meta.dirname, "CountryPricingPilotPage.tsx");
const localPrice = "KRW 9,999,999,999.99 / 月";
function region(code: string, priceUsd: number): RegionPrice {
  return { rank: 99, code, country: code === "US" ? "美国" : "韩国", priceUsd,
    localPrice: code === "US" ? "$5.00 / 月" : localPrice, currencyCode: code === "US" ? "USD" : "KRW",
    tax: "虚构测试税务说明", taxConfidence: "unknown", billingPlatform: "ios",
    lastCheckedAt: "2026-11-17", fxRateDate: "2026-11-16", sourceName: "虚构测试来源" };
}
function product(): SubscriptionProduct {
  const plan = (slug: string): ProductPlan => ({ slug, name: `虚构套餐 ${slug}`, billing: "monthly", regions: [region("KR", 10), region("US", 5)] });
  return { slug: "claude", name: "虚构测试产品", brand: "Fixture", category: "ai", description: "只用于测试", defaultPlan: "max-5x", updatedAt: "2026-11-17",
    officialUrl: "https://example.invalid/fictional-official", plans: [plan("max-5x"), plan("max-20x")] };
}
type Rate = { rate: number; rateDate: string; isFallback?: boolean; isExpired?: boolean; isStale?: boolean };
const fresh: Rate = { rate: 1234.5, rateDate: "2026-11-17", isFallback: false, isExpired: false, isStale: false };
type Options = { product?: SubscriptionProduct | null; rate?: Rate | null; slug?: string; country?: string; locale?: "zh" | "en" };
async function execute(options: Options = {}) {
  const value = options.product === undefined ? product() : options.product;
  const rate = options.rate === undefined ? fresh : options.rate;
  const calls: Array<{ reader: string; args: unknown[] }> = [];
  const modules = new Map<string, { exports: Record<string, unknown> }>();
  const tag = (name: string) => function StaticElement({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) { return createElement(name, props, children); };
  function load(file: string): Record<string, unknown> {
    const cached = modules.get(file); if (cached) return cached.exports;
    const mod = { exports: {} as Record<string, unknown> }; modules.set(file, mod);
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { exports: mod.exports, module: mod, Intl, URL, Date, process, require: (name: string) => {
      if (name === "next/link") return tag("a");
      if (name === "next/navigation") return { notFound: () => { throw new Error("NEXT_NOT_FOUND"); } };
      if (name.endsWith("/pricing-detail-adapter")) return { getPricingDetailProduct: async (...args: unknown[]) => { calls.push({ reader: "product", args }); return value; } };
      if (name.endsWith("/exchange-rates")) return { getLatestUsdExchangeRates: async (...args: unknown[]) => { calls.push({ reader: "rates", args }); return rate ? { KRW: rate } : {}; } };
      if (name === "./BrandIcon") return () => null;
      if (name.startsWith(".")) {
        const base = resolve(dirname(file), name);
        const target = [base, base + ".tsx", base + ".ts"].find(existsSync);
        assert.ok(target, `Unresolved test module ${name}`);
        if (extname(target) === ".json") return require(target);
        return load(target);
      }
      return require(name);
    } });
    return mod.exports;
  }
  const loaded = load(source);
  const props = { params: Promise.resolve({ slug: options.slug ?? "claude", country: options.country ?? "south-korea" }), locale: options.locale ?? "zh", category: "ai" };
  const render = loaded.default as (input: typeof props) => Promise<ReactNode>;
  const metadata = loaded.getCountryPricingPilotMetadata as (input: typeof props) => Promise<Record<string, unknown>>;
  return { html: renderToStaticMarkup(await render(props)), metadata: JSON.parse(JSON.stringify(await metadata(props))), calls };
}
const text = (html: string) => html.replace(/<[^>]*>/g, "");
const links = (html: string) => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m => ({
  href: m[1].match(/\bhref="([^"]+)"/)?.[1], rel: m[1].match(/\brel="([^"]+)"/)?.[1], target: m[1].match(/\btarget="([^"]+)"/)?.[1], text: text(m[2]),
}));

test("product-country preserves historical evidence and long fictional current prices", async () => {
  const result = await execute();
  const body = text(result.html);
  assert.match(body, /KRW 99,000/); assert.match(body, /KRW 199,000/); assert.match(body, /2026-08-16/);
  assert.equal(body.split(localPrice).length - 1, 2);
  assert.match(body, /全球价格位次 2\/2/); assert.match(body, /对比美国 \+100%/);
  assert.match(body, /相邻价位 · 美国 \$5\.00/);
  assert.match(body, /税务可信度 · 待复核/);
  const allLinks = links(result.html);
  assert.deepEqual(allLinks.map(a => a.href), ["/zh/ai-pricing/claude", "https://apps.apple.com/kr/app/id6473753684", "/zh/ai-pricing/claude/max-5x", "/zh/ai-pricing/claude/max-20x", "https://example.invalid/fictional-official"]);
  assert.equal(allLinks[1].text, "查看历史核验来源");
  assert.doesNotMatch(body, /暂无已核验的当前价格/);
  for (const index of [1, 4]) { assert.equal(allLinks[index].rel, "noopener noreferrer"); assert.equal(allLinks[index].target, "_blank"); }
  assert.match(result.html, /data-track-event="click_related_plan"/);
  assert.match(result.html, /data-track-placement="country_page_price_table"/);
  assert.deepEqual(JSON.parse(JSON.stringify(result.calls.filter(c => c.reader === "rates").map(c => c.args))), [[["KRW"]]]);
});

test("other pilots keep active event display and current source fallback", async () => {
  const p = product(); p.plans = [p.plans[1]];
  p.slug = "grok";
  const grokEvent = countryPagePilots.find(pilot => pilot.productSlug === "grok" && pilot.countryCode === "KR")!.priceEvent!;
  const fallback = await execute({ product: p, slug: "grok" });
  assert.equal(links(fallback.html)[1].href, grokEvent.sourceUrl);
  p.plans[0].regions[0].sourceUrl = "https://example.invalid/fictional-row-evidence";
  const { html } = await execute({ product: p, slug: "grok" });
  assert.equal(links(html)[1].href, "https://example.invalid/fictional-row-evidence");
  assert.ok(text(html).includes(`${grokEvent.planSlug}: ${grokEvent.previousLocalPrice}`));
  assert.match(html, /<span class="gs-product-country-event-price">KRW 49,000<\/span>/);
  assert.match(html, /<span class="gs-product-country-event-next"><svg\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>KRW 14,000<\/span>/);
  const english = await execute({ product: p, slug: "grok", locale: "en" });
  assert.doesNotMatch(english.html, /gs-product-country-event-/);
  assert.match(english.html, /KRW 49,000<svg\b[^>]*class="[^"]*\binline\b[^"]*"[^>]*>[\s\S]*?<\/svg>KRW 14,000/);
  assert.doesNotMatch(text(html), /历史调价/);
  assert.doesNotMatch(text(html), /暂无同套餐美国参考价/);
});

test("Claude KR renders history separately from a Pro-only table in both languages", async () => {
  const p = product();
  p.plans = [{ ...p.plans[0], slug: "pro", name: "Claude Pro" }];
  p.plans[0].regions[0].sourceUrl = "https://example.invalid/fictional-pro-evidence";
  for (const locale of ["zh", "en"] as const) {
    const { html, metadata } = await execute({ product: p, locale });
    const table = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1] || "";
    assert.equal((table.match(/<tr\b/g) || []).length, 1);
    assert.match(text(table), /Claude Pro/);
    assert.doesNotMatch(table, /Max|99,000|199,000/);
    assert.match(text(html), locale === "zh" ? /历史调价/ : /Historical price change/);
    assert.match(text(html), /Max 5x.*KRW 99,000.*KRW 199,000/);
    assert.match(html, /<time dateTime="2026-08-16">2026-08-16<\/time>/);
    assert.match(text(html), locale === "zh"
      ? /旧 Max 5x 和 Max 20x 暂无已核验的当前价格/
      : /Verified current pricing is unavailable for the original Max 5x and Max 20x/);
    const allLinks = links(html);
    assert.equal(allLinks.find(a => a.text === (locale === "zh" ? "查看 App Store 证据" : "Open App Store evidence"))?.href, p.plans[0].regions[0].sourceUrl);
    assert.equal(allLinks.find(a => a.text === (locale === "zh" ? "查看历史核验来源" : "View historical source"))?.href, "https://apps.apple.com/kr/app/id6473753684");
    assert.doesNotMatch(String(metadata.description), /99,000|199,000|Max 5x|Max 20x/);
    assert.doesNotMatch(text(html), /三档个人套餐齐全|All three individual tiers are present/);
  }
});

test("no US reference and unusable FX retain existing truthful fallbacks", async () => {
  const p = product(); p.plans = [p.plans[0]]; p.plans[0].regions = [region("KR", 10)];
  for (const rate of [null, { ...fresh, isExpired: true }, { ...fresh, isFallback: true }, { ...fresh, rate: 0 }]) {
    const { html } = await execute({ product: p, rate });
    assert.match(text(html), /暂无同套餐美国参考价/);
    assert.match(text(html), /当前没有可安全展示的汇率快照/);
    assert.doesNotMatch(text(html), /1 USD =/);
  }
  const stale = await execute({ rate: { ...fresh, isStale: true } });
  assert.match(text(stale.html), /1 USD = 1,234\.5 KRW/);
  assert.match(text(stale.html), /汇率快照已超过 18 小时，等待下一轮同步/);
});

test("nonmonthly and non-iOS rows cannot leak into the table or create extra plan links", async () => {
  const p = product();
  p.plans.push({ ...p.plans[0], slug: "fictional-yearly", billing: "yearly" });
  p.plans.push({ ...p.plans[0], slug: "fictional-web", regions: [{ ...region("KR", 1), billingPlatform: "web" }] });
  const { html } = await execute({ product: p });
  assert.equal((html.match(/data-track-event="click_related_plan"/g) || []).length, 2);
  assert.doesNotMatch(html, /fictional-yearly|fictional-web/);
});

test("metadata keeps approved alternates, noindex boundaries and original titles in both locales", async () => {
  for (const locale of ["zh", "en"] as const) {
    const { html, metadata } = await execute({ locale });
    assert.deepEqual(metadata.robots, { index: true, follow: true });
    assert.deepEqual(metadata.alternates, { canonical: `/${locale}/ai-pricing/claude/regions/south-korea`, languages: { "zh-CN": "/zh/ai-pricing/claude/regions/south-korea", "en-US": "/en/ai-pricing/claude/regions/south-korea", "x-default": "/en/ai-pricing/claude/regions/south-korea" } });
    assert.equal(metadata.title, locale === "zh" ? "Claude 韩国价格与套餐" : "Claude prices and plans in South Korea");
    if (locale === "en") { assert.doesNotMatch(html, /gs-public-unified|data-gs-ui|gs-product-country|gs-pilot-|pilot-page/); assert.match(text(html), /Global price position 2\/2/); }
  }
  const p = product(); p.slug = "gemini"; p.plans.forEach(plan => { plan.regions[0].code = "JP"; });
  const { html, metadata } = await execute({ product: p, slug: "gemini", country: "japan" });
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.deepEqual(metadata.alternates, { canonical: "/zh/ai-pricing/gemini/regions/japan" });
  assert.match(text(html), /当前未发现达到公开门槛的本币调价/);
  assert.equal(links(html).filter(a => a.text === "查看 App Store 证据").length, 0);
});

test("missing product, unregistered pair and empty qualifying table remain 404", async () => {
  await assert.rejects(execute({ product: null }), /NEXT_NOT_FOUND/);
  await assert.rejects(execute({ country: "unregistered-country" }), /NEXT_NOT_FOUND/);
  const p = product(); p.plans = [];
  await assert.rejects(execute({ product: p }), /NEXT_NOT_FOUND/);
});

test("product-country embedded numeral font preserves the approved asset, 700/swap/range and body fallback", () => {
  const css = readFileSync(new URL("../app/public-product-country.css", import.meta.url), "utf8");
  const faces = css.split("\n").filter(line => line.startsWith("@font-face"));
  assert.equal(faces.length, 1);
  const face = faces[0];
  const encoded = face.match(/url\("data:font\/woff2;base64,([A-Za-z0-9+/=]+)"\)/);
  assert.ok(encoded);
  const asset = readFileSync(new URL("../assets/fonts/web/geosub-price-numerals-700.woff2", import.meta.url));
  assert.deepEqual(Buffer.from(encoded[1], "base64"), asset);
  const original = readFileSync(new URL("../app/public-base.css", import.meta.url), "utf8")
    .split("\n").find(line => line.startsWith("@font-face") && line.includes('font-family:"GeoSub Price Numerals";'));
  assert.ok(original);
  assert.match(css, /--gs-font-price:\s*"GeoSub Product Country Price",\s*var\(--gs-font-body\);/);
  assert.equal(face.replace('font-family:"GeoSub Product Country Price";', 'font-family:"GeoSub Price Numerals";')
    .replace(encoded[0], 'url("../assets/fonts/web/geosub-price-numerals-700.woff2")'), original);
  // The shared definition and asset must remain those approved at the baseline.
  const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  assert.equal(sha256(original), "10ee45473621e7f2aad70559e81e2556a39b934ead3dfe7005430272a3a094a7");
  assert.equal(sha256(asset), "c8df7590d26b8bdc66e3f275ab8a52e8343c8e186b9a07095873a47e0c979d0d");
  assert.match(face, /font-weight:700;/); assert.match(face, /font-display:swap;/);
});


test("server flag renders every registered local pilot asset decoratively and rejects malformed paths", () => {
  const sourceText = readFileSync(new URL("./StaticCountryFlag.tsx", import.meta.url), "utf8");
  const loaded = { exports: {} as { default: (props: { code: string }) => ReactNode } };
  const compiled = ts.transpileModule(sourceText, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require, process });
  const renderFlag = (code: string) => renderToStaticMarkup(createElement(loaded.exports.default, { code }));
  for (const code of new Set(countryPagePilots.map(pilot => pilot.countryCode))) {
    const asset = `/flags/${code.toLowerCase()}.svg`;
    assert.ok(existsSync(new URL(`../public${asset}`, import.meta.url)), `Missing registered pilot flag ${code}`);
    const bytes = readFileSync(new URL(`../public${asset}`, import.meta.url));
    const expectedSource = `data:image/svg+xml;base64,${bytes.toString("base64")}`;
    for (const variant of [code.toUpperCase(), code.toLowerCase()]) {
      const html = renderFlag(variant);
      const source = html.match(/\bsrc="([^"]+)"/)?.[1];
      assert.equal(source, expectedSource);
      assert.deepEqual(Buffer.from(source.slice("data:image/svg+xml;base64,".length), "base64"), bytes);
      assert.equal(html, `<span class="gs-home-flag" aria-hidden="true"><img src="${expectedSource}" width="28" height="20" alt="" aria-hidden="true" loading="lazy" decoding="async"/></span>`);
    }
  }
  for (const code of ["ZZ", "zz"]) {
    assert.equal(renderFlag(code), '<span class="gs-home-flag" aria-hidden="true"><img src="/flags/zz.svg" width="28" height="20" alt="" aria-hidden="true" loading="lazy" decoding="async"/></span>');
  }
  for (const code of ["", "KOR", "U", "../kr", "kr/../../x", "kr?foo", "kr#anchor", "<img>", "12", "🇰🇷", "kr.svg", "KR ", " kr", "k\nr", "KR\n", "KR\r\n", "US\u0000"]) {
    assert.equal(renderFlag(code), "", `Malformed country code must not create an asset path: ${JSON.stringify(code)}`);
  }
  // Structural supplements: the executed markup is intentionally server-only,
  // without a client directive, Next Image import, or hydration-only state.
  assert.doesNotMatch(sourceText, /["']use client["']/);
  assert.doesNotMatch(sourceText, /(?:from|import)\s*["']next\/image["']|(?:require|import)\s*\(\s*["']next\/image["']/);
  assert.doesNotMatch(sourceText, /\b(?:useState|useEffect|useLayoutEffect)\s*\(/);
});
