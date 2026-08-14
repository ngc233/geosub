import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const localeKeys = [
  "zh",
  "zh-tw",
  "en",
  "ja",
  "ko",
  "es",
  "tr",
  "ar",
  "fr",
  "it",
  "de",
  "pt",
] as const;

test("privacy disclosure covers every public locale and states the retention period", async () => {
  const source = await readFile(
    new URL("./PrivacyDisclosure.tsx", import.meta.url),
    "utf8",
  );

  for (const locale of localeKeys) {
    const key = locale.includes("-") ? `"${locale}":` : `${locale}:`;
    assert.match(source, new RegExp(key.replace("-", "\\-")));
  }

  assert.match(source, /180 days/);
  assert.match(source, /180 天/);
  assert.match(source, /Google Analytics/);
  assert.match(source, /Google Tag Manager/);
});

test("catch-all legal pages render the full privacy disclosure", async () => {
  const [
    european,
    traditional,
    frenchRoute,
    italianRoute,
    germanRoute,
    portugueseRoute,
    traditionalRoute,
  ] = await Promise.all([
    readFile(new URL("./EuropeanLocalePages.tsx", import.meta.url), "utf8"),
    readFile(new URL("./TraditionalChinesePages.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/fr/[...slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/it/[...slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/de/[...slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/pt/[...slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/zh-tw/[...slug]/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(european, /pageKey === "privacy"/);
  assert.match(european, /<PrivacyDisclosure locale=\{locale\}/);
  assert.match(traditional, /pageKey === "privacy"/);
  assert.match(traditional, /<PrivacyDisclosure locale="zh-tw"/);

  for (const route of [frenchRoute, italianRoute, germanRoute, portugueseRoute]) {
    assert.match(route, /EuropeanLocalePages/);
  }
  assert.match(traditionalRoute, /TraditionalChinesePages/);
});

test("footer publishes a localized independent-comparison disclaimer", async () => {
  const source = await readFile(new URL("./Footer.tsx", import.meta.url), "utf8");

  assert.match(source, /independence: string/);
  assert.match(source, /independent comparison service/);
  assert.match(source, /独立比较服务/);
  assert.match(source, /\{copy\.independence\}/);
});
