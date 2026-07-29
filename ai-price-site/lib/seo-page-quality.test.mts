import assert from "node:assert/strict";
import test from "node:test";
import { scoreProductSeoQuality } from "./seo-page-quality.ts";

const healthyInput = {
  title: "ChatGPT Plus 全球价格对比",
  description:
    "比较 ChatGPT Plus 在不同国家和地区的 App Store 订阅价格、当地税务信息、汇率日期和购买力差异。",
  h1: "ChatGPT Plus 全球订阅价格对比",
  officialUrl: "https://chatgpt.com/",
  productDescription:
    "ChatGPT 是 OpenAI 推出的人工智能助手。本页用于比较其公开订阅套餐在不同地区的价格，并说明税务、汇率与账号地区注意事项。",
  publishedPlanCount: 2,
  describedPlanCount: 2,
  publishedPriceCount: 60,
  publishedCountryCount: 30,
  stalePriceCount: 3,
  missingTaxProfileCount: 0,
  duplicatePlanGroupCount: 0,
  publishedOutlierCount: 0,
};

test("complete product pages are indexable", () => {
  const result = scoreProductSeoQuality(healthyInput);

  assert.equal(result.status, "indexable");
  assert.equal(result.statusLabel, "可收录");
  assert.ok(result.score >= 85);
  assert.equal(result.sections.data, 45);
});

test("thin regional coverage stays out of the index recommendation", () => {
  const result = scoreProductSeoQuality({
    ...healthyInput,
    publishedPriceCount: 2,
    publishedCountryCount: 2,
  });

  assert.equal(result.status, "hold");
  assert.match(result.issues.join("、"), /有效地区不足/);
});

test("fully stale data is a blocking issue", () => {
  const result = scoreProductSeoQuality({
    ...healthyInput,
    stalePriceCount: healthyInput.publishedPriceCount,
  });

  assert.equal(result.status, "hold");
  assert.match(result.issues.join("、"), /全部公开价格均已过期/);
});

test("published anomalies and duplicate plans block authority claims", () => {
  const result = scoreProductSeoQuality({
    ...healthyInput,
    publishedOutlierCount: 1,
    duplicatePlanGroupCount: 2,
  });

  assert.equal(result.status, "hold");
  assert.match(result.issues.join("、"), /公开极端价格/);
  assert.match(result.issues.join("、"), /重复套餐/);
});

test("content gaps remain visible even when price coverage is healthy", () => {
  const result = scoreProductSeoQuality({
    ...healthyInput,
    officialUrl: null,
    productDescription: "AI 产品",
    describedPlanCount: 0,
  });

  assert.equal(result.status, "needs_work");
  assert.match(result.issues.join("、"), /缺少官方入口/);
  assert.match(result.issues.join("、"), /独特页面价值/);
  assert.match(result.issues.join("、"), /套餐缺少适用人群/);
});

test("technical completeness cannot replace unique editorial value", () => {
  const result = scoreProductSeoQuality({
    ...healthyInput,
    productDescription: "AI 产品",
    describedPlanCount: 0,
  });

  assert.ok(result.score >= 85);
  assert.equal(result.status, "needs_work");
  assert.equal(
    result.nextAction,
    "补充产品介绍或至少一半套餐的适用人群与功能说明",
  );
  assert.match(result.issues.join("、"), /独特页面价值/);
  assert.match(result.issues.join("、"), /套餐缺少适用人群/);
});
