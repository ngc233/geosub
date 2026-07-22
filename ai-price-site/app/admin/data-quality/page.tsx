import Link from "next/link";
import { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import { DEFAULT_APP_STORE_COUNTRY_CODES } from "../../../lib/app-store-country-policy";
import { prisma } from "../../../lib/prisma";
import { reconcileStaleCollectorRuns } from "../review/collection-runner";
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";
import { reviewReasonLabel } from "../review/review-reason-copy";

export const dynamic = "force-dynamic";

type ProductQualityRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  plan_count: number;
  target_country_count: number;
  target_pair_count: number;
  covered_pair_count: number;
  unavailable_pair_count: number;
  confirmed_unavailable_country_count: number;
  missing_pair_count: number;
  missing_country_count: number;
  missing_country_codes: string | null;
  active_app_store_job_count: number;
  queued_job_count: number;
  stale_queue_count: number;
  latest_queued_at: Date | string | null;
  stale_refresh_status: string | null;
  stale_refresh_retry_count: number;
  stale_refresh_success_count: number;
  coverage_refresh_status: string | null;
  coverage_refresh_retry_count: number;
  coverage_refresh_success_count: number;
  coverage_refresh_missing_pair_count: number;
  anomaly_refresh_status: string | null;
  anomaly_refresh_retry_count: number;
  anomaly_refresh_success_count: number;
  next_scheduled_run_at: Date | string | null;
  stale_refresh_next_run_at: Date | string | null;
  coverage_refresh_next_run_at: Date | string | null;
  anomaly_refresh_next_run_at: Date | string | null;
  running_run_count: number;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_finished_at: Date | string | null;
  latest_run_error: string | null;
  latest_runner_state: string | null;
  latest_run_age_seconds: number | null;
  published_price_count: number;
  published_country_count: number;
  app_store_price_count: number;
  stale_published_count: number;
  published_outlier_count: number;
  duplicate_plan_group_count: number;
  missing_tax_profile_count: number;
  latest_price_checked_at: Date | string | null;
  pending_observation_count: number;
  pending_app_store_count: number;
  pending_anomaly_count: number;
  pending_stability_count: number;
  hard_anomaly_count: number;
  ignored_observation_count: number;
  auto_closed_observation_count: number;
  ignored_reason_codes: string | null;
  latest_observed_at: Date | string | null;
  review_reason_codes: string | null;
};

type RepairCycleRow = {
  id: string;
  trigger_kind: string;
  anomaly_jobs_queued: number;
  stale_jobs_queued: number;
  coverage_jobs_queued: number;
  anomaly_observations_closed: number;
  published_outliers_quarantined: number;
  stale_prices_quarantined: number;
  created_at: Date | string;
};

type HealthLevel = "good" | "info" | "warning" | "danger";

type ProductHealth = {
  level: HealthLevel;
  label: string;
  reason: string;
  nextAction: string;
};

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

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
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

  const hours = Math.round(minutes / 60);
  return `${hours} 小时`;
}

function formatNextCollection(row: ProductQualityRow) {
  if (row.running_run_count > 0 || row.latest_run_status === "running") {
    return "正在执行";
  }

  if (row.queued_job_count > 0 || row.stale_queue_count > 0) {
    return "等待执行";
  }

  const nextRun =
    row.anomaly_refresh_next_run_at ||
    row.stale_refresh_next_run_at ||
    row.coverage_refresh_next_run_at ||
    row.next_scheduled_run_at;
  if (nextRun) return formatDate(nextRun);

  return row.active_app_store_job_count > 0 ? "下轮调度执行" : "无可用任务";
}

