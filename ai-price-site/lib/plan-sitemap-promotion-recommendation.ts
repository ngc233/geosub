import type { ProductSeoQualityAudit } from "./product-seo-quality-data.ts";
import {
  getProductPlanSitemapPromotion,
  type ProductSeoGateMode,
} from "./product-seo-indexing-policy.ts";
import type { SeoSearchPageObservation } from "./seo-search-performance-baseline.ts";
import type {
  SeoLandingPageConversion,
  SeoTrafficConversionOverview,
} from "./seo-traffic-conversion.ts";

export type ProductPromotionDemandSignal = {
  productId: string;
  demandScore: number;
  demandQueries: string[];
};

export type PlanPromotionRecommendationState =
  | "current"
  | "add"
  | "swap"
  | "observe"
  | "blocked";

export type PlanPromotionRecommendation = {
  productId: string;
  productSlug: string;
  productName: string;
  publicPath: string;
  state: PlanPromotionRecommendationState;
  label: string;
  signalScore: number;
  requiredPages: number;
  externalImpressions: number;
  externalClicks: number;
  engines: string[];
  demandScore: number;
  demandQueries: string[];
  landingSessions: number;
  planSessions: number;
  commercialSessions: number;
  reason: string;
};

function extractPricingProductSlug(path: string) {
  const pathname = path.split("?", 1)[0].replace(/\/$/, "");
  const match = pathname.match(
    /^\/[^/]+\/(?:ai-pricing|streaming-pricing)\/([^/]+)/,
  );
  return match?.[1]?.toLowerCase() || null;
}

function addLandingMetrics(
  total: Pick<
    SeoLandingPageConversion,
    "landingSessions" | "planSessions" | "commercialSessions"
  >,
  next: SeoLandingPageConversion,
) {
  return {
    landingSessions: total.landingSessions + next.landingSessions,
    planSessions: total.planSessions + next.planSessions,
    commercialSessions: total.commercialSessions + next.commercialSessions,
  };
}

function scoreExternalDemand(impressions: number, clicks: number, engines: number) {
  if (impressions <= 0 && clicks <= 0) return 0;
  return Math.min(
    45,
    Math.round(Math.log10(impressions + 1) * 14)
      + Math.min(10, clicks * 2)
      + (engines > 1 ? 8 : 0),
  );
}

function scoreConversionDemand(
  landingSessions: number,
  planSessions: number,
  commercialSessions: number,
) {
  return Math.min(
    20,
    landingSessions * 2 + planSessions * 5 + commercialSessions * 10,
  );
}

function recommendationLabel(state: PlanPromotionRecommendationState) {
  if (state === "current") return "当前已推广";
  if (state === "add") return "建议加入下一批";
  if (state === "swap") return "符合信号，待置换";
  if (state === "blocked") return "质量暂缓";
  return "继续观察";
}

