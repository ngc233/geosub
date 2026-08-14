import "server-only";

import { getSearchDemandSummary } from "./admin-search-demand.ts";
import { readAdminReadModel } from "./admin-read-model-cache.ts";
import { getCachedProductSeoQualityAudits } from "./product-seo-quality-data.ts";
import { buildAuthorityCoverageQueue } from "./search-authority-coverage.ts";

export type PipelineGrowthSignal = {
  productId: string;
  qualityScore: number;
  qualityStatus: "indexable" | "needs_work" | "hold";
  demandScore: number;
  demandQueries: string[];
  recommendedAction: string;
  actionHref: string;
};

async function loadPipelineGrowthSignals() {
  const [audits, searchDemand] = await Promise.all([
    getCachedProductSeoQualityAudits(),
    getSearchDemandSummary(30),
  ]);

  return buildAuthorityCoverageQueue(audits, searchDemand.conversionTerms).map(
    (item): PipelineGrowthSignal => ({
      productId: item.productId,
      qualityScore: item.qualityScore,
      qualityStatus: item.qualityStatus,
      demandScore: item.demandScore,
      demandQueries: item.demandQueries,
      recommendedAction: item.recommendedAction,
      actionHref: item.actionHref,
    }),
  );
}

export function getPipelineGrowthSignals() {
  return readAdminReadModel(
    "pipeline:growth-signals:30",
    loadPipelineGrowthSignals,
    15_000,
  );
}