function formatIgnoredReasons(value: string | null) {
  if (!value) return "暂无自动忽略";

  return value
    .split(",")
    .map((reason) => reason.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((reason) => reviewReasonLabel(reason))
    .join("、");
}

function getCoverage(row: ProductQualityRow) {
  const effectiveTarget = Math.max(
    0,
    row.target_pair_count - row.unavailable_pair_count,
  );
  const percent =
    effectiveTarget > 0
      ? Math.min(100, Math.round((row.covered_pair_count / effectiveTarget) * 100))
      : 0;

  return { effectiveTarget, percent };
}

function hasUnconsumedQueue(row: ProductQualityRow) {
  const latestRunAt = toDate(row.latest_run_started_at);
  const latestQueuedAt = toDate(row.latest_queued_at);

  return Boolean(latestQueuedAt && (!latestRunAt || latestQueuedAt > latestRunAt));
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

function getProductHealth(row: ProductQualityRow): ProductHealth {
  if (row.running_run_count > 0 || row.latest_run_status === "running") {
    return {
      level: "info",
      label: "正在采集",
      reason: "后台采集脚本正在执行，完成后会自动写回结果。",
      nextAction: "等待脚本完成",
    };
  }

  if (row.active_app_store_job_count <= 0) {
    return {
      level: "danger",
      label: "缺少采集任务",
      reason: "没有可运行的 App Store 采集任务，新增产品会卡在服务库里。",
      nextAction: "补充采集任务",
    };
  }

  if (row.latest_run_status === "failed") {
    return {
      level: "danger",
      label: "采集失败",
      reason: row.latest_run_error || "最近一次采集失败，需要先看失败原因。",
      nextAction: "查看采集任务",
    };
  }

  if (row.hard_anomaly_count > 0 && row.anomaly_refresh_status === "active") {
    return {
      level: "info",
      label: "异常复核已排队",
      reason: `${row.hard_anomaly_count} 条隔离样本正在执行第 ${Math.max(1, row.anomaly_refresh_retry_count)} 轮定向复采，不需要逐条人工核验。`,
      nextAction: "等待自动复核",
    };
  }

  if (
    row.hard_anomaly_count > 0 &&
    row.anomaly_refresh_success_count > 0 &&
    row.anomaly_refresh_success_count < 3
  ) {
    return {
      level: "info",
      label: "异常自动复核中",
      reason: `已完成 ${row.anomaly_refresh_success_count}/3 轮定向复采；仍不可信的样本会在三轮后自动隔离收口。`,
      nextAction: "等待下一轮复采",
    };
  }

  if (row.hard_anomaly_count > 0 && row.anomaly_refresh_success_count >= 3) {
    return {
      level: "info",
      label: "等待自动收口",
      reason: "三轮异常复采已经完成，系统将在本轮维护中把仍不可信的样本转为隔离证据。",
      nextAction: "等待自动收口",
    };
  }

  if (row.hard_anomaly_count > 0 && row.published_price_count <= 0) {
    return {
      level: "danger",
      label: "硬异常拦截",
      reason: "系统认为有币种、周期或小数点级别的高风险异常，不能自动上线。",
      nextAction: "查看异常明细",
    };
  }

  if (row.published_price_count <= 0) {
    return {
      level: "danger",
      label: "未上线",
      reason: "还没有正式价格，前台不会可靠展示这个产品。",
      nextAction: "立即采集",
    };
  }

  if (row.duplicate_plan_group_count > 0) {
    return {
      level: "danger",
      label: "套餐重复",
      reason: `${row.duplicate_plan_group_count} 组已上线套餐名称重复，会造成同一套餐分栏和日期口径不一致。`,
      nextAction: "合并重复套餐",
    };
  }

  if (row.published_outlier_count > 0) {
    return {
      level: "warning",
      label: "正式价需复核",
      reason: `${row.published_outlier_count} 条正式价格明显偏离同套餐中位数，系统应先定向复采再决定是否保留。`,
      nextAction: "等待异常复采",
    };
  }

  if (row.queued_job_count > 0 && hasUnconsumedQueue(row)) {
    return {
      level: "info",
      label: "已排队",
      reason: "采集任务刚刚进入下一轮队列，等待后台脚本接管。",
      nextAction: "等待脚本完成",
    };
  }

  if (row.stale_queue_count > 0 && hasUnconsumedQueue(row)) {
    return {
      level: "warning",
      label: "队列未消费",
      reason: "任务处于待运行状态已超过 15 分钟，可能是后台调度没有接管。",
      nextAction: "检查采集任务",
    };
  }

  if (row.stale_published_count > 0 && row.stale_refresh_status === "active") {
    return {
      level: "info",
      label: "自动复采已排队",
      reason: `${row.stale_published_count} 条正式价格超过 14 天未确认，系统正在执行第 ${Math.max(1, row.stale_refresh_retry_count)} 轮定向复采。`,
      nextAction: "等待自动复采",
    };
  }

  if (row.stale_published_count > 0 && row.stale_refresh_success_count > 0) {
    return {
      level: "warning",
      label: "自动复采观察中",
      reason: `已完成 ${row.stale_refresh_success_count}/3 轮定向复采；仍未确认的价格会在下一轮继续核验，三轮后自动移出前台。`,
      nextAction: "等待下一轮复采",
    };
  }

  if (row.hard_anomaly_count > 0) {
    return {
      level: "info",
      label: "异常已隔离",
      reason: `${row.hard_anomaly_count} 条高风险样本已被系统隔离，不影响现有稳定正式价格。`,
      nextAction: "等待自动复采",
    };
  }

  if (row.pending_anomaly_count > 0) {
    return {
      level: "info",
      label: "异常观察中",
      reason: "自动审核没有放行这些样本，它们不会影响已上线的稳定价格。",
      nextAction: "等待自动复采",
    };
  }

  if (row.pending_stability_count > 0) {
    return {
      level: "info",
      label: "自动补采中",
      reason: `${row.pending_stability_count} 条样本正在等待三次稳定一致，系统会继续采集并自动判断。`,
      nextAction: "等待稳定样本",
    };
  }

  if (row.pending_observation_count >= 80) {
    return {
      level: "warning",
      label: "待审核积压",
      reason: "待审核记录偏多，建议按产品重新采集或让自动审核再跑一轮。",
      nextAction: "按产品处理",
    };
  }

  if (row.stale_published_count > 0) {
    return {
      level: "warning",
      label: "价格需复采",
      reason: "部分正式价格超过 14 天没有刷新，调度器下一次运行会自动按产品和地区复采。",
      nextAction: "等待自动排队",
    };
  }

  if (row.missing_pair_count > 0 && row.coverage_refresh_status === "active") {
    return {
      level: "info",
      label: "覆盖补采已排队",
      reason: `${row.missing_country_count} 个地区仍有套餐缺价，系统正在执行第 ${Math.max(1, row.coverage_refresh_retry_count)} 轮定向补采。`,
      nextAction: "等待自动补采",
    };
  }

  if (
    row.missing_pair_count > 0 &&
    row.coverage_refresh_success_count >= 3 &&
    row.coverage_refresh_status === "paused"
  ) {
    return {
      level: "good",
      label: "地区差异已复核",
      reason: "三轮补采仍未发现这些套餐，系统按地区上架差异保留，并由周度采集继续监测。",
      nextAction: "无需手工处理",
    };
  }

  if (row.missing_pair_count > 0 && row.coverage_refresh_success_count > 0) {
    return {
      level: "info",
      label: "覆盖补采观察中",
      reason: `已完成 ${row.coverage_refresh_success_count}/3 轮定向补采；相同缺口每 24 小时复核一次。`,
      nextAction: "等待下一轮补采",
    };
  }

  if (row.missing_pair_count > 0) {
    return {
      level: "warning",
      label: "地区覆盖有缺口",
      reason: `${row.missing_country_count} 个默认地区仍有套餐缺价，已确认不可售地区不计入缺口。`,
      nextAction: "等待自动定向补采",
    };
  }

  if (row.missing_tax_profile_count > 0) {
    return {
      level: "warning",
      label: "税务资料待补",
      reason: `${row.missing_tax_profile_count} 个已上线地区缺少有效税务资料，价格仍可展示，但税务说明不完整。`,
      nextAction: "补齐税务资料",
    };
  }

  if (!row.latest_run_started_at) {
    return {
      level: "warning",
      label: "从未采集",
      reason: "产品有采集任务，但还没有实际运行记录。",
      nextAction: "立即采集",
    };
  }

  return {
    level: "good",
    label: "健康",
    reason: "采集、审核和正式价格状态稳定，日常无需手工介入。",
    nextAction: "保持观察",
  };
}

function healthPriority(level: HealthLevel) {
  if (level === "danger") return 1;
  if (level === "warning") return 2;
  if (level === "info") return 3;
  return 4;
}

function healthClasses(level: HealthLevel) {
  if (level === "good") {
    return {
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      dot: "bg-emerald-500",
      row: "border-emerald-100 bg-emerald-50/30",
    };
  }

  if (level === "info") {
    return {
      badge: "bg-blue-50 text-blue-700 ring-blue-200",
      dot: "bg-blue-500",
      row: "border-blue-100 bg-blue-50/30",
    };
  }

  if (level === "warning") {
    return {
      badge: "bg-amber-50 text-amber-700 ring-amber-200",
      dot: "bg-amber-500",
      row: "border-amber-100 bg-amber-50/30",
    };
  }

  return {
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
    row: "border-red-100 bg-red-50/30",
  };
}

function healthIcon(level: HealthLevel) {
  if (level === "good") return CheckCircle2;
  if (level === "info") return Loader2;
  if (level === "warning") return AlertTriangle;
  return ShieldAlert;
}

function countByHealth(rows: ProductQualityRow[], level: HealthLevel) {
  return rows.filter((row) => getProductHealth(row).level === level).length;
}

async function getProductQualityRows() {
  return prisma.$queryRaw<ProductQualityRow[]>`
    WITH target_country AS (
      SELECT id, code
      FROM countries
      WHERE code IN (${Prisma.join(DEFAULT_APP_STORE_COUNTRY_CODES)})
        AND code NOT IN ('CN', 'HK')
    ),
    product_base AS (
      SELECT
        product.id,
        product.slug,
        product.name,
        product.category::text AS category,
        product.status::text AS status
      FROM products product
      WHERE product.status::text <> 'archived'
    ),
    active_plan AS (
      SELECT plan.id, plan.product_id
      FROM plans plan
      WHERE plan.status::text <> 'archived'
    ),
    published_pair AS (
      SELECT DISTINCT price.plan_id, price.country_id
      FROM region_prices price
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
    ),
    plan_state AS (
      SELECT
        plan.product_id,
        COUNT(*)::int AS plan_count
      FROM active_plan plan
      GROUP BY plan.product_id
    ),
    coverage_state AS (
      SELECT
        plan.product_id,
        (SELECT COUNT(*)::int FROM target_country)::int AS target_country_count,
        COUNT(*)::int AS target_pair_count,
        COUNT(*) FILTER (WHERE price.plan_id IS NOT NULL)::int AS covered_pair_count,
        COUNT(*) FILTER (
          WHERE availability.status IN ('not_available', 'available_no_iap')
            OR plan_availability.status = 'confirmed_absent'
        )::int AS unavailable_pair_count,
        COUNT(DISTINCT country.id) FILTER (
          WHERE availability.status IN ('not_available', 'available_no_iap')
        )::int AS confirmed_unavailable_country_count,
        COUNT(*) FILTER (
          WHERE price.plan_id IS NULL
            AND COALESCE(availability.status, '') NOT IN ('not_available', 'available_no_iap')
            AND COALESCE(plan_availability.status, '') <> 'confirmed_absent'
        )::int AS missing_pair_count,
        COUNT(DISTINCT country.id) FILTER (
          WHERE price.plan_id IS NULL
            AND COALESCE(availability.status, '') NOT IN ('not_available', 'available_no_iap')
            AND COALESCE(plan_availability.status, '') <> 'confirmed_absent'
        )::int AS missing_country_count,
        STRING_AGG(DISTINCT country.code, ', ' ORDER BY country.code) FILTER (
          WHERE price.plan_id IS NULL
            AND COALESCE(availability.status, '') NOT IN ('not_available', 'available_no_iap')
            AND COALESCE(plan_availability.status, '') <> 'confirmed_absent'
        ) AS missing_country_codes
      FROM active_plan plan
      CROSS JOIN target_country country
      LEFT JOIN published_pair price
        ON price.plan_id = plan.id
        AND price.country_id = country.id
      LEFT JOIN app_store_availability_latest_view availability
        ON availability.product_id = plan.product_id
        AND availability.country_id = country.id
        AND availability.billing_platform::text = 'ios'
      LEFT JOIN app_store_plan_availability_checks plan_availability
        ON plan_availability.plan_id = plan.id
        AND plan_availability.country_id = country.id
        AND plan_availability.billing_platform::text = 'ios'
      GROUP BY plan.product_id
    ),
    price_state AS (
      SELECT
        price.product_id,
        COUNT(*) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        )::int AS published_price_count,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        )::int AS published_country_count,
        COUNT(*) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        )::int AS app_store_price_count,
        COUNT(*) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
            AND (
              price.last_checked_at IS NULL
              OR price.last_checked_at < NOW() - INTERVAL '14 days'
            )
        )::int AS stale_published_count,
        MAX(price.last_checked_at) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        ) AS latest_price_checked_at
      FROM region_prices price
      GROUP BY price.product_id
    ),
    published_plan_stats AS (
      SELECT
        price.product_id,
        price.plan_id,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY price.price_usd)::numeric AS median_usd,
        COUNT(*)::int AS region_count
      FROM region_prices price
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
        AND price.price_usd IS NOT NULL
        AND price.price_usd >= 1
      GROUP BY price.product_id, price.plan_id
    ),
    outlier_state AS (
      SELECT
        price.product_id,
        COUNT(*) FILTER (
          WHERE price.price_usd < 1
            OR (
              stats.region_count >= 8
              AND (
                price.price_usd < stats.median_usd * 0.2
                OR price.price_usd > stats.median_usd * 3.5
              )
            )
        )::int AS published_outlier_count
      FROM region_prices price
      LEFT JOIN published_plan_stats stats
        ON stats.product_id = price.product_id
       AND stats.plan_id = price.plan_id
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
        AND price.price_usd IS NOT NULL
      GROUP BY price.product_id
    ),
    duplicate_plan_state AS (
      SELECT duplicate.product_id, COUNT(*)::int AS duplicate_plan_group_count
      FROM (
        SELECT
          plan.product_id,
          lower(trim(plan.name)) AS normalized_name
        FROM plans plan
        WHERE plan.status::text = 'published'
        GROUP BY plan.product_id, lower(trim(plan.name))
        HAVING COUNT(*) > 1
      ) duplicate
      GROUP BY duplicate.product_id
    ),
    tax_state AS (
      SELECT
        price.product_id,
        COUNT(DISTINCT price.country_id) FILTER (WHERE tax.id IS NULL)::int AS missing_tax_profile_count
      FROM region_prices price
      LEFT JOIN country_tax_profiles tax
        ON tax.country_id = price.country_id
       AND tax.status = 'active'
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
      GROUP BY price.product_id
    ),
    observation_state AS (
      SELECT
        observation.product_id,
        COUNT(*) FILTER (WHERE observation.status::text = 'pending')::int AS pending_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
        )::int AS pending_app_store_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
            AND observation.anomaly_flag
        )::int AS pending_anomaly_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
            AND COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
              'waiting_for_more_app_store_samples',
              'app_store_price_changed',
              'app_store_samples_too_old',
              'low_confidence'
            )
        )::int AS pending_stability_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
            AND (
              observation.anomaly_flag
              OR lower(COALESCE(observation.anomaly_reason, '')) LIKE '%hard%'
              OR COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
                'app_store_global_price_outlier',
                'app_store_hard_anomaly_guard',
                'hard_price_guard'
              )
            )
        )::int AS hard_anomaly_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'ignored'
            AND observation.billing_platform::text = 'ios'
            AND observation.updated_at > NOW() - INTERVAL '30 days'
        )::int AS ignored_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'ignored'
            AND observation.billing_platform::text = 'ios'
            AND observation.updated_at > NOW() - INTERVAL '30 days'
            AND COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '')
              = 'automated_anomaly_rechecks_exhausted'
        )::int AS auto_closed_observation_count,
        string_agg(
          DISTINCT NULLIF(COALESCE(
            observation.raw_payload ->> 'auto_review_reason_code',
            observation.anomaly_reason
          ), ''),
          ','
        ) FILTER (
          WHERE observation.status::text = 'ignored'
            AND observation.billing_platform::text = 'ios'
            AND observation.updated_at > NOW() - INTERVAL '30 days'
        ) AS ignored_reason_codes,
        MAX(observation.observed_at) AS latest_observed_at,
        string_agg(
          DISTINCT NULLIF(COALESCE(
            observation.raw_payload ->> 'auto_review_reason_code',
            observation.anomaly_reason
          ), ''),
          ', '
        ) FILTER (WHERE observation.status::text = 'pending') AS review_reason_codes
      FROM price_observations observation
      GROUP BY observation.product_id
    ),
    job_state AS (
      SELECT
        job.product_id,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status <> 'archived'
        )::int AS active_app_store_job_count,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
            AND job.updated_at > NOW() - INTERVAL '15 minutes'
        )::int AS queued_job_count
        ,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
            AND job.updated_at <= NOW() - INTERVAL '15 minutes'
        )::int AS stale_queue_count,
        MAX(job.updated_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
        ) AS latest_queued_at,
        MAX(job.status) FILTER (
          WHERE job.schedule = 'stale_refresh'
            AND job.status <> 'archived'
        ) AS stale_refresh_status,
        MAX(COALESCE((job.job_config ->> 'stale_retry_count')::int, 0)) FILTER (
          WHERE job.schedule = 'stale_refresh'
            AND job.status <> 'archived'
        )::int AS stale_refresh_retry_count,
        MAX(COALESCE((job.job_config ->> 'stale_success_count')::int, 0)) FILTER (
          WHERE job.schedule = 'stale_refresh'
            AND job.status <> 'archived'
        )::int AS stale_refresh_success_count,
        MAX(job.status) FILTER (
          WHERE job.schedule = 'coverage_refresh'
            AND job.status <> 'archived'
        ) AS coverage_refresh_status,
        MAX(COALESCE((job.job_config ->> 'coverage_retry_count')::int, 0)) FILTER (
          WHERE job.schedule = 'coverage_refresh'
            AND job.status <> 'archived'
        )::int AS coverage_refresh_retry_count,
        MAX(COALESCE((job.job_config ->> 'coverage_success_count')::int, 0)) FILTER (
          WHERE job.schedule = 'coverage_refresh'
            AND job.status <> 'archived'
        )::int AS coverage_refresh_success_count,
        MAX(COALESCE((job.job_config ->> 'coverage_missing_pair_count')::int, 0)) FILTER (
          WHERE job.schedule = 'coverage_refresh'
            AND job.status <> 'archived'
        )::int AS coverage_refresh_missing_pair_count,
        MAX(job.status) FILTER (
          WHERE job.schedule = 'anomaly_watch'
            AND job.status <> 'archived'
        ) AS anomaly_refresh_status,
        MAX(COALESCE((job.job_config ->> 'anomaly_retry_count')::int, 0)) FILTER (
          WHERE job.schedule = 'anomaly_watch'
            AND job.status <> 'archived'
        )::int AS anomaly_refresh_retry_count,
        MAX(COALESCE((job.job_config ->> 'anomaly_success_count')::int, 0)) FILTER (
          WHERE job.schedule = 'anomaly_watch'
            AND job.status <> 'archived'
        )::int AS anomaly_refresh_success_count,
        MIN(job.next_run_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.next_run_at > NOW()
        ) AS next_scheduled_run_at,
        MIN(job.next_run_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.schedule = 'stale_refresh'
            AND job.next_run_at > NOW()
        ) AS stale_refresh_next_run_at,
        MIN(job.next_run_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.schedule = 'coverage_refresh'
        ) AS coverage_refresh_next_run_at
        ,
        MIN(job.next_run_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.schedule = 'anomaly_watch'
        ) AS anomaly_refresh_next_run_at
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id IS NOT NULL
      GROUP BY job.product_id
    ),
    running_state AS (
      SELECT
        COALESCE(run.product_id, job.product_id) AS product_id,
        COUNT(*) FILTER (
          WHERE run.status = 'running'
            AND run.started_at > NOW() - INTERVAL '20 minutes'
        )::int AS running_run_count
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) IS NOT NULL
        AND source.type::text = 'app_store'
      GROUP BY COALESCE(run.product_id, job.product_id)
    ),
    latest_run AS (
      SELECT DISTINCT ON (COALESCE(run.product_id, job.product_id))
        COALESCE(run.product_id, job.product_id) AS product_id,
        run.status AS latest_run_status,
        run.started_at AS latest_run_started_at,
        run.finished_at AS latest_run_finished_at,
        run.error_message AS latest_run_error,
        run.raw_payload ->> 'state' AS latest_runner_state,
        CASE
          WHEN run.started_at IS NULL THEN NULL
          ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(run.finished_at, NOW()) - run.started_at)))::int
        END AS latest_run_age_seconds
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) IS NOT NULL
        AND source.type::text = 'app_store'
      ORDER BY COALESCE(run.product_id, job.product_id), run.started_at DESC
    )
    SELECT
      product.id::text,
      product.slug,
      product.name,
      product.category,
      product.status,
      COALESCE(plan_state.plan_count, 0)::int AS plan_count,
      COALESCE(coverage_state.target_country_count, 0)::int AS target_country_count,
      COALESCE(coverage_state.target_pair_count, 0)::int AS target_pair_count,
      COALESCE(coverage_state.covered_pair_count, 0)::int AS covered_pair_count,
      COALESCE(coverage_state.unavailable_pair_count, 0)::int AS unavailable_pair_count,
      COALESCE(coverage_state.confirmed_unavailable_country_count, 0)::int AS confirmed_unavailable_country_count,
      COALESCE(coverage_state.missing_pair_count, 0)::int AS missing_pair_count,
      COALESCE(coverage_state.missing_country_count, 0)::int AS missing_country_count,
      coverage_state.missing_country_codes,
      COALESCE(job_state.active_app_store_job_count, 0)::int AS active_app_store_job_count,
      COALESCE(job_state.queued_job_count, 0)::int AS queued_job_count,
      COALESCE(job_state.stale_queue_count, 0)::int AS stale_queue_count,
      job_state.latest_queued_at,
      job_state.stale_refresh_status,
      COALESCE(job_state.stale_refresh_retry_count, 0)::int AS stale_refresh_retry_count,
      COALESCE(job_state.stale_refresh_success_count, 0)::int AS stale_refresh_success_count,
      job_state.coverage_refresh_status,
      COALESCE(job_state.coverage_refresh_retry_count, 0)::int AS coverage_refresh_retry_count,
      COALESCE(job_state.coverage_refresh_success_count, 0)::int AS coverage_refresh_success_count,
      COALESCE(job_state.coverage_refresh_missing_pair_count, 0)::int AS coverage_refresh_missing_pair_count,
      job_state.anomaly_refresh_status,
      COALESCE(job_state.anomaly_refresh_retry_count, 0)::int AS anomaly_refresh_retry_count,
      COALESCE(job_state.anomaly_refresh_success_count, 0)::int AS anomaly_refresh_success_count,
      job_state.next_scheduled_run_at,
      job_state.stale_refresh_next_run_at,
      job_state.coverage_refresh_next_run_at,
      job_state.anomaly_refresh_next_run_at,
      COALESCE(running_state.running_run_count, 0)::int AS running_run_count,
      latest_run.latest_run_status,
      latest_run.latest_run_started_at,
      latest_run.latest_run_finished_at,
      latest_run.latest_run_error,
      latest_run.latest_runner_state,
      latest_run.latest_run_age_seconds,
      COALESCE(price_state.published_price_count, 0)::int AS published_price_count,
      COALESCE(price_state.published_country_count, 0)::int AS published_country_count,
      COALESCE(price_state.app_store_price_count, 0)::int AS app_store_price_count,
      COALESCE(price_state.stale_published_count, 0)::int AS stale_published_count,
      COALESCE(outlier_state.published_outlier_count, 0)::int AS published_outlier_count,
      COALESCE(duplicate_plan_state.duplicate_plan_group_count, 0)::int AS duplicate_plan_group_count,
      COALESCE(tax_state.missing_tax_profile_count, 0)::int AS missing_tax_profile_count,
      price_state.latest_price_checked_at,
      COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_state.pending_app_store_count, 0)::int AS pending_app_store_count,
      COALESCE(observation_state.pending_anomaly_count, 0)::int AS pending_anomaly_count,
      COALESCE(observation_state.pending_stability_count, 0)::int AS pending_stability_count,
      COALESCE(observation_state.hard_anomaly_count, 0)::int AS hard_anomaly_count,
      COALESCE(observation_state.ignored_observation_count, 0)::int AS ignored_observation_count,
      COALESCE(observation_state.auto_closed_observation_count, 0)::int AS auto_closed_observation_count,
      observation_state.ignored_reason_codes,
      observation_state.latest_observed_at,
      observation_state.review_reason_codes
    FROM product_base product
    LEFT JOIN plan_state ON plan_state.product_id = product.id
    LEFT JOIN coverage_state ON coverage_state.product_id = product.id
    LEFT JOIN price_state ON price_state.product_id = product.id
    LEFT JOIN outlier_state ON outlier_state.product_id = product.id
    LEFT JOIN duplicate_plan_state ON duplicate_plan_state.product_id = product.id
    LEFT JOIN tax_state ON tax_state.product_id = product.id
    LEFT JOIN observation_state ON observation_state.product_id = product.id
    LEFT JOIN job_state ON job_state.product_id = product.id
    LEFT JOIN running_state ON running_state.product_id = product.id
    LEFT JOIN latest_run ON latest_run.product_id = product.id
    ORDER BY
      CASE
        WHEN COALESCE(running_state.running_run_count, 0) > 0 THEN 1
        WHEN COALESCE(job_state.active_app_store_job_count, 0) <= 0 THEN 2
        WHEN latest_run.latest_run_status = 'failed' THEN 3
        WHEN COALESCE(observation_state.hard_anomaly_count, 0) > 0 THEN 4
        WHEN COALESCE(price_state.published_price_count, 0) <= 0 THEN 5
        WHEN COALESCE(job_state.queued_job_count, 0) > 0 THEN 6
        WHEN COALESCE(job_state.stale_queue_count, 0) > 0 THEN 7
        WHEN COALESCE(observation_state.pending_anomaly_count, 0) > 0 THEN 8
        WHEN COALESCE(observation_state.pending_observation_count, 0) >= 80 THEN 9
        WHEN COALESCE(price_state.stale_published_count, 0) > 0 THEN 10
        ELSE 11
      END,
      COALESCE(observation_state.pending_observation_count, 0) DESC,
      product.name ASC
  `;
}

async function getLatestRepairCycle() {
  const rows = await prisma.$queryRaw<RepairCycleRow[]>`
    SELECT
      cycle.id::text,
      cycle.trigger_kind,
      cycle.anomaly_jobs_queued,
      cycle.stale_jobs_queued,
      cycle.coverage_jobs_queued,
      cycle.anomaly_observations_closed,
      cycle.published_outliers_quarantined,
      cycle.stale_prices_quarantined,
      cycle.created_at
    FROM data_quality_repair_cycles cycle
    ORDER BY cycle.created_at DESC
    LIMIT 1
  `;

  return rows[0] || null;
}

export default async function AdminDataQualityPage() {
  await reconcileStaleCollectorRuns();

  const [qualityRows, latestRepairCycle] = await Promise.all([
    getProductQualityRows(),
    getLatestRepairCycle(),
  ]);
  const rows = qualityRows.sort((a, b) => {
    const healthA = getProductHealth(a);
    const healthB = getProductHealth(b);
    const priorityDiff = healthPriority(healthA.level) - healthPriority(healthB.level);

    if (priorityDiff !== 0) return priorityDiff;
    if (a.pending_observation_count !== b.pending_observation_count) {
      return b.pending_observation_count - a.pending_observation_count;
    }

    return a.name.localeCompare(b.name, "zh-CN");
  });
  const goodCount = countByHealth(rows, "good");
  const infoCount = countByHealth(rows, "info");
  const warningCount = countByHealth(rows, "warning");
  const dangerCount = countByHealth(rows, "danger");
  const autoClosedTotal = rows.reduce(
    (sum, row) => sum + row.auto_closed_observation_count,
    0,
  );
  const autoRepairProductCount = rows.filter(
    (row) =>
      row.anomaly_refresh_status === "active" ||
      row.stale_refresh_status === "active" ||
      row.coverage_refresh_status === "active" ||
      (row.hard_anomaly_count > 0 && row.anomaly_refresh_success_count < 3) ||
      (row.stale_published_count > 0 && row.stale_refresh_success_count < 3) ||
      (row.missing_pair_count > 0 && row.coverage_refresh_success_count < 3) ||
      row.pending_stability_count > 0,
  ).length;
  const needsConfigurationCount = rows.filter(
    (row) =>
      row.active_app_store_job_count <= 0 || row.latest_run_status === "failed",
  ).length;
  const coverageGapProductCount = rows.filter(
    (row) => row.missing_pair_count > 0,
  ).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="数据质量"
        title="产品数据健康总览"
        description="把采集、自动审核、地区覆盖和正式价格按产品归因。日常先处理红色产品，蓝色状态由系统继续采集和判断。"
        action={
          <Link
            href="/admin/collector-jobs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            查看采集任务
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <AdminStatCard label="产品总数" value={rows.length} helper="服务库内未归档产品" />
        <AdminStatCard label="健康" value={goodCount} helper="无需手工处理" />
        <AdminStatCard label="自动处理中" value={autoRepairProductCount} helper={`${infoCount} 个产品处于系统处理状态`} />
        <AdminStatCard label="自动收口" value={autoClosedTotal} helper="近 30 天隔离的无效证据" />
        <AdminStatCard label="需关注" value={warningCount} helper="建议复采或看原因" />
        <AdminStatCard label="需配置" value={needsConfigurationCount} helper={`${dangerCount} 个产品影响上线或采集`} />
      </div>

      <AdminCard className="mb-6 border-blue-200 bg-blue-50/70">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex gap-3">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <DatabaseZap size={20} strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="text-base font-bold text-blue-950">
              产品更新判断
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-blue-800">
                系统按所有已上线 AI 与流媒体产品统一检查覆盖、价格时效、极端值、重复套餐和税务资料。每个产品会说明是否需要更新、更新原因以及任务是否已经进入队列。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-blue-800 2xl:min-w-[620px] 2xl:grid-cols-4">
            <div className="rounded-xl bg-white/70 px-3 py-2">
              最近闭环：{latestRepairCycle ? formatRelative(latestRepairCycle.created_at) : "等待首次运行"}
            </div>
            <div className="rounded-xl bg-white/70 px-3 py-2">
              本轮排队：{latestRepairCycle
                ? latestRepairCycle.anomaly_jobs_queued +
                  latestRepairCycle.stale_jobs_queued +
                  latestRepairCycle.coverage_jobs_queued
                : 0}
            </div>
            <div className="rounded-xl bg-white/70 px-3 py-2">
              本轮隔离：{latestRepairCycle
                ? latestRepairCycle.anomaly_observations_closed +
                  latestRepairCycle.published_outliers_quarantined +
                  latestRepairCycle.stale_prices_quarantined
                : 0}
            </div>
            <div className="rounded-xl bg-white/70 px-3 py-2">
              覆盖缺口：{coverageGapProductCount} 个产品
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              产品级处理队列
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              一行代表一个产品。覆盖、稳定样本和下次采集都在这里汇总；只有红色问题需要人工介入。
            </p>
          </div>
          <p className="text-xs font-semibold text-slate-400">
            更新时间：{formatDate(new Date())}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="hidden grid-cols-[1.05fr_1.05fr_1fr_0.9fr_0.9fr_1.15fr_0.85fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 lg:grid">
            <div>产品</div>
            <div>地区覆盖</div>
            <div>自动审核</div>
            <div>采集状态</div>
            <div>下次采集</div>
            <div>更新原因</div>
            <div className="text-right">操作</div>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const health = getProductHealth(row);
              const classes = healthClasses(health.level);
              const Icon = healthIcon(health.level);
              const unconsumedQueue = hasUnconsumedQueue(row);
              const coverage = getCoverage(row);

              return (
                <div
                  key={row.id}
                  className={[
                    "grid gap-4 px-4 py-4 text-sm lg:grid-cols-[1.05fr_1.05fr_1fr_0.9fr_0.9fr_1.15fr_0.85fr] lg:items-center",
                    classes.row,
                  ].join(" ")}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${classes.dot}`} />
                      <p className="font-bold text-slate-950">{row.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.slug} · {categoryLabel(row.category)} · {row.plan_count} 个套餐
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      极端价 {row.published_outlier_count} · 重复套餐 {row.duplicate_plan_group_count} · 税务缺口 {row.missing_tax_profile_count}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 lg:hidden">地区覆盖</p>
                    <p className="font-bold text-slate-950">
                      {row.covered_pair_count} / {coverage.effectiveTarget} 套餐地区
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${coverage.percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500" title={row.missing_country_codes || undefined}>
                      {coverage.percent}% · 缺 {row.missing_country_count} 地区 · 不可售 {row.confirmed_unavailable_country_count}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 lg:hidden">自动审核</p>
                    <p className="font-bold text-slate-950">
                      {row.pending_stability_count} 等稳定 · {row.pending_anomaly_count} 异常
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      近 30 天自动忽略 {row.ignored_observation_count}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400" title={formatIgnoredReasons(row.ignored_reason_codes)}>
                      {formatIgnoredReasons(row.ignored_reason_codes)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 lg:hidden">采集状态</p>
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1",
                        classes.badge,
                      ].join(" ")}
                    >
                      <Icon size={13} strokeWidth={2.2} />
                      {health.label}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      App Store 任务 {row.active_app_store_job_count}
                      {row.stale_queue_count > 0 && unconsumedQueue
                        ? ` · 未消费 ${row.stale_queue_count}`
                        : ""}
                      {row.stale_refresh_retry_count > 0
                        ? ` · 复采 ${row.stale_refresh_success_count}/3`
                        : ""}
                      {row.coverage_refresh_retry_count > 0
                        ? ` · 补采 ${Math.min(row.coverage_refresh_success_count, 3)}/3`
                        : ""}
                      {row.anomaly_refresh_retry_count > 0
                        ? ` · 异常复核 ${Math.min(row.anomaly_refresh_success_count, 3)}/3`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 lg:hidden">下次采集</p>
                    <p className="font-semibold text-slate-700">
                      {formatNextCollection(row)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      上次采集 {formatRelative(row.latest_run_started_at)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      价格确认 {formatRelative(row.latest_price_checked_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 lg:hidden">结论</p>
                    <p className="font-semibold text-slate-800">{health.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      建议：{health.nextAction} · 最近运行 {row.latest_run_status || "暂无"} · {formatDuration(row.latest_run_age_seconds)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <ManualCollectionProgressForm
                      productSlug={row.slug}
                      buttonLabel="采集"
                      pendingLabel="正在采集"
                      disabled={
                        row.active_app_store_job_count <= 0 ||
                        row.running_run_count > 0 ||
                        row.latest_run_status === "running"
                      }
                    />
                    <Link
                      href={`/admin/review?q=${encodeURIComponent(row.slug)}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      审核
                    </Link>
                    <Link
                      href={`/admin/data-quality/${encodeURIComponent(row.slug)}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      诊断
                    </Link>
                    <Link
                      href={`/admin/collector-jobs?q=${encodeURIComponent(row.slug)}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      任务
                    </Link>
                  </div>
                </div>
              );
            })}

            {rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">
                暂无产品数据。先从线索入口添加产品，再生成采集任务。
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          <Clock3 size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
          <p>
            这页只做产品级归因，不替代明细审核。若某个产品长期处于“已排队”或“正在采集”，优先进入采集任务页查看后台脚本是否卡住。
          </p>
        </div>
      </AdminCard>
    </div>
  );
}
