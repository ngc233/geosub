import "server-only";

import {
  queryPipelineProductsPage,
  queryPipelineStats,
  type PipelineProductsPageResult,
  type PipelineStageFilter,
  type PipelineStats,
} from "../../../lib/admin-product-summary-read-model";

export async function getPipelinePageProducts(params: {
  q: string;
  category: string;
  product: string;
  stage: PipelineStageFilter;
  rawPage?: string | string[] | number;
  pageSize?: number;
}): Promise<PipelineProductsPageResult> {
  return queryPipelineProductsPage(params);
}

export async function getPipelineStats(): Promise<PipelineStats> {
  return queryPipelineStats();
}
