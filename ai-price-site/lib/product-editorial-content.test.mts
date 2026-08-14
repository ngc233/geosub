import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanEditorialIndexingStatus,
  getProductEditorialContent,
  getProductEditorialCoverage,
} from "./product-editorial-content.ts";
import { resolveLegacyPricingPlanSlug } from "./legacy-pricing-plan-routes.ts";

const priorityPlans = {
  chatgpt: ["go", "plus", "pro-5x", "pro"],
  claude: ["pro", "max-5x", "max-20x"],
  netflix: ["basic", "standard", "premium"],
  gemini: ["plus", "pro", "ultra"],
  grok: ["super-lite", "super", "super-heavy"],
  manus: ["basic", "pro", "plus"],
  disney: ["standard-with-ads", "standard", "premium"],
  "hbo-max": ["basic-with-ads", "standard", "premium"],
  perplexity: ["pro", "max"],
  suno: ["basic", "pro", "premier-plan"],
  captions: ["basic", "max"],
  crunchyroll: ["fan", "mega-fan", "ultimate-fan"],
  deezer: ["premium", "family"],
  "kling-ai": ["standard", "pro", "premier"],
  "leonardo-ai": ["essential", "premium", "ultimate"],
  podimo: ["premium", "premium-plus"],
  poe: ["basic", "plus"],
  viki: ["standard", "plus"],
  "youtube-premium": ["lite", "individual", "family"],
};

const officialSourceHosts: Record<string, string[]> = {
  chatgpt: ["openai.com", "help.openai.com"],
  claude: ["support.anthropic.com"],
  netflix: ["help.netflix.com"],
  gemini: ["one.google.com"],
  grok: ["x.ai"],
  manus: ["help.manus.im"],
  perplexity: ["www.perplexity.ai"],
  suno: ["help.suno.com"],
  disney: ["www.disneyplus.com"],
  "hbo-max": ["help.max.com"],
  captions: ["help.captions.ai"],
  crunchyroll: ["help.crunchyroll.com"],
  deezer: ["www.deezer.com"],
  "kling-ai": ["app.klingai.com"],
  "leonardo-ai": ["leonardo.ai"],
  podimo: ["support.podimo.com"],
  poe: ["help.poe.com"],
  viki: ["support.viki.com"],
  "youtube-premium": ["support.google.com"],
};

const legacyRouteProducts = new Set([
  "chatgpt",
  "claude",
  "netflix",
  "gemini",
  "grok",
  "manus",
  "disney",
  "hbo-max",
  "perplexity",
  "suno",
]);

test("priority products have complete Chinese and English plan guidance", () => {
  for (const [productSlug, planSlugs] of Object.entries(priorityPlans)) {
    for (const planSlug of planSlugs) {
      for (const locale of ["zh", "en"] as const) {
        const copy = getProductEditorialContent(
          locale,
          productSlug,
          planSlug,
        );

        assert.ok(copy, `${locale}/${productSlug}/${planSlug}`);
        assert.ok(copy.summary.length >= 80);
        assert.ok(copy.plan.bestFor.length >= 30);
        assert.ok(copy.plan.difference.length >= 30);
        assert.match(copy.plan.sourceUrl, /^https:\/\//);
        assert.ok(
          officialSourceHosts[productSlug].includes(
            new URL(copy.plan.sourceUrl).hostname,
          ),
          `${locale}/${productSlug}/${planSlug} must use an official source`,
        );
      }
    }
  }
});

test("priority product plan routes stay aligned with legacy query redirects", () => {
  for (const [productSlug, planSlugs] of Object.entries(priorityPlans)) {
    if (!legacyRouteProducts.has(productSlug)) continue;
    for (const planSlug of planSlugs) {
      assert.equal(
        resolveLegacyPricingPlanSlug(productSlug, planSlug),
        planSlug,
        `${productSlug}/${planSlug}`,
      );
    }
  }
});

test("ChatGPT Plus links to the current plan comparison instead of the Go announcement", () => {
  for (const locale of ["zh", "en"] as const) {
    const copy = getProductEditorialContent(locale, "chatgpt", "plus");
    assert.equal(copy?.plan.sourceUrl, "https://openai.com/chatgpt/pricing/");
  }
});

test("Netflix Basic explains that renewal evidence is not new-user availability", () => {
  const copy = getProductEditorialContent("zh", "netflix", "basic");

  assert.ok(copy?.plan.availabilityNote);
  assert.match(copy.plan.availabilityNote, /不等于当地新账号一定可以选择/);
});

test("legacy renewal tiers are explicit and current plans remain eligible", () => {
  assert.equal(getPlanEditorialIndexingStatus("netflix", "basic"), "legacy");
  assert.equal(getPlanEditorialIndexingStatus("manus", "basic"), "legacy");
  assert.equal(getPlanEditorialIndexingStatus("manus", "plus"), "legacy");
  assert.equal(getPlanEditorialIndexingStatus("manus", "pro"), "current");
  assert.equal(getPlanEditorialIndexingStatus("gemini", "pro"), "current");
  assert.equal(getPlanEditorialIndexingStatus("suno", "basic"), "legacy");
  assert.equal(getPlanEditorialIndexingStatus("suno", "pro"), "current");
  assert.equal(getPlanEditorialIndexingStatus("perplexity", "max"), "current");
});

test("staged locales do not receive an English editorial fallback", () => {
  assert.equal(
    getProductEditorialContent("ja", "chatgpt", "plus"),
    null,
  );
});

test("SEO coverage counts only content that is actually rendered", () => {
  assert.deepEqual(
    getProductEditorialCoverage("claude", priorityPlans.claude),
    {
      summary:
        "Claude 是 Anthropic 的 AI 助手，常用于写作、分析、研究与编程。个人付费层级主要按可用容量区分：Pro 面向规律使用，Max 5x 和 Max 20x 面向更高频、更长时间的专业工作。",
      describedPlanCount: 3,
    },
  );
  const geminiCoverage = getProductEditorialCoverage(
    "gemini",
    priorityPlans.gemini,
  );
  assert.ok(geminiCoverage.summary);
  assert.equal(geminiCoverage.describedPlanCount, 3);
});
