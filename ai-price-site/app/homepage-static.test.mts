import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(...segments: string[]) {
  return readFileSync(resolve(appDir, ...segments), "utf8");
}

test("home pages only link to currently available public sections", () => {
  const zhHome = readAppFile("zh", "page.tsx");
  const enHome = readAppFile("en", "page.tsx");
  const jaHome = readAppFile("ja", "page.tsx");
  const koHome = readAppFile("ko", "page.tsx");
  const esHome = readAppFile("es", "page.tsx");
  const trHome = readAppFile("tr", "page.tsx");
  const arHome = readAppFile("ar", "page.tsx");
  const frHome = readAppFile("fr", "page.tsx");
  const itHome = readAppFile("it", "page.tsx");
  const deHome = readAppFile("de", "page.tsx");
  const ptHome = readAppFile("pt", "page.tsx");

  for (const source of [zhHome, enHome, jaHome, koHome, esHome, trHome, arHome]) {
    assert.doesNotMatch(source, /software-subscriptions/);
    assert.doesNotMatch(source, /gaming-steam/);
    assert.doesNotMatch(source, /gift-cards/);
    assert.doesNotMatch(source, /ai-rankings/);
    assert.match(source, /ai-pricing/);
    assert.match(source, /streaming-pricing/);
    assert.match(source, /data-sources/);
    assert.match(source, /guides/);
  }

  for (const source of [frHome, itHome, deHome, ptHome]) {
    assert.doesNotMatch(source, /software-subscriptions/);
    assert.doesNotMatch(source, /gaming-steam/);
    assert.doesNotMatch(source, /gift-cards/);
    assert.doesNotMatch(source, /ai-rankings/);
    assert.match(source, /EuropeanHomePage/);
  }
});

test("European home routes delegate to complete localized content", () => {
  const shared = readFileSync(
    resolve(appDir, "..", "components", "EuropeanLocalePages.tsx"),
    "utf8",
  );

  for (const locale of ["fr", "it", "de", "pt"]) {
    const source = readAppFile(locale, "page.tsx");
    assert.match(source, /EuropeanHomePage/);
    assert.match(source, new RegExp(`locale="${locale}"`));
    assert.match(shared, new RegExp(`\\n  ${locale}:`));
  }

  assert.match(shared, /ai-pricing/);
  assert.match(shared, /streaming-pricing/);
  assert.match(shared, /data-sources/);
  assert.match(shared, /guides/);
});

test("Arabic home page is complete and links only to localized routes", () => {
  const arHome = readAppFile("ar", "page.tsx");

  assert.match(arHome, /أسعار الاشتراكات العالمية في مكان واحد/);
  assert.match(arHome, /\/ar\/ai-pricing\//);
  assert.match(arHome, /\/ar\/streaming-pricing\//);
  assert.match(arHome, /\/ar\/data-sources\//);
  assert.match(arHome, /\/ar\/guides\//);
});

test("Turkish home page is complete and links only to localized routes", () => {
  const trHome = readAppFile("tr", "page.tsx");

  assert.match(trHome, /Dünya genelindeki abonelik fiyatları tek yerde/);
  assert.match(trHome, /\/tr\/ai-pricing\//);
  assert.match(trHome, /\/tr\/streaming-pricing\//);
  assert.match(trHome, /\/tr\/data-sources\//);
  assert.match(trHome, /\/tr\/guides\//);
});

test("Spanish home page is complete and links only to localized routes", () => {
  const esHome = readAppFile("es", "page.tsx");

  assert.match(esHome, /Precios de suscripción de todo el mundo/);
  assert.match(esHome, /\/es\/ai-pricing\//);
  assert.match(esHome, /\/es\/streaming-pricing\//);
  assert.match(esHome, /\/es\/data-sources\//);
  assert.match(esHome, /\/es\/guides\//);
});

test("Korean home page is complete and links only to localized routes", () => {
  const koHome = readAppFile("ko", "page.tsx");

  assert.match(koHome, /전 세계 구독 가격을 한눈에/);
  assert.match(koHome, /\/ko\/ai-pricing\//);
  assert.match(koHome, /\/ko\/streaming-pricing\//);
  assert.match(koHome, /\/ko\/data-sources\//);
  assert.match(koHome, /\/ko\/guides\//);
});

test("Japanese home page is complete and links only to localized routes", () => {
  const jaHome = readAppFile("ja", "page.tsx");

  assert.match(jaHome, /世界のサブスクリプション料金を、わかりやすく/);
  assert.match(jaHome, /\/ja\/ai-pricing\//);
  assert.match(jaHome, /\/ja\/streaming-pricing\//);
  assert.match(jaHome, /\/ja\/data-sources\//);
  assert.match(jaHome, /\/ja\/guides\//);
});

test("English home page is not the launch placeholder", () => {
  const enHome = readAppFile("en", "page.tsx");

  assert.doesNotMatch(enHome, /Page framework ready/);
  assert.doesNotMatch(enHome, /basic English page framework/i);
  assert.match(enHome, /Compare AI and streaming App Store prices by region/);
  assert.match(enHome, /common display currencies/);
  assert.match(enHome, /Data Sources/);
});

test("Chinese home page describes the current official scope", () => {
  const zhHome = readAppFile("zh", "page.tsx");

  assert.match(zhHome, /比较 AI 与流媒体订阅的 App Store 地区价格/);
  assert.match(zhHome, /切换常用显示币种/);
  assert.match(zhHome, /数据来源/);
  assert.match(zhHome, /订阅指南/);
});