export function buildPlanSitemapPromotionRecommendations({
  audits,
  demandSignals,
  searchObservations,
  trafficConversion,
  gateMode,
  availablePageCapacity,
  promotedProductSlugs,
}: {
  audits: ProductSeoQualityAudit[];
  demandSignals: ProductPromotionDemandSignal[];
  searchObservations: SeoSearchPageObservation[];
  trafficConversion: SeoTrafficConversionOverview;
  gateMode: ProductSeoGateMode;
  availablePageCapacity: number;
  promotedProductSlugs?: readonly string[];
}) {
  const demandByProduct = new Map(
    demandSignals.map((signal) => [signal.productId, signal]),
  );
  const externalBySlug = new Map<
    string,
    { impressions: number; clicks: number; engines: Set<string> }
  >();
  for (const observation of searchObservations) {
    const slug = extractPricingProductSlug(observation.path);
    if (!slug) continue;
    const current = externalBySlug.get(slug) || {
      impressions: 0,
      clicks: 0,
      engines: new Set<string>(),
    };
    current.impressions += observation.impressions;
    current.clicks += observation.clicks;
    current.engines.add(observation.engine);
    externalBySlug.set(slug, current);
  }

  const landingBySlug = new Map<
    string,
    Pick<
      SeoLandingPageConversion,
      "landingSessions" | "planSessions" | "commercialSessions"
    >
  >();
  for (const page of trafficConversion.topPages) {
    const slug = extractPricingProductSlug(page.path);
    if (!slug) continue;
    landingBySlug.set(
      slug,
      addLandingMetrics(
        landingBySlug.get(slug) || {
          landingSessions: 0,
          planSessions: 0,
          commercialSessions: 0,
        },
        page,
      ),
    );
  }

  const preliminary = audits.map((audit) => {
    const promotion = getProductPlanSitemapPromotion({
      productSlug: audit.slug,
      qualityStatus: audit.status,
      gateMode,
      currentPlanCount: audit.currentPlanCount,
      promotedProductSlugs,
    });
    const external = externalBySlug.get(audit.slug) || {
      impressions: 0,
      clicks: 0,
      engines: new Set<string>(),
    };
    const demand = demandByProduct.get(audit.id) || {
      demandScore: 0,
      demandQueries: [],
    };
    const landing = landingBySlug.get(audit.slug) || {
      landingSessions: 0,
      planSessions: 0,
      commercialSessions: 0,
    };
    const signalScore = Math.min(
      100,
      scoreExternalDemand(
        external.impressions,
        external.clicks,
        external.engines.size,
      )
        + Math.min(35, demand.demandScore)
        + scoreConversionDemand(
          landing.landingSessions,
          landing.planSessions,
          landing.commercialSessions,
        ),
    );
    const hasPromotionSignal =
      external.impressions >= 30
      || external.clicks >= 2
      || demand.demandScore >= 12
      || landing.planSessions > 0
      || landing.commercialSessions > 0;

    return {
      audit,
      promotion,
      external,
      demand,
      landing,
      signalScore,
      hasPromotionSignal,
    };
  });

  let remainingCapacity = Math.max(0, availablePageCapacity);
  return preliminary
    .sort((left, right) =>
      Number(right.hasPromotionSignal) - Number(left.hasPromotionSignal)
      || right.signalScore - left.signalScore
      || left.audit.title.localeCompare(right.audit.title)
    )
    .map((item): PlanPromotionRecommendation => {
      const requiredPages = item.promotion.potentialPlanPages;
      let state: PlanPromotionRecommendationState = "observe";

      if (item.promotion.state === "promoted") {
        state = "current";
      } else if (
        item.promotion.state === "blocked"
        || item.audit.status !== "indexable"
      ) {
        state = "blocked";
      } else if (item.hasPromotionSignal) {
        if (requiredPages <= remainingCapacity) {
          state = "add";
          remainingCapacity -= requiredPages;
        } else {
          state = "swap";
        }
      }

      const evidence: string[] = [];
      if (item.external.impressions > 0) {
        evidence.push(
          `Google/Bing ${item.external.impressions} 次展示、${item.external.clicks} 次点击`,
        );
      }
      if (item.demand.demandScore > 0) {
        evidence.push(
          `站内搜索需求 ${item.demand.demandScore} 分${item.demand.demandQueries.length > 0 ? `（${item.demand.demandQueries.slice(0, 2).join("、")}）` : ""}`,
        );
      }
      if (item.landing.landingSessions > 0) {
        evidence.push(
          `搜索落地 ${item.landing.landingSessions} 次，其中 ${item.landing.planSessions} 次进入套餐`,
        );
      }

      let reason = evidence.length > 0
        ? evidence.join("；")
        : "暂未发现足够的外部曝光或站内套餐意向。";
      if (state === "swap") {
        reason += ` 当前套餐页预算无空位，需要先置换至少 ${requiredPages} 页。`;
      } else if (state === "observe") {
        reason += " 保留产品概览，套餐页继续观察。";
      } else if (state === "blocked") {
        reason = item.promotion.reason;
      }

      return {
        productId: item.audit.id,
        productSlug: item.audit.slug,
        productName: item.audit.title,
        publicPath: item.audit.path,
        state,
        label: recommendationLabel(state),
        signalScore: item.signalScore,
        requiredPages,
        externalImpressions: item.external.impressions,
        externalClicks: item.external.clicks,
        engines: [...item.external.engines].sort(),
        demandScore: item.demand.demandScore,
        demandQueries: item.demand.demandQueries,
        landingSessions: item.landing.landingSessions,
        planSessions: item.landing.planSessions,
        commercialSessions: item.landing.commercialSessions,
        reason,
      };
    });
}
