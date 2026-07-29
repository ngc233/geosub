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

test("configured copy remains authoritative when present", () => {
  const copy = getProductSeoEffectiveCopy({
    productName: "ChatGPT",
    countryCount: 39,
    configuredTitle: " 自定义标题 ",
    configuredDescription: " 自定义描述 ",
    configuredH1: " 自定义主标题 ",
  });

  assert.deepEqual(copy, {
    title: "自定义标题",
    description: "自定义描述",
    h1: "自定义主标题",
  });
});
