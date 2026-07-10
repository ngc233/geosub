import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  ShieldAlert,
} from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../../components/admin/AdminCard";
import { prisma } from "../../../../lib/prisma";
import CollectorRunTimeline, {
  CollectorRunOutcomeSummary,
} from "../../review/CollectorRunTimeline";
import { getCollectorRunHistoryRows } from "../../review/collector-run-history-query";
import ManualCollectionProgressForm from "../../review/ManualCollectionProgressForm";
import { reviewReasonAction, reviewReasonLabel } from "../../review/review-reason-copy";

export const dynamic = "force-dynamic";

const COMMON_APP_STORE_COUNTRY_CODES = [
  "US",
  "JP",
  "GB",
  "DE",
  "FR",
  "IN",
  "TR",
  "BR",
  "CA",
  "SG",
  "AU",
  "KR",
  "MX",
  "ID",
  "PH",
  "TH",
  "MY",
  "VN",
  "ZA",
  "AE",
];

type ProductSummaryRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  provider: string | null;
  official_url: string | null;
  plan_count: number;
  app_store_job_count: number;
  due_job_count: number;
  running_run_count: number;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_finished_at: Date | string | null;
  latest_run_error: string | null;
  latest_run_age_seconds: number | null;
  published_price_count: number;
  published_country_count: number;
  stale_published_count: number;
  latest_price_checked_at: Date | string | null;
  pending_observation_count: number;
  pending_anomaly_count: number;
  hard_anomaly_count: number;
  latest_observed_at: Date | string | null;
};

type PlanCoverageRow = {
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  billing_cycle: string;
  status: string;
  published_price_count: number;
  published_country_count: number;
  common_country_count: number;
  common_published_country_count: number;
  pending_observation_count: number;
  pending_anomaly_count: number;
  min_price_usd: unknown;
  max_price_usd: unknown;
  latest_price_checked_at: Date | string | null;
  latest_observed_at: Date | string | null;
};

type MissingCountryRow = {
  plan_slug: string;
  plan_name: string;
  country_code: string;
  country_name: string;
  currency: string;
  pending_observation_count: number;
  latest_availability_status: string | null;
  latest_availability_reason: string | null;
};

type PendingReasonRow = {
  reason_code: string | null;
  observation_count: number;
  plan_count: number;
  country_count: number;
  min_price_usd: unknown;
  max_price_usd: unknown;
  latest_observed_at: Date | string | null;
};

type AvailabilitySummaryRow = {
  status: string;
  country_count: number;
  latest_checked_at: Date | string | null;
};

type DiagnosisLevel = "good" | "info" | "warning" | "danger";

type DiagnosisConclusion = {
  level: DiagnosisLevel;
  label: string;
  title: string;
  detail: string;
  nextAction: string;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return 0;
}

function toDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Date | string | null) {
  const date = toDate(value);
  if (!date) return "暂无";

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(value: Date | string | null) {
  const date = toDate(value);
  if (!date) return "从未";

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return "刚刚";
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "未记录";
  if (seconds < 60) return `${seconds} 秒`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;

  return `${Math.round(minutes / 60)} 小时`;
}

function formatUsd(value: unknown) {
  const number = toNumber(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  return `$${number.toFixed(2)}`;
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    ai: "AI 订阅",
    streaming: "流媒体",
    software: "软件",
    game: "游戏",
    gift_card: "礼品卡",
    vpn: "VPN",
    payment: "支付",
    other: "其他",
  };

  return labels[category] || category;
}

function statusLabel(status: string | null) {
  if (status === "succeeded") return "成功";
  if (status === "failed") return "失败";
  if (status === "running") return "运行中";
  if (status === "skipped") return "跳过";
  if (status === "published") return "已发布";
  if (status === "review") return "审核中";
  if (status === "draft") return "草稿";
  return status || "暂无";
}

function availabilityLabel(status: string | null) {
  if (status === "available_with_prices") return "可采到价格";
  if (status === "available_no_iap") return "可用但无订阅";
  if (status === "not_available") return "地区不可用";
  if (status === "blocked") return "访问受限";
  if (status === "unknown_error") return "检测异常";
  return status || "未检测";
}

function levelClasses(level: DiagnosisLevel) {
  if (level === "good") {
    return {
      card: "border-emerald-200 bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      icon: CheckCircle2,
    };
  }

  if (level === "info") {
    return {
      card: "border-blue-200 bg-blue-50",
      badge: "bg-blue-100 text-blue-700 ring-blue-200",
      icon: DatabaseZap,
    };
  }

  if (level === "warning") {
    return {
      card: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-700 ring-amber-200",
      icon: AlertTriangle,
    };
  }

  return {
    card: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-700 ring-red-200",
    icon: ShieldAlert,
  };
}

function getDiagnosisConclusion(
  product: ProductSummaryRow,
  commonMissingCount: number,
): DiagnosisConclusion {
  if (product.running_run_count > 0 || product.latest_run_status === "running") {
    return {
      level: "info",
      label: "正在采集",
      title: "后台正在跑这个产品",
      detail: "先等待采集脚本写回结果，完成后本页会显示新增观测、待审和正式入库结果。",
      nextAction: "等待这一轮结束后再判断。",
    };
  }

  if (product.app_store_job_count <= 0) {
    return {
      level: "danger",
      label: "缺采集任务",
      title: "这个产品没有可运行的 App Store 采集任务",
      detail: "没有采集任务就不会自动抓价格，也不会进入自动审核。需要先补产品的 App Store 来源。",
      nextAction: "去产品资料或线索入口补 App Store ID。",
    };
  }

  if (product.latest_run_status === "failed") {
    return {
      level: "danger",
      label: "采集失败",
      title: "最近一轮采集失败",
      detail: product.latest_run_error || "采集脚本没有成功写回结果，需要先看运行记录和输出摘要。",
      nextAction: "打开采集任务页查看失败原因。",
    };
  }

  if (product.hard_anomaly_count > 0) {
    return {
      level: "danger",
      label: "硬异常拦截",
      title: "系统拦下了高风险价格",
      detail: "通常是币种、小数点、周期或套餐匹配风险。它们不会自动上线，不需要人工逐国打开 App Store。",
      nextAction: "先看下方异常原因，必要时修采集规则后重采。",
    };
  }

  if (product.published_price_count <= 0) {
    return {
      level: "danger",
      label: "未入库",
      title: "还没有正式价格",
      detail: "前台不能可靠展示这个产品。需要先采集并让自动审核形成稳定样本。",
      nextAction: "立即只采这个产品。",
    };
  }

  if (commonMissingCount > 0) {
    return {
      level: "warning",
      label: "覆盖不完整",
      title: "常见地区还没覆盖全",
      detail: `常见国家套餐组合里还有 ${commonMissingCount} 个缺口，可能是未采到、地区不可用或被异常拦截。`,
      nextAction: "看缺口列表，优先重采这个产品。",
    };
  }

  if (product.pending_anomaly_count > 0 || product.pending_observation_count > 0) {
    return {
      level: "warning",
      label: "待审积压",
      title: "有价格还停在审核区",
      detail: "稳定样本会自动入库；异常样本会继续留在审核中心，避免污染正式价格。",
      nextAction: "看异常原因分组，不要逐条手工判断。",
    };
  }

  if (product.stale_published_count > 0) {
    return {
      level: "warning",
      label: "需要复采",
      title: "部分正式价超过 7 天未刷新",
      detail: "价格仍可展示，但不适合长期当作最新数据。建议下一轮轻量复采。",
      nextAction: "只采这个产品或等待定时任务。",
    };
  }

  return {
    level: "good",
    label: "健康",
    title: "采集、审核和正式价格都比较稳定",
    detail: "当前没有明显阻塞，后续交给定时采集和自动审核即可。",
    nextAction: "保持观察。",
  };
}

async function getProductSummary(slug: string) {
  const rows = await prisma.$queryRaw<ProductSummaryRow[]>`
    SELECT
      product.id::text,
      product.slug,
      product.name,
      product.category::text AS category,
      product.status::text AS status,
      product.provider,
      product.official_url,
      COALESCE(plan_state.plan_count, 0)::int AS plan_count,
      COALESCE(job_state.app_store_job_count, 0)::int AS app_store_job_count,
      COALESCE(job_state.due_job_count, 0)::int AS due_job_count,
      COALESCE(running_state.running_run_count, 0)::int AS running_run_count,
      latest_run.latest_run_status,
      latest_run.latest_run_started_at,
      latest_run.latest_run_finished_at,
      latest_run.latest_run_error,
      latest_run.latest_run_age_seconds,
      COALESCE(price_state.published_price_count, 0)::int AS published_price_count,
      COALESCE(price_state.published_country_count, 0)::int AS published_country_count,
      COALESCE(price_state.stale_published_count, 0)::int AS stale_published_count,
      price_state.latest_price_checked_at,
      COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_state.pending_anomaly_count, 0)::int AS pending_anomaly_count,
      COALESCE(observation_state.hard_anomaly_count, 0)::int AS hard_anomaly_count,
      observation_state.latest_observed_at
    FROM products product
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS plan_count
      FROM plans plan
      WHERE plan.product_id = product.id
        AND plan.status <> 'archived'::publish_status
    ) plan_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE job.status <> 'archived'
            AND (
              source.type = 'app_store'::price_source_type
              OR job.job_config ->> 'collector_kind' = 'app_store'
            )
        )::int AS app_store_job_count,
        COUNT(*) FILTER (
          WHERE job.status = 'active'
            AND (
              source.type = 'app_store'::price_source_type
              OR job.job_config ->> 'collector_kind' = 'app_store'
            )
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
        )::int AS due_job_count
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id = product.id
    ) job_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE run.status = 'running'
            AND run.started_at > NOW() - INTERVAL '20 minutes'
        )::int AS running_run_count
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) = product.id
        AND (
          source.type = 'app_store'::price_source_type
          OR run.collector_kind = 'app_store'
        )
    ) running_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        run.status AS latest_run_status,
        run.started_at AS latest_run_started_at,
        run.finished_at AS latest_run_finished_at,
        run.error_message AS latest_run_error,
        CASE
          WHEN run.started_at IS NULL THEN NULL
          ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(run.finished_at, NOW()) - run.started_at)))::int
        END AS latest_run_age_seconds
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) = product.id
        AND (
          source.type = 'app_store'::price_source_type
          OR run.collector_kind = 'app_store'
        )
      ORDER BY run.started_at DESC
      LIMIT 1
    ) latest_run ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        )::int AS published_price_count,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        )::int AS published_country_count,
        COUNT(*) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
            AND (
              price.last_checked_at IS NULL
              OR price.last_checked_at < NOW() - INTERVAL '7 days'
            )
        )::int AS stale_published_count,
        MAX(price.last_checked_at) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        ) AS latest_price_checked_at
      FROM region_prices price
      WHERE price.product_id = product.id
    ) price_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
        )::int AS pending_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
            AND COALESCE(observation.anomaly_flag, FALSE)
        )::int AS pending_anomaly_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
            AND (
              COALESCE(observation.anomaly_flag, FALSE)
              OR COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
                'app_store_observation_anomaly',
                'app_store_price_suspiciously_low',
                'app_store_global_price_outlier',
                'app_store_currency_mismatch',
                'app_store_local_dollar_parsed_as_usd',
                'app_store_plan_order_conflict',
                'suspicious_low_converted_usd',
                'suspicious_plan_order'
              )
            )
        )::int AS hard_anomaly_count,
        MAX(observation.observed_at) FILTER (
          WHERE observation.billing_platform = 'ios'::billing_platform
        ) AS latest_observed_at
      FROM price_observations observation
      WHERE observation.product_id = product.id
    ) observation_state ON TRUE
    WHERE product.slug = ${slug}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getPlanCoverageRows(productId: string) {
  return prisma.$queryRaw<PlanCoverageRow[]>`
    WITH target_country AS (
      SELECT id, code
      FROM countries
      WHERE code IN (${Prisma.join(COMMON_APP_STORE_COUNTRY_CODES)})
        AND code NOT IN ('CN', 'HK')
    )
    SELECT
      plan.id::text AS plan_id,
      plan.slug AS plan_slug,
      plan.name AS plan_name,
      plan.billing_cycle::text AS billing_cycle,
      plan.status::text AS status,
      COALESCE(price_state.published_price_count, 0)::int AS published_price_count,
      COALESCE(price_state.published_country_count, 0)::int AS published_country_count,
      (SELECT COUNT(*)::int FROM target_country)::int AS common_country_count,
      COALESCE(price_state.common_published_country_count, 0)::int AS common_published_country_count,
      COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_state.pending_anomaly_count, 0)::int AS pending_anomaly_count,
      price_state.min_price_usd,
      price_state.max_price_usd,
      price_state.latest_price_checked_at,
      observation_state.latest_observed_at
    FROM plans plan
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        )::int AS published_price_count,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        )::int AS published_country_count,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
            AND price.country_id IN (SELECT id FROM target_country)
        )::int AS common_published_country_count,
        MIN(price.price_usd) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        ) AS min_price_usd,
        MAX(price.price_usd) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        ) AS max_price_usd,
        MAX(price.last_checked_at) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        ) AS latest_price_checked_at
      FROM region_prices price
      WHERE price.plan_id = plan.id
    ) price_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
        )::int AS pending_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
            AND COALESCE(observation.anomaly_flag, FALSE)
        )::int AS pending_anomaly_count,
        MAX(observation.observed_at) FILTER (
          WHERE observation.billing_platform = 'ios'::billing_platform
        ) AS latest_observed_at
      FROM price_observations observation
      WHERE observation.plan_id = plan.id
    ) observation_state ON TRUE
    WHERE plan.product_id = ${productId}::uuid
      AND plan.status <> 'archived'::publish_status
    ORDER BY plan.sort_order ASC, plan.created_at ASC
  `;
}

async function getMissingCountryRows(productId: string, limit = 80) {
  return prisma.$queryRaw<MissingCountryRow[]>`
    WITH target_country AS (
      SELECT id, code, name_zh, name_en, currency, sort_order
      FROM countries
      WHERE code IN (${Prisma.join(COMMON_APP_STORE_COUNTRY_CODES)})
        AND code NOT IN ('CN', 'HK')
    ),
    plan_scope AS (
      SELECT id, slug, name, sort_order
      FROM plans
      WHERE product_id = ${productId}::uuid
        AND status <> 'archived'::publish_status
    )
    SELECT
      plan.slug AS plan_slug,
      plan.name AS plan_name,
      country.code AS country_code,
      COALESCE(country.name_zh, country.name_en, country.code) AS country_name,
      country.currency,
      COALESCE(pending.pending_observation_count, 0)::int AS pending_observation_count,
      availability.status AS latest_availability_status,
      availability.reason AS latest_availability_reason
    FROM plan_scope plan
    CROSS JOIN target_country country
    LEFT JOIN region_prices price
      ON price.plan_id = plan.id
      AND price.country_id = country.id
      AND price.status = 'published'::publish_status
      AND price.billing_platform = 'ios'::billing_platform
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS pending_observation_count
      FROM price_observations observation
      WHERE observation.plan_id = plan.id
        AND observation.country_id = country.id
        AND observation.status = 'pending'::observation_status
        AND observation.billing_platform = 'ios'::billing_platform
    ) pending ON TRUE
    LEFT JOIN app_store_availability_latest_view availability
      ON availability.product_id = ${productId}::uuid
      AND availability.country_id = country.id
      AND availability.billing_platform = 'ios'::billing_platform
    WHERE price.id IS NULL
    ORDER BY plan.sort_order ASC, country.sort_order ASC
    LIMIT ${limit}
  `;
}

async function getPendingReasonRows(productId: string) {
  return prisma.$queryRaw<PendingReasonRow[]>`
    SELECT
      NULLIF(
        COALESCE(
          observation.raw_payload ->> 'auto_review_reason_code',
          observation.anomaly_reason,
          'unknown'
        ),
        ''
      ) AS reason_code,
      COUNT(*)::int AS observation_count,
      COUNT(DISTINCT observation.plan_id)::int AS plan_count,
      COUNT(DISTINCT observation.country_id)::int AS country_count,
      MIN(observation.converted_usd) AS min_price_usd,
      MAX(observation.converted_usd) AS max_price_usd,
      MAX(observation.observed_at) AS latest_observed_at
    FROM price_observations observation
    WHERE observation.product_id = ${productId}::uuid
      AND observation.status = 'pending'::observation_status
      AND observation.billing_platform = 'ios'::billing_platform
    GROUP BY reason_code
    ORDER BY COUNT(*) DESC, reason_code ASC
    LIMIT 12
  `;
}

async function getAvailabilitySummaryRows(productId: string) {
  return prisma.$queryRaw<AvailabilitySummaryRow[]>`
    SELECT
      availability.status,
      COUNT(*)::int AS country_count,
      MAX(availability.checked_at) AS latest_checked_at
    FROM app_store_availability_latest_view availability
    WHERE availability.product_id = ${productId}::uuid
      AND availability.billing_platform = 'ios'::billing_platform
    GROUP BY availability.status
    ORDER BY COUNT(*) DESC, availability.status ASC
  `;
}

function PlanCoverageCard({ row }: { row: PlanCoverageRow }) {
  const commonMissing = Math.max(
    0,
    row.common_country_count - row.common_published_country_count,
  );
  const complete = commonMissing === 0 && row.pending_anomaly_count === 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">{row.plan_name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {row.plan_slug} · {row.billing_cycle} · {statusLabel(row.status)}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-bold ring-1",
            complete
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-700 ring-amber-200",
          ].join(" ")}
        >
          {complete ? "覆盖稳定" : `缺口 ${commonMissing}`}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">正式价格</div>
          <div className="mt-1 font-bold text-slate-950">{row.published_price_count} 条</div>
          <div className="mt-1 text-xs text-slate-500">{row.published_country_count} 地区</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">常见国家</div>
          <div className="mt-1 font-bold text-slate-950">
            {row.common_published_country_count} / {row.common_country_count}
          </div>
          <div className="mt-1 text-xs text-slate-500">App Store 核心覆盖</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">待审</div>
          <div className="mt-1 font-bold text-slate-950">{row.pending_observation_count} 条</div>
          <div className="mt-1 text-xs text-slate-500">异常 {row.pending_anomaly_count}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">美元范围</div>
          <div className="mt-1 font-bold text-slate-950">
            {formatUsd(row.min_price_usd)} - {formatUsd(row.max_price_usd)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            更新 {formatRelative(row.latest_price_checked_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

function collectionDisabledReason(product: ProductSummaryRow) {
  if (product.app_store_job_count <= 0) {
    return "还没有 App Store 采集任务，请先编辑产品来源。";
  }

  if (product.running_run_count > 0 || product.latest_run_status === "running") {
    return "这个产品正在采集中，等本轮结束后再重跑。";
  }

  return null;
}

function ProductActionPanel({ product }: { product: ProductSummaryRow }) {
  const disabledReason = collectionDisabledReason(product);
  const productQuery = encodeURIComponent(product.slug);

  return (
    <AdminCard className="mb-6">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">处理动作</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            诊断页只保留和这个产品相关的操作入口，避免再回到全站列表里翻找。
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {product.slug}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="text-xs font-bold text-blue-600">重新采集</div>
          <h3 className="mt-2 text-base font-bold text-slate-950">只采这个产品</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
            只唤起 {product.name} 的 App Store 采集任务，完成后进入自动审核。
          </p>
          <div className="mt-4">
            <ManualCollectionProgressForm
              productSlug={product.slug}
              buttonLabel="立即采集"
              pendingLabel="正在采集"
              disabled={Boolean(disabledReason)}
            />
          </div>
          {disabledReason ? (
            <p className="mt-3 text-xs leading-5 text-blue-700">{disabledReason}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-amber-600">异常处理</div>
          <h3 className="mt-2 text-base font-bold text-slate-950">查看待审核异常</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
            当前待审 {product.pending_observation_count} 条，其中硬异常 {product.hard_anomaly_count} 条。
          </p>
          <Link
            href={`/admin/review?q=${productQuery}`}
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
          >
            打开审核中心
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-emerald-600">采集排查</div>
          <h3 className="mt-2 text-base font-bold text-slate-950">查看采集任务</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
            已配置 {product.app_store_job_count} 个 App Store 任务，到期 {product.due_job_count} 个。
          </p>
          <Link
            href={`/admin/collector-jobs?q=${productQuery}`}
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            打开采集中心
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-slate-500">来源配置</div>
          <h3 className="mt-2 text-base font-bold text-slate-950">编辑产品来源</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
            维护 App Store、官网、Logo 和 SEO 等基础资料，缺采集任务时先从这里补。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/admin/products/${product.id}/edit`}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              编辑产品
            </Link>
            {product.official_url ? (
              <a
                href={product.official_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                打开官网
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </AdminCard>
  );
}

export default async function ProductDataQualityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductSummary(slug);

  if (!product) {
    notFound();
  }

  const [plans, missingRows, reasonRows, availabilityRows, collectorRuns] = await Promise.all([
    getPlanCoverageRows(product.id),
    getMissingCountryRows(product.id),
    getPendingReasonRows(product.id),
    getAvailabilitySummaryRows(product.id),
    getCollectorRunHistoryRows(product.slug, 8),
  ]);
  const commonMissingCount = plans.reduce(
    (sum, plan) =>
      sum + Math.max(0, plan.common_country_count - plan.common_published_country_count),
    0,
  );
  const conclusion = getDiagnosisConclusion(product, commonMissingCount);
  const conclusionClasses = levelClasses(conclusion.level);
  const ConclusionIcon = conclusionClasses.icon;

  return (
    <div>
      <AdminPageHeader
        eyebrow="产品诊断"
        title={`${product.name} 数据准确性诊断`}
        description="把采集、审核、缺口和正式价格按产品串起来看。这里不是逐条人工审核，而是判断这个产品当前卡在哪一步。"
        action={
          <Link
            href="/admin/data-quality"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            返回总览
          </Link>
        }
      />

      <AdminCard className={`mb-6 ${conclusionClasses.card}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <span
              className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${conclusionClasses.badge}`}
            >
              <ConclusionIcon size={21} strokeWidth={2.2} />
            </span>
            <div>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${conclusionClasses.badge}`}
              >
                {conclusion.label}
              </span>
              <h2 className="mt-3 text-xl font-bold text-slate-950">{conclusion.title}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
                {conclusion.detail}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-950">
                下一步：{conclusion.nextAction}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ManualCollectionProgressForm
              productSlug={product.slug}
              buttonLabel="只采这个产品"
              pendingLabel="正在采集"
              disabled={
                product.app_store_job_count <= 0 ||
                product.running_run_count > 0 ||
                product.latest_run_status === "running"
              }
            />
            <Link
              href={`/admin/review?q=${encodeURIComponent(product.slug)}`}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              查看审核
            </Link>
            <Link
              href={`/admin/collector-jobs?q=${encodeURIComponent(product.slug)}`}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              采集任务
            </Link>
            <Link
              href={`/admin/products/${product.id}/edit`}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              编辑来源
            </Link>
          </div>
        </div>
      </AdminCard>

      <ProductActionPanel product={product} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard label="套餐" value={product.plan_count} helper={categoryLabel(product.category)} />
        <AdminStatCard label="采集任务" value={product.app_store_job_count} helper={`到期 ${product.due_job_count}`} />
        <AdminStatCard label="正式价" value={product.published_price_count} helper={`${product.published_country_count} 地区`} />
        <AdminStatCard label="常见缺口" value={commonMissingCount} helper={`${COMMON_APP_STORE_COUNTRY_CODES.length} 个核心地区`} />
        <AdminStatCard label="待审" value={product.pending_observation_count} helper={`异常 ${product.pending_anomaly_count}`} />
        <AdminStatCard label="硬异常" value={product.hard_anomaly_count} helper="不会自动上线" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">套餐覆盖</h2>
              <p className="mt-1 text-sm text-slate-500">
                先看每个套餐是否覆盖常见 App Store 国家，再看是否有异常样本积压。
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-400">
              最近价格更新 {formatDate(product.latest_price_checked_at)}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCoverageCard key={plan.plan_id} row={plan} />
            ))}
            {plans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                暂无套餐。需要先在产品资料里补套餐。
              </div>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">地区可用性</h2>
            <p className="mt-1 text-sm text-slate-500">
              这里解释“没有采到”到底是地区不可用、无订阅，还是还没检查。
            </p>
          </div>
          <div className="space-y-3">
            {availabilityRows.map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3"
              >
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {availabilityLabel(row.status)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    最近 {formatRelative(row.latest_checked_at)}
                  </div>
                </div>
                <div className="text-lg font-bold text-slate-950">{row.country_count}</div>
              </div>
            ))}
            {availabilityRows.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                暂无地区可用性检查记录。
              </div>
            ) : null}
          </div>
        </AdminCard>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <div className="mb-4 flex items-start gap-3">
            <CircleAlert className="mt-0.5 text-amber-500" size={19} strokeWidth={2.2} />
            <div>
              <h2 className="text-lg font-bold text-slate-950">常见国家缺口</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                这里只列核心地区。若某国家显示“可用但无订阅”或“地区不可用”，通常不是采集脚本失败。
              </p>
            </div>
          </div>
          <div className="max-h-[480px] overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">套餐</th>
                  <th className="px-3 py-3 font-medium">地区</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {missingRows.map((row) => (
                  <tr key={`${row.plan_slug}-${row.country_code}`} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-950">{row.plan_name}</div>
                      <div className="mt-1 text-xs text-slate-400">{row.plan_slug}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">{row.country_name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {row.country_code} · {row.currency}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-700">
                        {row.pending_observation_count > 0
                          ? `待审 ${row.pending_observation_count}`
                          : availabilityLabel(row.latest_availability_status)}
                      </div>
                      {row.latest_availability_reason ? (
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                          {row.latest_availability_reason}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {missingRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-10 text-center text-sm text-slate-500">
                      常见地区没有明显缺口。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-4 flex items-start gap-3">
            <ShieldAlert className="mt-0.5 text-red-500" size={19} strokeWidth={2.2} />
            <div>
              <h2 className="text-lg font-bold text-slate-950">待审原因分组</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                这里按原因聚合，不再让你逐条翻。硬异常会自动拦截，稳定样本会自动入库。
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {reasonRows.map((row) => (
              <div key={row.reason_code || "unknown"} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {reviewReasonLabel(row.reason_code)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.plan_count} 套餐 · {row.country_count} 地区 · 最近 {formatRelative(row.latest_observed_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    {row.observation_count} 条
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {reviewReasonAction(row.reason_code)}
                </p>
                <div className="mt-3 text-xs font-semibold text-slate-400">
                  美元范围 {formatUsd(row.min_price_usd)} - {formatUsd(row.max_price_usd)}
                </div>
              </div>
            ))}
            {reasonRows.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-8 text-center text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                没有待审异常。这个产品当前不需要人工处理。
              </div>
            ) : null}
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">最近采集运行</h2>
            <p className="mt-1 text-sm text-slate-500">
              这里看脚本是否真的运行，以及本轮产生了多少观测、待审和正式价。
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            最近观测 {formatDate(product.latest_observed_at)}
          </div>
        </div>
        <div className="space-y-4">
          {collectorRuns.map((run) => (
            <div key={run.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-950">
                    {statusLabel(run.status)} · {formatDate(run.started_at)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    耗时 {formatDuration(run.run_age_seconds)} · {run.source_type || "unknown"}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {run.error_message || run.output_excerpt || "暂无输出摘要"}
                </div>
              </div>
              <div className="mt-3">
                <CollectorRunTimeline compact run={run} />
              </div>
              <div className="mt-3">
                <CollectorRunOutcomeSummary compact run={run} />
              </div>
            </div>
          ))}
          {collectorRuns.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              暂无采集运行记录。点击“只采这个产品”后，这里会显示运行过程和结果。
            </div>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}
