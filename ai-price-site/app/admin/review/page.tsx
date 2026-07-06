import { prisma } from "../../../lib/prisma";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import ManualCollectionProgressForm from "./ManualCollectionProgressForm";
import ObservationReviewActions from "./ObservationReviewActions";
import Link from "next/link";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type PendingRow = {
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

type HistoryRow = PendingRow & {
  region_price_status: string | null;
  promoted_platform: string | null;
  promoted_data_quality: string | null;
  updated_at: Date | string;
};

type CollectorStatusRow = {
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

type SelectedProductCollectorRow = {
  product_slug: string;
  product_name: string | null;
  app_store_job_count: number;
  latest_run_at: Date | string | null;
  latest_success_at: Date | string | null;
  latest_run_status: string | null;
  pending_observation_count: number;
  published_price_count: number;
};

type AutoReviewRunRow = {
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

type AutoReviewReasonRow = {
  decision: string;
  reason_code: string | null;
  reason: string | null;
  group_count: number;
  observation_count: number;
};

type ReviewStatusCountRow = {
  approved_count: number;
  ignored_count: number;
  rejected_count: number;
};

type PendingPlanGroup = {
  planSlug: string;
  planName: string | null;
  rows: PendingRow[];
};

type PendingProductGroup = {
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

type PendingProductSummaryRow = {
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

type PendingDiagnosisRow = {
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

type EvidenceSummaryRow = {
  evidence_status: string | null;
  evidence_tier: string | null;
  observation_count: number;
  country_count: number;
  average_score: unknown;
  latest_observed_at: Date | string | null;
};

type EvidenceHealthRow = {
  modal_consensus_count: number;
  blocked_anomaly_count: number;
  old_sample_count: number;
  stale_fx_count: number;
};

type ProductCollectorFreshnessRow = {
  product_slug: string;
  latest_success_at: Date | string | null;
  has_fresh_success: boolean;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatUsd(value: unknown) {
  const number = toNumber(value);
  return number === null ? "—" : `$${number.toFixed(2)}`;
}

function formatLocal(value: unknown, currency: string | null) {
  const number = toNumber(value);

  if (number === null) return "—";

  return `${number.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency ?? ""}`.trim();
}

function formatDate(value: Date | string | null) {
  if (!value) return "未安排";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function platformLabel(platform: string) {
  const labels: Record<string, string> = {
    ios: "App Store",
    android: "Android",
    web: "Web",
    steam: "Steam",
    gift_card: "Gift Card",
    unknown: "Unknown",
  };

  return labels[platform] ?? platform;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    ignored: "bg-slate-50 text-slate-600 ring-slate-200",
    rejected: "bg-red-50 text-red-700 ring-red-200",
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
  };

  return map[status] ?? "bg-slate-50 text-slate-600 ring-slate-200";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    approved: "已通过",
    ignored: "已忽略",
    rejected: "已拒绝",
    pending: "待审核",
  };

  return map[status] ?? status;
}

function reviewReasonLabel(reasonCode: string | null) {
  const map: Record<string, string> = {
    app_store_three_sample_consensus: "三次稳定样本一致",
    app_store_clean_pair_after_rule_fix: "规则修正后稳定",
    waiting_for_more_app_store_samples: "等待自动补采",
    app_store_observation_anomaly: "系统隔离异常",
    app_store_price_changed: "等待价格稳定",
    low_confidence: "可信度不足",
    suspicious_low_converted_usd: "折算价格异常偏低",
    suspicious_plan_order: "套餐价格顺序异常",
    superseded_by_published_price: "已被正式价格覆盖",
  };

  return reasonCode ? map[reasonCode] ?? reasonCode : "未记录原因";
}

function reviewReasonAction(reasonCode: string | null) {
  const map: Record<string, string> = {
    app_store_three_sample_consensus: "已满足自动入库条件。",
    app_store_clean_pair_after_rule_fix: "最新 2 次干净 App Store 样本一致，系统会自动采用新样本并忽略旧的冲突样本。",
    waiting_for_more_app_store_samples: "系统会继续补采；最近 3 次 App Store 样本一致后自动发布。",
    app_store_observation_anomaly: "系统已自动隔离这类价格，不进入正式库；等待下一轮采集或解析规则修正，不要求人工逐国打开 App Store。",
    app_store_price_changed: "系统会等待连续样本稳定；稳定后自动发布，未稳定前不进入正式榜单。",
    low_confidence: "系统会继续补采提高可信度；达到阈值后自动进入稳定性审核。",
    suspicious_low_converted_usd: "系统会自动隔离，优先防止币种、小数点或价格文本解析错误进入正式榜单。",
    suspicious_plan_order: "系统会用同地区套餐阶梯继续校验；阶梯恢复合理后自动发布。",
    superseded_by_published_price: "无需处理，系统会隐藏或忽略旧样本。",
  };

  return reasonCode ? map[reasonCode] ?? "查看具体记录的审核说明。" : "查看具体记录的审核说明。";
}

function evidenceTierLabel(tier: string | null) {
  const map: Record<string, string> = {
    official_app_store_rendered: "官方 App Store 渲染页",
    official_app_store_static: "官方 App Store 静态页",
    official_site: "官方网页",
    official_page: "官方网页",
    google_play_evidence: "Google Play 旁证",
    manual: "人工录入",
    unknown: "未知来源",
  };

  return tier ? map[tier] ?? tier : "未记录";
}

function evidenceStatusLabel(status: string | null) {
  const map: Record<string, string> = {
    blocked_anomaly: "系统隔离，不能自动上线",
    modal_price_consensus: "页面多数票",
    old_sample: "旧样本，已被更新价格覆盖",
    strong_official_sample: "强官方样本",
    usable_context: "可作参考",
    weak_evidence: "证据较弱",
  };

  return status ? map[status] ?? status : "未评估";
}

function publishedComparisonLabel(value: string | null) {
  const map: Record<string, string> = {
    no_published_price: "暂无正式价",
    superseded_by_newer_published_price: "已被更新正式价覆盖",
    matches_published_price: "与正式价一致",
    conflicts_with_published_price: "与正式价冲突",
  };

  return value ? map[value] ?? value : "未对比";
}

function evidenceBadgeClass(status: string | null) {
  if (status === "modal_price_consensus" || status === "strong_official_sample") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "blocked_anomaly") {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (status === "old_sample") {
    return "bg-slate-50 text-slate-600 ring-slate-200";
  }
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function PriceEvidencePanel({ row }: { row: PendingRow }) {
  const publishedLocal =
    row.published_local_price === null || row.published_local_price === undefined
      ? null
      : formatLocal(row.published_local_price, row.published_currency);

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] leading-4 text-slate-600">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={[
            "inline-flex rounded-full px-2 py-0.5 font-semibold ring-1",
            evidenceBadgeClass(row.evidence_status),
          ].join(" ")}
        >
          {evidenceStatusLabel(row.evidence_status)}
        </span>
        <span>证据分 {row.evidence_score ?? "—"}</span>
        <span>{evidenceTierLabel(row.evidence_tier)}</span>
      </div>

      <div className="mt-1 grid gap-1 text-slate-500">
        {row.has_modal_consensus ? (
          <div>
            页面多数票：{row.modal_selected_count ?? "—"} : {row.modal_runner_up_count ?? 0}
            {row.modal_variant_count ? `，共 ${row.modal_variant_count} 组价格` : ""}
          </div>
        ) : null}
        <div>
          汇率日期：{row.fx_rate_date_text || "未记录"}
          {row.fx_rate_age_days !== null && row.fx_rate_age_days !== undefined
            ? `，${row.fx_rate_age_days} 天前`
            : ""}
        </div>
        <div>
          正式价对比：{publishedComparisonLabel(row.published_comparison)}
          {publishedLocal ? `，当前正式价 ${publishedLocal} / ${formatUsd(row.published_price_usd)}` : ""}
        </div>
      </div>

      {row.evidence_note ? (
        <div className="mt-1 line-clamp-2 text-slate-400">证据说明：{row.evidence_note}</div>
      ) : null}
    </div>
  );
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    collectionQueued?: string;
    collectionRun?: string;
    collectionScope?: string;
    discoveryPromoted?: string;
    discoveryProduct?: string;
    discoveryJobs?: string;
    page?: string;
    historyPage?: string;
    q?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const queuedCount =
    params.collectionQueued === undefined ? null : Number(params.collectionQueued);
  const collectionRun = params.collectionRun ?? null;
  const collectionScope = params.collectionScope ?? null;
  const productQuery = String(params.q ?? "").trim();
  const discoveryPromoted = params.discoveryPromoted === "1";
  const discoveryProduct = String(params.discoveryProduct ?? productQuery).trim();
  const discoveryJobs = Math.max(0, Number(params.discoveryJobs ?? 0) || 0);
  const productQueryLike = `%${productQuery}%`;
  const pendingPage = Math.max(1, Number(params.page ?? 1) || 1);
  const pendingPageSize = 25;
  const pendingOffset = (pendingPage - 1) * pendingPageSize;
  const historyPage = Math.max(1, Number(params.historyPage ?? 1) || 1);
  const historyPageSize = 25;
  const historyOffset = (historyPage - 1) * historyPageSize;

  const pendingCountRows = await prisma.$queryRaw<Array<{ product_count: number; observation_count: number }>>`
    SELECT
      COUNT(DISTINCT pending.product_slug)::int AS product_count,
      COUNT(*)::int AS observation_count
    FROM pending_price_observations_view pending
    JOIN price_observations observation ON observation.id = pending.id
    LEFT JOIN region_prices published
      ON published.product_id = observation.product_id
      AND published.plan_id = observation.plan_id
      AND published.country_id = observation.country_id
      AND published.billing_platform = observation.billing_platform
      AND published.price_type = observation.price_type
      AND published.status = 'published'::publish_status
    WHERE pending.platform = 'ios'
      AND (
        ${productQuery} = ''
        OR pending.product_slug ILIKE ${productQueryLike}
        OR pending.product_name ILIKE ${productQueryLike}
      )
      AND NOT (
        published.id IS NOT NULL
        AND (
          published.last_checked_at >= observation.observed_at
          OR (
            published.currency IS NOT DISTINCT FROM observation.currency
            AND published.local_price IS NOT DISTINCT FROM observation.raw_price
            AND (
              published.price_usd IS NULL
              OR observation.converted_usd IS NULL
              OR published.price_usd = 0
              OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
            )
          )
        )
      )
      AND (
        COALESCE(observation.anomaly_flag, FALSE)
        OR published.id IS NULL
        OR pending.review_note IS NOT NULL
          AND pending.review_note NOT ILIKE 'Only % App Store observations are available%'
        OR published.currency IS DISTINCT FROM observation.currency
        OR published.local_price IS DISTINCT FROM observation.raw_price
        OR (
          published.price_usd IS NOT NULL
          AND observation.converted_usd IS NOT NULL
          AND published.price_usd > 0
          AND ABS((observation.converted_usd - published.price_usd) / published.price_usd) > 0.02
        )
      )
  `;
  const pendingProductTotal = Number(pendingCountRows[0]?.product_count ?? 0);
  const pendingTotal = Number(pendingCountRows[0]?.observation_count ?? 0);
  const pendingTotalPages = Math.max(1, Math.ceil(pendingProductTotal / pendingPageSize));

  const pendingProductSummaryRows = await prisma.$queryRaw<PendingProductSummaryRow[]>`
    WITH scoped_pending AS (
      SELECT
        pending.*,
        COALESCE(
          observation.raw_payload ->> 'auto_review_reason_code',
          CASE
            WHEN pending.review_note ILIKE 'Converted App Store price is above%' THEN 'app_store_observation_anomaly'
            WHEN pending.review_note ILIKE 'Only % App Store observations are available%' THEN 'waiting_for_more_app_store_samples'
            WHEN pending.review_note IS NULL THEN 'not_reviewed_yet'
            ELSE 'other'
          END
        ) AS review_reason_code
      FROM pending_price_observations_view pending
      JOIN price_observations observation ON observation.id = pending.id
      LEFT JOIN region_prices published
        ON published.product_id = observation.product_id
        AND published.plan_id = observation.plan_id
        AND published.country_id = observation.country_id
        AND published.billing_platform = observation.billing_platform
        AND published.price_type = observation.price_type
        AND published.status = 'published'::publish_status
      WHERE pending.platform = 'ios'
        AND (
          ${productQuery} = ''
          OR pending.product_slug ILIKE ${productQueryLike}
          OR pending.product_name ILIKE ${productQueryLike}
        )
        AND NOT (
          published.id IS NOT NULL
          AND (
            published.last_checked_at >= observation.observed_at
            OR (
              published.currency IS NOT DISTINCT FROM observation.currency
              AND published.local_price IS NOT DISTINCT FROM observation.raw_price
              AND (
                published.price_usd IS NULL
                OR observation.converted_usd IS NULL
                OR published.price_usd = 0
                OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
              )
            )
          )
        )
        AND (
          COALESCE(observation.anomaly_flag, FALSE)
          OR published.id IS NULL
          OR pending.review_note IS NOT NULL
            AND pending.review_note NOT ILIKE 'Only % App Store observations are available%'
          OR published.currency IS DISTINCT FROM observation.currency
          OR published.local_price IS DISTINCT FROM observation.raw_price
          OR (
            published.price_usd IS NOT NULL
            AND observation.converted_usd IS NOT NULL
            AND published.price_usd > 0
            AND ABS((observation.converted_usd - published.price_usd) / published.price_usd) > 0.02
          )
        )
    ),
    product_page AS (
      SELECT
        product_slug,
        MAX(product_name) AS product_name,
        COUNT(*)::int AS pending_count,
        COUNT(DISTINCT plan_slug)::int AS plan_count,
        COUNT(DISTINCT country_code)::int AS country_count,
        COUNT(*) FILTER (WHERE review_reason_code = 'app_store_observation_anomaly')::int AS blocked_count,
        COUNT(*) FILTER (WHERE review_reason_code = 'waiting_for_more_app_store_samples')::int AS waiting_count,
        COUNT(*) FILTER (WHERE review_reason_code = 'app_store_price_changed')::int AS changed_count,
        COUNT(*) FILTER (WHERE review_reason_code = 'low_confidence')::int AS low_confidence_count,
        MAX(observed_at) AS latest_observed_at
      FROM scoped_pending
      GROUP BY product_slug
      ORDER BY latest_observed_at DESC, pending_count DESC, product_slug
      LIMIT ${pendingPageSize}
      OFFSET ${pendingOffset}
    )
    SELECT
      page.product_slug,
      page.product_name,
      page.pending_count,
      page.plan_count,
      page.country_count,
      page.blocked_count,
      page.waiting_count,
      page.changed_count,
      page.low_confidence_count,
      page.latest_observed_at,
      COUNT(history.id) FILTER (WHERE history.review_status = 'approved')::int AS approved_count,
      COUNT(history.id) FILTER (WHERE history.review_status = 'rejected')::int AS rejected_count,
      COUNT(history.id) FILTER (WHERE history.review_status = 'ignored')::int AS ignored_count
    FROM product_page page
    LEFT JOIN price_observations_review_history_view history
      ON history.product_slug = page.product_slug
    GROUP BY
      page.product_slug,
      page.product_name,
      page.pending_count,
      page.plan_count,
      page.country_count,
      page.blocked_count,
      page.waiting_count,
      page.changed_count,
      page.low_confidence_count,
      page.latest_observed_at
    ORDER BY page.latest_observed_at DESC, page.pending_count DESC, page.product_slug
  `;
  const pendingProductSlugs = pendingProductSummaryRows.map((row) => row.product_slug);
  const pendingRows = pendingProductSlugs.length
    ? await prisma.$queryRaw<PendingRow[]>`
    SELECT
      pending.id,
      pending.product_slug,
      pending.product_name,
      pending.plan_slug,
      pending.plan_name,
      pending.country_code,
      pending.country_name_zh,
      pending.country_name_en,
      pending.platform,
      pending.source_type,
      pending.observed_local_price,
      pending.observed_currency,
      pending.observed_price_text,
      pending.observed_price_usd,
      pending.confidence_score,
      pending.review_status,
      pending.review_note,
      COALESCE(
        observation.raw_payload ->> 'auto_review_reason_code',
        CASE
          WHEN pending.review_note ILIKE 'Converted App Store price is above%' THEN 'app_store_observation_anomaly'
          WHEN pending.review_note ILIKE 'Only % App Store observations are available%' THEN 'waiting_for_more_app_store_samples'
          WHEN pending.review_note IS NULL THEN 'not_reviewed_yet'
          ELSE 'other'
        END
      ) AS review_reason_code,
      pending.source_url,
      pending.observed_at,
      evidence.evidence_tier,
      evidence.evidence_status,
      evidence.evidence_score,
      evidence.has_modal_consensus,
      evidence.modal_selected_count,
      evidence.modal_runner_up_count,
      evidence.modal_variant_count,
      evidence.fx_rate_date_text,
      evidence.fx_rate_age_days,
      evidence.published_comparison,
      evidence.published_local_price,
      evidence.published_currency,
      evidence.published_price_usd,
      evidence.published_last_checked_at,
      evidence.evidence_note
    FROM pending_price_observations_view pending
    JOIN price_observations observation ON observation.id = pending.id
    LEFT JOIN price_observation_evidence_view evidence ON evidence.id = pending.id
    LEFT JOIN region_prices published
      ON published.product_id = observation.product_id
      AND published.plan_id = observation.plan_id
      AND published.country_id = observation.country_id
      AND published.billing_platform = observation.billing_platform
      AND published.price_type = observation.price_type
      AND published.status = 'published'::publish_status
    WHERE pending.platform = 'ios'
      AND pending.product_slug IN (${Prisma.join(pendingProductSlugs)})
      AND NOT (
        published.id IS NOT NULL
        AND (
          published.last_checked_at >= observation.observed_at
          OR (
            published.currency IS NOT DISTINCT FROM observation.currency
            AND published.local_price IS NOT DISTINCT FROM observation.raw_price
            AND (
              published.price_usd IS NULL
              OR observation.converted_usd IS NULL
              OR published.price_usd = 0
              OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
            )
          )
        )
      )
      AND (
        COALESCE(observation.anomaly_flag, FALSE)
        OR published.id IS NULL
        OR pending.review_note IS NOT NULL
          AND pending.review_note NOT ILIKE 'Only % App Store observations are available%'
        OR published.currency IS DISTINCT FROM observation.currency
        OR published.local_price IS DISTINCT FROM observation.raw_price
        OR (
          published.price_usd IS NOT NULL
          AND observation.converted_usd IS NOT NULL
          AND published.price_usd > 0
          AND ABS((observation.converted_usd - published.price_usd) / published.price_usd) > 0.02
        )
      )
    ORDER BY pending.product_slug, pending.plan_slug, pending.observed_at DESC
  `
    : [];
  const productFreshnessRows =
    pendingProductSlugs.length > 0
      ? await prisma.$queryRaw<ProductCollectorFreshnessRow[]>`
          SELECT
            product.slug AS product_slug,
            MAX(run.started_at) FILTER (WHERE run.status = 'succeeded') AS latest_success_at,
            COALESCE(BOOL_OR(
              run.status = 'succeeded'
              AND run.started_at > NOW() - INTERVAL '12 hours'
            ), FALSE) AS has_fresh_success
          FROM products product
          JOIN collector_jobs job ON job.product_id = product.id
          JOIN price_sources source ON source.id = job.source_id
          LEFT JOIN collector_job_runs run ON run.job_id = job.id
          WHERE product.slug IN (${Prisma.join(pendingProductSlugs)})
            AND source.type = 'app_store'::price_source_type
            AND job.job_type = 'ai_pricing'
            AND job.status <> 'archived'
          GROUP BY product.slug
        `
      : [];
  const productFreshnessBySlug = new Map(
    productFreshnessRows.map((row) => [row.product_slug, row]),
  );

  const selectedProductCollectorRows = productQuery
    ? await prisma.$queryRaw<SelectedProductCollectorRow[]>`
        SELECT
          product.slug AS product_slug,
          product.name AS product_name,
          COUNT(DISTINCT job.id) FILTER (
            WHERE source.type = 'app_store'::price_source_type
              AND job.job_type = 'ai_pricing'
              AND job.status <> 'archived'
          )::int AS app_store_job_count,
          latest_run.started_at AS latest_run_at,
          latest_run.status AS latest_run_status,
          latest_success.started_at AS latest_success_at,
          COUNT(DISTINCT observation.id) FILTER (
            WHERE observation.status = 'pending'::observation_status
              AND observation.billing_platform = 'ios'::billing_platform
          )::int AS pending_observation_count,
          COUNT(DISTINCT published.id) FILTER (
            WHERE published.status = 'published'::publish_status
              AND published.billing_platform = 'ios'::billing_platform
          )::int AS published_price_count
        FROM products product
        LEFT JOIN collector_jobs job
          ON job.product_id = product.id
          AND job.status <> 'archived'
        LEFT JOIN price_sources source ON source.id = job.source_id
        LEFT JOIN LATERAL (
          SELECT run.status, run.started_at
          FROM collector_jobs scoped_job
          JOIN price_sources scoped_source ON scoped_source.id = scoped_job.source_id
          JOIN collector_job_runs run ON run.job_id = scoped_job.id
          WHERE scoped_job.product_id = product.id
            AND scoped_source.type = 'app_store'::price_source_type
          ORDER BY run.started_at DESC
          LIMIT 1
        ) latest_run ON TRUE
        LEFT JOIN LATERAL (
          SELECT run.started_at
          FROM collector_jobs scoped_job
          JOIN price_sources scoped_source ON scoped_source.id = scoped_job.source_id
          JOIN collector_job_runs run ON run.job_id = scoped_job.id
          WHERE scoped_job.product_id = product.id
            AND scoped_source.type = 'app_store'::price_source_type
            AND run.status = 'succeeded'
          ORDER BY run.started_at DESC
          LIMIT 1
        ) latest_success ON TRUE
        LEFT JOIN price_observations observation ON observation.product_id = product.id
        LEFT JOIN region_prices published ON published.product_id = product.id
        WHERE product.slug ILIKE ${productQueryLike}
          OR product.name ILIKE ${productQueryLike}
        GROUP BY product.id, latest_run.started_at, latest_run.status, latest_success.started_at
        ORDER BY
          CASE WHEN product.slug = ${productQuery} THEN 0 ELSE 1 END,
          product.sort_order,
          product.name
        LIMIT 1
      `
    : [];
  const selectedProductCollector = selectedProductCollectorRows[0] ?? null;
  const selectedProductName =
    discoveryProduct ||
    selectedProductCollector?.product_name ||
    selectedProductCollector?.product_slug ||
    productQuery;
  const selectedProductSlug = selectedProductCollector?.product_slug || productQuery;
  const selectedAppStoreJobCount =
    discoveryJobs > 0
      ? discoveryJobs
      : Number(selectedProductCollector?.app_store_job_count ?? 0);

  const pendingDiagnosisRows = await prisma.$queryRaw<PendingDiagnosisRow[]>`
    SELECT
      pending.product_slug,
      pending.product_name,
      pending.plan_slug,
      pending.plan_name,
      COALESCE(
        observation.raw_payload ->> 'auto_review_reason_code',
        CASE
          WHEN pending.review_note ILIKE 'Converted App Store price is above%' THEN 'app_store_observation_anomaly'
          WHEN pending.review_note ILIKE 'Only % App Store observations are available%' THEN 'waiting_for_more_app_store_samples'
          WHEN pending.review_note IS NULL THEN 'not_reviewed_yet'
          ELSE 'other'
        END
      ) AS reason_code,
      COUNT(*)::int AS row_count,
      COUNT(DISTINCT pending.country_code)::int AS country_count,
      MIN(pending.observed_price_usd) AS min_usd,
      MAX(pending.observed_price_usd) AS max_usd
    FROM pending_price_observations_view pending
    JOIN price_observations observation ON observation.id = pending.id
    LEFT JOIN region_prices published
      ON published.product_id = observation.product_id
      AND published.plan_id = observation.plan_id
      AND published.country_id = observation.country_id
      AND published.billing_platform = observation.billing_platform
      AND published.price_type = observation.price_type
      AND published.status = 'published'::publish_status
    WHERE pending.platform = 'ios'
      AND NOT (
        published.id IS NOT NULL
        AND (
          published.last_checked_at >= observation.observed_at
          OR (
            published.currency IS NOT DISTINCT FROM observation.currency
            AND published.local_price IS NOT DISTINCT FROM observation.raw_price
            AND (
              published.price_usd IS NULL
              OR observation.converted_usd IS NULL
              OR published.price_usd = 0
              OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
            )
          )
        )
      )
      AND (
        COALESCE(observation.anomaly_flag, FALSE)
        OR published.id IS NULL
        OR pending.review_note IS NOT NULL
          AND pending.review_note NOT ILIKE 'Only % App Store observations are available%'
        OR published.currency IS DISTINCT FROM observation.currency
        OR published.local_price IS DISTINCT FROM observation.raw_price
        OR (
          published.price_usd IS NOT NULL
          AND observation.converted_usd IS NOT NULL
          AND published.price_usd > 0
          AND ABS((observation.converted_usd - published.price_usd) / published.price_usd) > 0.02
        )
      )
    GROUP BY
      pending.product_slug,
      pending.product_name,
      pending.plan_slug,
      pending.plan_name,
      reason_code
    ORDER BY row_count DESC
    LIMIT 8
  `;

  const evidenceSummaryRows = await prisma.$queryRaw<EvidenceSummaryRow[]>`
    SELECT
      evidence_status,
      evidence_tier,
      COUNT(*)::int AS observation_count,
      COUNT(DISTINCT country_code)::int AS country_count,
      ROUND(AVG(evidence_score), 1) AS average_score,
      MAX(observed_at) AS latest_observed_at
    FROM price_observation_evidence_view
    WHERE observed_at >= NOW() - INTERVAL '14 days'
    GROUP BY evidence_status, evidence_tier
    ORDER BY observation_count DESC, average_score DESC NULLS LAST
    LIMIT 8
  `;

  const evidenceHealthRows = await prisma.$queryRaw<EvidenceHealthRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE has_modal_consensus)::int AS modal_consensus_count,
      COUNT(*) FILTER (WHERE evidence_status = 'blocked_anomaly')::int AS blocked_anomaly_count,
      COUNT(*) FILTER (WHERE evidence_status = 'old_sample')::int AS old_sample_count,
      COUNT(*) FILTER (WHERE fx_rate_age_days IS NOT NULL AND fx_rate_age_days > 2)::int AS stale_fx_count
    FROM price_observation_evidence_view
    WHERE observed_at >= NOW() - INTERVAL '14 days'
  `;

  const historyCountRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM price_observations_review_history_view
  `;
  const historyTotal = Number(historyCountRows[0]?.count ?? 0);
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / historyPageSize));

  const historyRows = await prisma.$queryRaw<HistoryRow[]>`
    SELECT
      id,
      product_slug,
      product_name,
      plan_slug,
      plan_name,
      country_code,
      country_name_zh,
      country_name_en,
      platform,
      source_type,
      observed_local_price,
      observed_currency,
      observed_price_text,
      observed_price_usd,
      confidence_score,
      review_status,
      source_url,
      observed_at,
      region_price_status,
      promoted_platform,
      promoted_data_quality,
      updated_at
    FROM price_observations_review_history_view
    ORDER BY updated_at DESC
    LIMIT ${historyPageSize}
    OFFSET ${historyOffset}
  `;

  const reviewStatusCountRows = await prisma.$queryRaw<ReviewStatusCountRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE review_status = 'approved')::int AS approved_count,
      COUNT(*) FILTER (WHERE review_status = 'ignored')::int AS ignored_count,
      COUNT(*) FILTER (WHERE review_status = 'rejected')::int AS rejected_count
    FROM price_observations_review_history_view
  `;

  const collectorStatusRows = await prisma.$queryRaw<CollectorStatusRow[]>`
    SELECT
      job.status,
      job.next_run_at,
      job.last_run_at,
      job.success_count,
      job.error_count,
      latest.status AS latest_run_status,
      latest.started_at AS latest_run_started_at,
      latest.output_excerpt AS latest_run_output,
      latest.error_message AS latest_run_error
    FROM collector_jobs job
    JOIN price_sources source ON source.id = job.source_id
    LEFT JOIN LATERAL (
      SELECT status, started_at, output_excerpt, error_message
      FROM collector_job_runs
      WHERE job_id = job.id
      ORDER BY started_at DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE source.type = 'app_store'::price_source_type
      AND job.status <> 'archived'
    ORDER BY job.updated_at DESC
    LIMIT 1
  `;

  const latestAutoReviewRows = await prisma.$queryRaw<AutoReviewRunRow[]>`
    SELECT
      id::text,
      status,
      dry_run,
      started_at,
      completed_at,
      checked_groups,
      auto_approved_count,
      manual_review_count,
      error_message
    FROM price_auto_review_runs
    ORDER BY started_at DESC
    LIMIT 1
  `;

  const autoReviewReasonRows = await prisma.$queryRaw<AutoReviewReasonRow[]>`
    WITH latest AS (
      SELECT id
      FROM price_auto_review_runs
      ORDER BY started_at DESC
      LIMIT 1
    )
    SELECT
      review_decision.decision,
      review_decision.reason_code,
      MAX(review_decision.reason) AS reason,
      COUNT(*)::int AS group_count,
      COALESCE(SUM(CARDINALITY(review_decision.observation_ids)), 0)::int AS observation_count
    FROM price_auto_review_decisions review_decision
    JOIN latest ON latest.id = review_decision.run_id
    GROUP BY review_decision.decision, review_decision.reason_code
    ORDER BY
      CASE WHEN review_decision.decision = 'auto_approve' THEN 0 ELSE 1 END,
      observation_count DESC,
      group_count DESC
    LIMIT 6
  `;

  const approvedCount = Number(reviewStatusCountRows[0]?.approved_count ?? 0);
  const ignoredCount = Number(reviewStatusCountRows[0]?.ignored_count ?? 0);
  const rejectedCount = Number(reviewStatusCountRows[0]?.rejected_count ?? 0);
  const collectorStatus = collectorStatusRows[0] ?? null;
  const latestAutoReview = latestAutoReviewRows[0] ?? null;
  const evidenceHealth = evidenceHealthRows[0] ?? {
    modal_consensus_count: 0,
    blocked_anomaly_count: 0,
    old_sample_count: 0,
    stale_fx_count: 0,
  };
  const topPendingReason = pendingDiagnosisRows[0] ?? null;
  const diagnosisProductCount = new Set(pendingDiagnosisRows.map((row) => row.product_slug)).size;
  const diagnosisPlanCount = new Set(
    pendingDiagnosisRows.map((row) => `${row.product_slug}:${row.plan_slug}`),
  ).size;
  const productSummaryBySlug = new Map(
    pendingProductSummaryRows.map((row) => [row.product_slug, row]),
  );
  const buildPageHref = ({
    page = pendingPage,
    nextHistoryPage = historyPage,
  }: {
    page?: number;
    nextHistoryPage?: number;
  }) => {
    const query = new URLSearchParams();

    if (page > 1) query.set("page", String(page));
    if (nextHistoryPage > 1) query.set("historyPage", String(nextHistoryPage));
    if (productQuery) query.set("q", productQuery);

    const value = query.toString();
    return value ? `/admin/review?${value}` : "/admin/review";
  };

  const pendingProductGroups = pendingProductSummaryRows.map<PendingProductGroup>((summary) => {
    const freshness = productFreshnessBySlug.get(summary.product_slug);
    return {
      productSlug: summary.product_slug,
      productName: summary.product_name,
      rows: [],
      plans: [],
      latestSuccessAt: freshness?.latest_success_at ?? null,
      hasFreshSuccess: freshness?.has_fresh_success ?? false,
      pendingCount: summary.pending_count,
      planCount: summary.plan_count,
      countryCount: summary.country_count,
      blockedCount: summary.blocked_count,
      waitingCount: summary.waiting_count,
      changedCount: summary.changed_count,
      lowConfidenceCount: summary.low_confidence_count,
      approvedCount: summary.approved_count,
      rejectedCount: summary.rejected_count,
      ignoredCount: summary.ignored_count,
    };
  });

  for (const row of pendingRows) {
    let productGroup = pendingProductGroups.find((group) => group.productSlug === row.product_slug);

    if (!productGroup) {
      const freshness = productFreshnessBySlug.get(row.product_slug);
      const summary = productSummaryBySlug.get(row.product_slug);
      productGroup = {
        productSlug: row.product_slug,
        productName: row.product_name,
        rows: [],
        plans: [],
        latestSuccessAt: freshness?.latest_success_at ?? null,
        hasFreshSuccess: freshness?.has_fresh_success ?? false,
        pendingCount: summary?.pending_count ?? 0,
        planCount: summary?.plan_count ?? 0,
        countryCount: summary?.country_count ?? 0,
        blockedCount: summary?.blocked_count ?? 0,
        waitingCount: summary?.waiting_count ?? 0,
        changedCount: summary?.changed_count ?? 0,
        lowConfidenceCount: summary?.low_confidence_count ?? 0,
        approvedCount: summary?.approved_count ?? 0,
        rejectedCount: summary?.rejected_count ?? 0,
        ignoredCount: summary?.ignored_count ?? 0,
      };
      pendingProductGroups.push(productGroup);
    }

    productGroup.rows.push(row);

    let planGroup = productGroup.plans.find((group) => group.planSlug === row.plan_slug);

    if (!planGroup) {
      planGroup = {
        planSlug: row.plan_slug,
        planName: row.plan_name,
        rows: [],
      };
      productGroup.plans.push(planGroup);
    }

    planGroup.rows.push(row);
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          价格采集 · 第 2 步
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          价格采集审核
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          这里是主工作台：按产品启动 App Store 采集，系统随后自动审核稳定价格；异常、缺样本或冲突数据只在这里集中解释。
        </p>
      </header>

      <AdminPipelineSteps currentStep="review" />

      {discoveryPromoted || selectedProductCollector ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                {discoveryPromoted ? "刚从线索入口加入" : "产品采集入口"}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-950">
                {selectedProductName || "这个产品"} 已进入服务库
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedAppStoreJobCount > 0
                  ? `已准备 ${selectedAppStoreJobCount} 个 App Store 采集任务。现在可以直接跑一次采集，完成后系统会自动审核并把稳定价格写入正式库。`
                  : "还没有识别到 App Store 采集任务。请先回产品库补充 App Store 链接，再回来采集。"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ManualCollectionProgressForm
                productSlug={selectedProductSlug}
                buttonLabel={`立即采集 ${selectedProductName || "该产品"}`}
                pendingLabel="正在采集并审核"
                disabled={!selectedProductSlug || selectedAppStoreJobCount <= 0}
              />
              <Link
                href="/admin/products"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                查看服务库
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">待审核价格观测</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingTotal}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">已通过</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{approvedCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">已忽略</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{ignoredCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">已拒绝</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{rejectedCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            i
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">采集和审核已合并到这个工作台</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              补采不再默认扫全部产品。请在下方按产品点击“只补采这个产品”；系统会跳过 12 小时内已经成功采集过的 App Store 任务，避免重复请求。
            </p>
          </div>
        </div>
      </section>

      {queuedCount !== null ? (
        <section
          className={[
            "rounded-xl border p-4 text-sm",
            collectionRun === "failed"
              ? "border-red-200 bg-red-50 text-red-800"
              : collectionRun === "cooldown"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
          ].join(" ")}
        >
          {collectionRun === "succeeded"
            ? `已立即执行${collectionScope ? ` ${collectionScope} 的` : ""} ${queuedCount} 个 App Store 补采任务，并完成真实稳定性审核。下方“最新审核结果”会显示正式入库数量。`
            : collectionRun === "cooldown"
              ? "已收到补采请求，但相关任务 2 分钟内刚执行过，本次进入冷却保护。"
              : collectionRun === "fresh"
                ? `${collectionScope ? `${collectionScope} ` : ""}12 小时内已经成功采集过，本次跳过补采；可以等待后台定时任务或后续再手动更新。`
              : collectionRun === "failed"
                ? "补采任务已排队，但立即执行失败；后台定时任务仍会继续处理，请查看采集任务页的失败原因。"
              : `已处理 ${queuedCount} 个 App Store 补采任务。`}
        </section>
      ) : null}

      {latestAutoReview ? (
        <section
          className={[
            "overflow-hidden rounded-xl border bg-white shadow-sm",
            latestAutoReview.status === "failed"
              ? "border-red-200"
              : latestAutoReview.dry_run
                ? "border-amber-200"
                : "border-emerald-200",
          ].join(" ")}
        >
          <div
            className={[
              "flex flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:justify-between",
              latestAutoReview.status === "failed"
                ? "bg-red-50"
                : latestAutoReview.dry_run
                  ? "bg-amber-50"
                  : "bg-emerald-50",
            ].join(" ")}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-950">最新审核结果</h2>
                <span
                  className={[
                    "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                    latestAutoReview.status === "failed"
                      ? "bg-red-100 text-red-700 ring-red-200"
                      : latestAutoReview.dry_run
                        ? "bg-amber-100 text-amber-800 ring-amber-200"
                        : "bg-emerald-100 text-emerald-700 ring-emerald-200",
                  ].join(" ")}
                >
                  {latestAutoReview.status === "failed"
                    ? "执行失败"
                    : latestAutoReview.dry_run
                      ? "仅预检，未入库"
                      : "已真实入库"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {latestAutoReview.dry_run
                  ? "这次只计算了可通过数量，没有写入正式价格。现在按钮已改为真实审核。"
                  : "自动通过的观测已写入正式价格库；未通过的会进入自动补采、隔离或等待稳定，不再要求逐条人工核验。"}
              </p>
              {latestAutoReview.error_message ? (
                <p className="mt-2 text-xs font-medium text-red-700">{latestAutoReview.error_message}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center md:min-w-[360px]">
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">检查组</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
                  {latestAutoReview.checked_groups}
                </div>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">正式入库</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">
                  {latestAutoReview.dry_run ? 0 : latestAutoReview.auto_approved_count}
                </div>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">需人工</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-amber-700">
                  {latestAutoReview.manual_review_count}
                </div>
              </div>
            </div>
          </div>

          {autoReviewReasonRows.length > 0 ? (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {autoReviewReasonRows.map((row) => (
                <div key={`${row.decision}-${row.reason_code}`} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        {reviewReasonLabel(row.reason_code)}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {reviewReasonAction(row.reason_code)}
                      </div>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        row.decision === "auto_approve"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200",
                      ].join(" ")}
                    >
                      {row.decision === "auto_approve" ? "可自动过" : "被拦截"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span>{row.group_count} 组</span>
                    <span>{row.observation_count} 条观测</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">为什么还有这么多没上线？</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                这里不是普通队列，而是“自动审核不敢直接上线”的异常池。当前主要集中在{" "}
                <span className="font-semibold text-slate-950">
                  {diagnosisProductCount} 个产品、{diagnosisPlanCount} 个套餐
                </span>
                ；系统已经把稳定样本写入正式库，剩下的是自动规则暂时拦住、等待补采或交叉验证的项目。
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                换句话说：数量多不是因为审核没跑，而是因为这些价格碰到了保护规则。正常处理方式是继续自动补采和规则校验；人工通过只作为极少数强制覆盖。
              </p>
            </div>
            {topPendingReason ? (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 md:min-w-[280px]">
                <div className="text-xs font-medium text-amber-700">最大阻塞原因</div>
                <div className="mt-1 font-semibold">{reviewReasonLabel(topPendingReason.reason_code)}</div>
                <div className="mt-1 text-xs leading-5 text-amber-700">
                  {topPendingReason.row_count} 条，涉及 {topPendingReason.country_count} 个地区
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {pendingDiagnosisRows.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingDiagnosisRows.map((row) => (
              <div
                key={`${row.product_slug}-${row.plan_slug}-${row.reason_code}`}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {row.product_name ?? row.product_slug}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.plan_name ?? row.plan_slug} · {row.country_count} 个地区
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                    {row.row_count} 条
                  </span>
                </div>
                <div className="mt-3 rounded-md bg-slate-50 px-2.5 py-2">
                  <div className="text-xs font-semibold text-slate-700">
                    {reviewReasonLabel(row.reason_code)}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {reviewReasonAction(row.reason_code)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>异常折算范围（未入正式库）</span>
                  <span className="font-medium text-slate-700">
                    {formatUsd(row.min_usd)} - {formatUsd(row.max_usd)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            当前没有需要解释的异常待审记录。
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-950">价格证据质量概览</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            最近 14 天的采集证据按状态归类。这里看的是证据链强弱，不是竞站是否一致。
          </p>
        </div>

        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-4">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 ring-1 ring-inset ring-emerald-100">
            <div className="text-xs font-medium text-emerald-700">页面多数票</div>
            <div className="mt-1 text-xl font-semibold text-emerald-950">
              {evidenceHealth.modal_consensus_count}
            </div>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-3 ring-1 ring-inset ring-red-100">
            <div className="text-xs font-medium text-red-700">系统隔离</div>
            <div className="mt-1 text-xl font-semibold text-red-950">
              {evidenceHealth.blocked_anomaly_count}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-inset ring-slate-200">
            <div className="text-xs font-medium text-slate-600">旧样本</div>
            <div className="mt-1 text-xl font-semibold text-slate-950">
              {evidenceHealth.old_sample_count}
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-3 ring-1 ring-inset ring-amber-100">
            <div className="text-xs font-medium text-amber-700">汇率过期</div>
            <div className="mt-1 text-xl font-semibold text-amber-950">
              {evidenceHealth.stale_fx_count}
            </div>
          </div>
        </div>

        {evidenceSummaryRows.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {evidenceSummaryRows.map((row) => (
              <div
                key={`${row.evidence_status}-${row.evidence_tier}`}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      {evidenceStatusLabel(row.evidence_status)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {evidenceTierLabel(row.evidence_tier)}
                    </div>
                  </div>
                  <span
                    className={[
                      "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                      evidenceBadgeClass(row.evidence_status),
                    ].join(" ")}
                  >
                    {row.observation_count} 条
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{row.country_count} 个地区</span>
                  <span>均分 {toNumber(row.average_score)?.toFixed(1) ?? "—"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  最近：{formatDate(row.latest_observed_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            最近 14 天暂无采集证据。
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">异常待决价格</h2>
            <p className="mt-1 text-xs text-slate-500">
              按产品聚合展示，不再按套餐或地区逐条铺开。当前第 {pendingPage} / {pendingTotalPages} 页，每页 {pendingPageSize} 个产品；共 {pendingProductTotal} 个产品、{pendingTotal} 条待处理观测。
            </p>
            {collectorStatus ? (
              <p className="mt-2 text-xs text-slate-400">
                App Store 采集器：{collectorStatus.status}；下次执行 {formatDate(collectorStatus.next_run_at)}；最近结果 {collectorStatus.latest_run_status ?? "暂无"}。
              </p>
            ) : null}
          </div>
          <form action="/admin/review" className="flex shrink-0 items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={productQuery}
              placeholder="搜索产品，如 Netflix"
              className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
            />
            <button
              type="submit"
              className="h-9 rounded-lg border border-slate-200 bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              搜索
            </button>
            {productQuery ? (
              <Link
                href="/admin/review"
                className="h-9 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                清除
              </Link>
            ) : null}
          </form>
        </div>

        {pendingProductGroups.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            暂无待审核价格观测。
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingProductGroups.map((productGroup) => (
              <details key={productGroup.productSlug} className="group">
                {/*
                  Products with isolated anomalies should remain re-runnable after parser/spec fixes.
                  Freshness only disables clean products that were just collected successfully.
                */}
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">
                        {productGroup.productName ?? productGroup.productSlug}
                      </h3>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {productGroup.productSlug}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-4">
                      <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
                        {productGroup.planCount ?? productGroup.plans.length} 个套餐 / {productGroup.countryCount ?? 0} 个地区
                      </span>
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700 ring-1 ring-amber-100">
                        待处理 {productGroup.pendingCount ?? productGroup.rows.length}
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700 ring-1 ring-emerald-100">
                        已通过 {productGroup.approvedCount ?? 0}
                      </span>
                      <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-red-700 ring-1 ring-red-100">
                        隔离/拒绝 {(productGroup.blockedCount ?? 0) + (productGroup.rejectedCount ?? 0)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {productGroup.waitingCount ? <span>待补样本 {productGroup.waitingCount}</span> : null}
                      {productGroup.changedCount ? <span>价格变化 {productGroup.changedCount}</span> : null}
                      {productGroup.lowConfidenceCount ? <span>低可信 {productGroup.lowConfidenceCount}</span> : null}
                      {productGroup.ignoredCount ? <span>已忽略 {productGroup.ignoredCount}</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      最近成功采集：{formatDate(productGroup.latestSuccessAt ?? null)}
                      {productGroup.hasFreshSuccess ? " · 12 小时内已更新" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(() => {
                      const hasIsolatedAnomaly = (productGroup.blockedCount ?? 0) > 0;
                      const disableCollection = Boolean(productGroup.hasFreshSuccess && !hasIsolatedAnomaly);
                      const buttonLabel = disableCollection
                        ? "已采集，暂不重复"
                        : hasIsolatedAnomaly
                          ? "规则已修，重新采集"
                          : "只补采这个产品";

                      return (
                    <ManualCollectionProgressForm
                      productSlug={productGroup.productSlug}
                      buttonLabel={buttonLabel}
                      pendingLabel="正在补采这个产品"
                      disabled={disableCollection}
                    />
                      );
                    })()}
                    <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 group-open:bg-slate-50">
                      查看异常明细
                    </span>
                  </div>
                </summary>

                <div className="grid gap-3 bg-slate-50/60 px-4 pb-4 md:grid-cols-2 xl:grid-cols-4">
                  {productGroup.plans.map((planGroup) => (
                    <div key={`${productGroup.productSlug}-${planGroup.planSlug}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {planGroup.planName ?? planGroup.planSlug}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {planGroup.planSlug} · {planGroup.rows.length} 个地区待处理
                          </div>
                        </div>
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                          待审核 {planGroup.rows.length}
                        </span>
                      </div>

                      <div className="max-h-[560px] space-y-2 overflow-y-auto border-t border-slate-100 p-3">
                        {planGroup.rows.map((row) => (
                          <div key={row.id} className="rounded-lg border border-slate-100 bg-white p-2.5 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold text-slate-950">
                                  {row.country_name_zh ?? row.country_name_en ?? row.country_code}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                  <span>{row.country_code}</span>
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                                    {platformLabel(row.platform)}
                                  </span>
                                  <span>可信度 {row.confidence_score ?? "—"}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-semibold text-slate-950">
                                  {row.observed_price_text ?? formatLocal(row.observed_local_price, row.observed_currency)}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {formatUsd(row.observed_price_usd)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] leading-4 text-amber-800 ring-1 ring-inset ring-amber-100">
                              <div className="font-semibold">
                                拦截原因：{reviewReasonLabel(row.review_reason_code)}
                              </div>
                              <div className="mt-0.5 text-amber-700">
                                {reviewReasonAction(row.review_reason_code)}
                              </div>
                            </div>
                            <PriceEvidencePanel row={row} />

                            {row.review_note ? (
                              <p className="mt-1.5 line-clamp-1 text-[11px] leading-4 text-slate-400">
                                原始规则说明：{row.review_note}
                              </p>
                            ) : null}

                            <div className="mt-2 flex items-center justify-between gap-2">
                              {row.source_url ? (
                                <a
                                  href={row.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                  打开来源
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">无来源链接</span>
                              )}
                              <ObservationReviewActions observationId={row.id} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}

        {pendingTotalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">
              共 {pendingProductTotal} 个产品，{pendingTotal} 条待处理观测
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref({ page: Math.max(1, pendingPage - 1) })}
                aria-disabled={pendingPage <= 1}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  pendingPage <= 1
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                上一页
              </Link>
              <span className="text-slate-500">
                {pendingPage} / {pendingTotalPages}
              </span>
              <Link
                href={buildPageHref({ page: Math.min(pendingTotalPages, pendingPage + 1) })}
                aria-disabled={pendingPage >= pendingTotalPages}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  pendingPage >= pendingTotalPages
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                下一页
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">最近审核历史</h2>
            <p className="mt-1 text-xs text-slate-500">
              按时间倒序分页显示已通过、已忽略或已拒绝记录。当前第 {historyPage} / {historyTotalPages} 页，每页 {historyPageSize} 条。
            </p>
          </div>
        </div>

        {historyRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            暂无审核历史。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">产品</th>
                  <th className="px-4 py-3 font-medium">套餐</th>
                  <th className="px-4 py-3 font-medium">地区</th>
                  <th className="px-4 py-3 font-medium">平台</th>
                  <th className="px-4 py-3 font-medium">观测价</th>
                  <th className="px-4 py-3 font-medium">审核状态</th>
                  <th className="px-4 py-3 font-medium">正式表</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {historyRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.product_name ?? row.product_slug}</div>
                      <div className="text-xs text-slate-500">{row.product_slug}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.plan_name ?? row.plan_slug}</div>
                      <div className="text-xs text-slate-500">{row.plan_slug}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.country_name_zh ?? row.country_name_en ?? row.country_code}</div>
                      <div className="text-xs text-slate-500">{row.country_code}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {platformLabel(row.platform)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">
                        {row.observed_price_text ?? formatLocal(row.observed_local_price, row.observed_currency)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatUsd(row.observed_price_usd)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadge(row.review_status)}`}>
                        {statusLabel(row.review_status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.region_price_status ? (
                        <div>
                          <div className="font-medium text-slate-900">{row.region_price_status}</div>
                          <div>{row.promoted_platform ?? "—"} · {row.promoted_data_quality ?? "—"}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">未写入</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(row.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyTotalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">共 {historyTotal} 条审核历史</div>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref({ nextHistoryPage: Math.max(1, historyPage - 1) })}
                aria-disabled={historyPage <= 1}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  historyPage <= 1
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                上一页
              </Link>
              <span className="text-slate-500">
                {historyPage} / {historyTotalPages}
              </span>
              <Link
                href={buildPageHref({ nextHistoryPage: Math.min(historyTotalPages, historyPage + 1) })}
                aria-disabled={historyPage >= historyTotalPages}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  historyPage >= historyTotalPages
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                下一页
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
