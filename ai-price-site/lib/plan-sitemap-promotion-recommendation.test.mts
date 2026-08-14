import assert from "node:assert/strict";
import test from "node:test";
import type { ProductSeoQualityAudit } from "./product-seo-quality-data.ts";
import { buildPlanSitemapPromotionRecommendations } from "./plan-sitemap-promotion-recommendation.ts";

function audit(
  id: string,
  slug: string,
  status: ProductSeoQualityAudit["status"],
  currentPlanCount = 2,
): ProductSeoQualityAudit {
  return {
    id,
    slug,
    title: slug,
    category: "AI",
    path: `/zh/ai-pricing/${slug}`,
    editPath: `/admin/products/${id}/edit`,
    planCount: currentPlanCount,
    currentPlanCount,
    legacyPlanCount: 0,
    priceCount: 20,
    countryCount: 20,
    stalePriceCount: 0,
    taxGapCount: 0,
    completeSeoLocaleCount: 2,
    requiredSeoLocaleCount: 2,
    score: status === "indexable" ? 100 : 50,
    status,
    statusLabel: status === "indexable" ? "可收录" : "待完善",
    issues: [],
    nextAction: "继续观察",
    sections: { search: 20, data: 45, trust: 20, decision: 15 },
  };
}

const emptyTraffic = {
  windowDays: 30,
  sessionMinutes: 30,
  since: "2026-07-15T00:00:00.000Z",
  total: {
    landingSessions: 0,
    pricingSessions: 0,
    planSessions: 0,
    officialSessions: 0,
    commercialSessions: 0,
    completedSessions: 0,
  },
  engines: [],
  topPages: [],
};

test("promotion recommendations keep the current batch and rank waiting demand", () => {
  const recommendations = buildPlanSitemapPromotionRecommendations({
    audits: [
      audit("chatgpt-id", "chatgpt", "indexable", 4),
      audit("captions-id", "captions", "indexable", 2),
      audit("poe-id", "poe", "indexable", 2),
      audit("weak-id", "weak", "needs_work", 2),
    ],
    demandSignals: [
      {
        productId: "captions-id",
        demandScore: 16,
        demandQueries: ["captions pro"],
      },
    ],
    searchObservations: [
      {
        engine: "bing",
        periodStart: "2026-08-01",
        periodEnd: "2026-08-14",
        path: "/en/ai-pricing/captions/pro",
        clicks: 2,
        impressions: 80,
      },
    ],
    trafficConversion: emptyTraffic,
    gateMode: "enforce",
    availablePageCapacity: 0,
  });

  assert.equal(
    recommendations.find((item) => item.productSlug === "chatgpt")?.state,
    "current",
  );
  const captions = recommendations.find(
    (item) => item.productSlug === "captions",
  );
  assert.equal(captions?.state, "swap");
  assert.equal(captions?.requiredPages, 4);
  assert.match(captions?.reason || "", /80 次展示/);
  assert.match(captions?.reason || "", /预算无空位/);
  assert.equal(
    recommendations.find((item) => item.productSlug === "poe")?.state,
    "observe",
  );
  assert.equal(
    recommendations.find((item) => item.productSlug === "weak")?.state,
    "blocked",
  );
});

test("available budget is allocated to the strongest eligible candidate first", () => {
  const recommendations = buildPlanSitemapPromotionRecommendations({
    audits: [
      audit("captions-id", "captions", "indexable", 2),
      audit("poe-id", "poe", "indexable", 2),
    ],
    demandSignals: [
      { productId: "captions-id", demandScore: 20, demandQueries: [] },
      { productId: "poe-id", demandScore: 12, demandQueries: [] },
    ],
    searchObservations: [],
    trafficConversion: emptyTraffic,
    gateMode: "enforce",
    availablePageCapacity: 4,
  });

  assert.equal(recommendations[0].productSlug, "captions");
  assert.equal(recommendations[0].state, "add");
  assert.equal(recommendations[1].state, "swap");
});
