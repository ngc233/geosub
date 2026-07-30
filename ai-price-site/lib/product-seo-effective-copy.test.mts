import assert from "node:assert/strict";
import test from "node:test";
import { getProductSeoEffectiveCopy } from "./product-seo-effective-copy.ts";

test("generated product SEO copy represents the public fallback", () => {
  const copy = getProductSeoEffectiveCopy({
    productName: "ChatGPT",
    countryCount: 39,
    year: 2026,
  });

  assert.equal(copy.title, "ChatGPT价格：全球各地区对比（2026）");
  assert.match(copy.description, /39 个国家和地区/);
  assert.match(copy.description, /税费规则、汇率日期与购买力差异/);
  assert.ok(copy.description.length >= 70);
  assert.equal(copy.h1, "ChatGPT 全球订阅价格对比");
});

test("complete configured copy remains authoritative", () => {
  const copy = getProductSeoEffectiveCopy({
    productName: "ChatGPT",
    countryCount: 39,
    configuredTitle: " ChatGPT 全球订阅价格与地区差异 ",
    configuredDescription:
      " 比较 ChatGPT 在不同国家和地区的 App Store 月度订阅价格、当地货币、美元折算、税费规则、汇率日期与购买力差异，帮助选择适合自己的套餐和订阅地区。 ",
    configuredH1: " ChatGPT 全球订阅价格与套餐对比 ",
  });

  assert.deepEqual(copy, {
    title: "ChatGPT 全球订阅价格与地区差异",
    description:
      "比较 ChatGPT 在不同国家和地区的 App Store 月度订阅价格、当地货币、美元折算、税费规则、汇率日期与购买力差异，帮助选择适合自己的套餐和订阅地区。",
    h1: "ChatGPT 全球订阅价格与套餐对比",
  });
});

test("incomplete legacy copy cannot override the complete public fallback", () => {
  const copy = getProductSeoEffectiveCopy({
    productName: "ChatGPT",
    countryCount: 39,
    year: 2026,
    configuredTitle: "ChatGPT",
    configuredDescription: "Compare ChatGPT Plus prices across countries.",
    configuredH1: "ChatGPT",
  });

  assert.equal(copy.title, "ChatGPT价格：全球各地区对比（2026）");
  assert.match(copy.description, /39 个国家和地区/);
  assert.ok(copy.description.length >= 70);
  assert.equal(copy.h1, "ChatGPT 全球订阅价格对比");
});
