import assert from "node:assert/strict";
import test from "node:test";
import { evaluateArticleContentQuality } from "./article-content-quality.ts";

function completeArticle() {
  return {
    locale: "ZH" as const,
    status: "PUBLISHED",
    title: "为什么不同国家的订阅价格不一样",
    excerpt: "解释数字订阅地区价格、税费和汇率差异，并说明比较价格时需要注意的数据来源、付款限制与真实结算条件。",
    bodyMarkdown: `## 价格为什么不同

地区价格会受到税费、汇率和平台定价影响。比较时应使用相同套餐、相同周期与相同平台来源，避免把促销或旧套餐混入结论。

同一项订阅在 App Store 的标价还可能包含当地消费税，而美国等地区的结算方式可能不同。因此，只看美元折算数字并不能完整解释最终付款金额。

## 应该怎么比较

先确认本地标价，再查看美元折算与更新时间。价格更低并不代表一定能够跨区购买，付款方式和账号地区也会影响最终结果。

适合长期参考的页面还应该公开数据来源、采集日期、汇率基准和异常处理方式，方便读者判断当前价格是否仍然可靠。

## 下一步

查看 [ChatGPT 地区价格](/zh/ai-pricing/chatgpt) 并结合税务说明作出判断。`,
    seoTitle: "订阅价格为什么因国家而不同 - 地区价格指南",
    seoDescription: "了解数字订阅价格为何因国家、税费、汇率和平台政策而不同，以及比较不同地区价格时应该核对的数据来源、更新时间、付款限制和真实结算条件。",
    seoKeywords: "订阅价格, 地区价格, 汇率, 税费",
    canonicalUrl: "/zh/guides/price-guide",
    noindex: false,
    relatedProductCount: 1,
    relatedArticleCount: 1,
  };
}

test("complete decision content reaches the publishable quality band", () => {
  const result = evaluateArticleContentQuality(completeArticle());

  assert.equal(result.score, 100);
  assert.equal(result.status, "ready");
  assert.equal(result.issues.length, 0);
});

test("thin template content exposes a concrete next action", () => {
  const result = evaluateArticleContentQuality({
    ...completeArticle(),
    bodyMarkdown: "一段很短的介绍。",
    excerpt: "太短",
    seoKeywords: "",
    relatedProductCount: 0,
    relatedArticleCount: 0,
  });

  assert.ok(result.score < 60);
  assert.equal(result.status, "hold");
  assert.match(result.nextAction, /补充结论依据/);
  assert.ok(result.issues.some((issue) => issue.code === "links-product"));
});

test("published noindex content remains readable but is flagged for indexing review", () => {
  const result = evaluateArticleContentQuality({
    ...completeArticle(),
    noindex: true,
  });

  assert.ok(result.issues.some((issue) => issue.code === "technical-noindex"));
  assert.equal(result.dimensions.technical, 14);
});

test("draft noindex content is not treated as an indexing contradiction", () => {
  const result = evaluateArticleContentQuality({
    ...completeArticle(),
    status: "DRAFT",
    noindex: true,
  });

  assert.ok(!result.issues.some((issue) => issue.code === "technical-noindex"));
});

test("purchase and redemption guides count as explicit search intent", () => {
  const result = evaluateArticleContentQuality({
    ...completeArticle(),
    title: "数字礼品卡购买前检查",
    excerpt: "购买数字礼品卡前检查发行地区、账号归属、兑换条件与退款规则。",
    bodyMarkdown: completeArticle().bodyMarkdown.replaceAll("价格", "兑换"),
  });

  assert.ok(!result.issues.some((issue) => issue.code === "search-intent"));
});
