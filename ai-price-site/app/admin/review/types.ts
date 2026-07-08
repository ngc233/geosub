export type PendingRow = {
  id: string;
  product_slug: string;
  product_name: string | null;
  plan_slug: string;
  plan_name: string | null;
  country_code: string;
  country_name_zh: string | null;
  country_name_en: string | null;
  platform: string;
  source_type: string;
  observed_local_price: unknown;
  observed_currency: string | null;
  observed_price_text: string | null;
  observed_price_usd: unknown;
  confidence_score: number | null;
  review_status: string;
  review_note: string | null;
  review_reason_code: string | null;
  source_url: string | null;
  observed_at: Date | string;
  evidence_tier: string | null;
  evidence_status: string | null;
  evidence_score: number | null;
  has_modal_consensus: boolean | null;
  modal_selected_count: number | null;
  modal_runner_up_count: number | null;
  modal_variant_count: number | null;
  fx_rate_date_text: string | null;
  fx_rate_age_days: number | null;
  published_comparison: string | null;
  published_local_price: unknown;
  published_currency: string | null;
  published_price_usd: unknown;
  published_last_checked_at: Date | string | null;
  evidence_note: string | null;
};

export type HistoryRow = PendingRow & {
  region_price_status: string | null;
  promoted_platform: string | null;
  promoted_data_quality: string | null;
  updated_at: Date | string;
};

export type CollectorStatusRow = {
  status: string;
  next_run_at: Date | string | null;
  last_run_at: Date | string | null;
  success_count: number;
  error_count: number;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_output: string | null;
  latest_run_error: string | null;
};

export type CollectorRunHistoryRow = {
  id: string;
  product_slug: string | null;
  product_name: string | null;
  source_type: string | null;
  status: string;
  collector_kind: string | null;
  started_at: Date | string;
  finished_at: Date | string | null;
  duration_ms: number | null;
  error_message: string | null;
  output_excerpt: string | null;
  diagnosis: string | null;
  process_id: string | null;
  runner_state: string | null;
  run_age_seconds: number | null;
};

export type SelectedProductCollectorRow = {
  product_slug: string;
  product_name: string | null;
  app_store_job_count: number;
  latest_run_at: Date | string | null;
  latest_success_at: Date | string | null;
  latest_run_status: string | null;
  pending_observation_count: number;
  published_price_count: number;
};

export type AutoReviewRunRow = {
  id: string;
  status: string;
  dry_run: boolean;
  started_at: Date | string;
  completed_at: Date | string | null;
  checked_groups: number;
  auto_approved_count: number;
  manual_review_count: number;
  error_message: string | null;
};

export type AutoReviewReasonRow = {
  decision: string;
  reason_code: string | null;
  reason: string | null;
  group_count: number;
  observation_count: number;
};

export type HistoryStatsRow = {
  history_count: number;
  approved_count: number;
  ignored_count: number;
  rejected_count: number;
};

export type PendingPlanGroup = {
  planSlug: string;
  planName: string | null;
  rows: PendingRow[];
};

export type PendingProductGroup = {
  productSlug: string;
  productName: string | null;
  rows: PendingRow[];
  plans: PendingPlanGroup[];
  latestSuccessAt?: Date | string | null;
  hasFreshSuccess?: boolean;
  pendingCount?: number;
  planCount?: number;
  countryCount?: number;
  blockedCount?: number;
  waitingCount?: number;
  changedCount?: number;
  lowConfidenceCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  ignoredCount?: number;
};

export type PendingProductSummaryRow = {
  total_product_count: number;
  total_observation_count: number;
  product_slug: string;
  product_name: string | null;
  pending_count: number;
  plan_count: number;
  country_count: number;
  blocked_count: number;
  waiting_count: number;
  changed_count: number;
  low_confidence_count: number;
  latest_observed_at: Date | string | null;
  approved_count: number;
  rejected_count: number;
  ignored_count: number;
};

export type PendingDiagnosisRow = {
  product_slug: string;
  product_name: string | null;
  plan_slug: string;
  plan_name: string | null;
  reason_code: string | null;
  row_count: number;
  country_count: number;
  min_usd: unknown;
  max_usd: unknown;
};

export type EvidenceSummaryRow = {
  evidence_status: string | null;
  evidence_tier: string | null;
  observation_count: number;
  country_count: number;
  average_score: unknown;
  latest_observed_at: Date | string | null;
};

export type EvidenceHealthRow = {
  modal_consensus_count: number;
  blocked_anomaly_count: number;
  old_sample_count: number;
  stale_fx_count: number;
};

export type ProductCollectorFreshnessRow = {
  product_slug: string;
  latest_success_at: Date | string | null;
  has_fresh_success: boolean;
};
