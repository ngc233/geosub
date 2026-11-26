import type {
  AdminOperationalCounts,
  AdminOperationalStatus,
} from "./admin-operational-status";

export type PipelineProductRow = {
  product_id: string;
  product_slug: string;
  product_name: string;
  product_category: string;
  product_status: string;
  provider: string | null;
  plan_count: unknown;
  total_job_count: unknown;
  app_store_job_count: unknown;
  official_web_job_count?: unknown;
  active_job_count: unknown;
  due_job_count: unknown;
  source_count: unknown;
  next_run_at: Date | string | null;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_error: string | null;
  failure_phase?: string | null;
  failure_stage?: string | null;
  collector_status?: string | null;
  auto_review_status?: string | null;
  latest_success_at: Date | string | null;
  has_fresh_success: boolean | null;
  pending_observation_count: unknown;
  blocked_observation_count: unknown;
  waiting_observation_count: unknown;
  changed_observation_count: unknown;
  low_confidence_observation_count: unknown;
  published_price_count: unknown;
  published_region_count: unknown;
  published_stale_price_count: unknown;
  latest_price_checked_at: Date | string | null;
  discovery_candidate_count: unknown;
};

export type PipelineStats = {
  productCount: number;
  readyCount: number;
  setupCount: number;
  pendingCount: number;
  failedCount: number;
  dueCount: number;
  staleCount: number;
  runningCount: number;
  publishedPriceCount: number;
};

export type SqlPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  offset: number;
};

export type PipelineProductsPageResult = {
  items: PipelineProductRow[];
  totalAll: number;
  stageCounts: AdminOperationalCounts;
  closestToPublish: PipelineProductRow | null;
  pagination: SqlPaginationMeta;
};

export type PipelineStageFilter = "all" | AdminOperationalStatus;

export function parseRequestedSqlPage(
  rawPage: string | string[] | number | undefined,
): number {
  const candidate = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const parsed =
    typeof candidate === "number"
      ? Math.trunc(candidate)
      : Number.parseInt(String(candidate ?? "").trim(), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function resolveSqlPagination({
  rawPage,
  total,
  pageSize,
}: {
  rawPage: string | string[] | number | undefined;
  total: number;
  pageSize: number;
}): SqlPaginationMeta {
  const safePageSize = Math.max(1, Math.trunc(pageSize));
  const safeTotal = Math.max(0, Math.trunc(total));
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const requestedPage = parseRequestedSqlPage(rawPage);
  const page = Math.min(requestedPage, totalPages);

  return {
    page,
    pageSize: safePageSize,
    total: safeTotal,
    totalPages,
    offset: (page - 1) * safePageSize,
  };
}
