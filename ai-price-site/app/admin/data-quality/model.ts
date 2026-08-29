import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  assessProductOperationalStatus,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import {
  classifyProductCollectionSource,
  isAppStoreCollectionState,
  type ProductCollectionSourceState,
} from "../../../lib/admin-product-collection-source";
import { reviewReasonLabel } from "../review/review-reason-copy";
import { summarizeCollectorRunError } from "./collector-run-error-copy";
export type ProductQualityRow = {
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
  app_store_job_count: number;
  active_app_store_job_count: number;
  official_web_job_count: number;
  active_official_web_job_count: number;
  paused_official_web_job_count: number;
  official_web_target_country_count: number;
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
  pending_web_observation_count: number;
  pending_web_country_count: number;
  pending_anomaly_count: number;
  pending_stability_count: number;
  hard_anomaly_count: number;
  ignored_observation_count: number;
  auto_closed_observation_count: number;
  ignored_reason_codes: string | null;
  latest_observed_at: Date | string | null;
  latest_web_observed_at: Date | string | null;
  review_reason_codes: string | null;
  source_integration_status: string | null;
  source_integration_note: string | null;
};

export type RepairCycleRow = {
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

export type HealthLevel = "good" | "info" | "warning" | "danger";

export type ProductHealth = {
  level: HealthLevel;
  label: string;
  reason: string;
  reasonDetail?: string | null;
  nextAction: string;
};

export type ProductCollectionPresentation = {
  state: ProductCollectionSourceState;
  taskSummary: string;
  coverageTitle: string;
  coverageDetail: string;
  coveragePercent: number | null;
  reviewTitle: string;
  reviewDetail: string;
  nextCollection: string;
  lastCollectionLabel: string;
  lastCollectionAt: Date | string | null;
  supportsManualCollection: boolean;
};

export function toDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: Date | string | null) {
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

export function formatRelative(value: Date | string | null) {
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

export function formatDuration(seconds: number | null) {
  if (!seconds) return "未记录";
  if (seconds < 60) return `${seconds} 秒`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;

  const hours = Math.round(minutes / 60);
  return `${hours} 小时`;
}

export function formatNextCollection(row: ProductQualityRow) {
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

export function formatIgnoredReasons(value: string | null) {
  if (!value) return "暂无自动忽略";

  return value
    .split(",")
    .map((reason) => reason.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((reason) => reviewReasonLabel(reason))
    .join("、");
}

export function getCoverage(row: ProductQualityRow) {
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

export function getProductCollectionState(row: ProductQualityRow) {
  return classifyProductCollectionSource({
    integrationStatus: row.source_integration_status,
    appStoreJobCount: row.app_store_job_count,
    activeAppStoreJobCount: row.active_app_store_job_count,
    officialWebJobCount: row.official_web_job_count,
    activeOfficialWebJobCount: row.active_official_web_job_count,
    pausedOfficialWebJobCount: row.paused_official_web_job_count,
    pendingWebObservationCount: row.pending_web_observation_count,
  });
}

export function getProductCollectionPresentation(
  row: ProductQualityRow,
): ProductCollectionPresentation {
  const state = getProductCollectionState(row);
  const coverage = getCoverage(row);

  if (isAppStoreCollectionState(state)) {
    return {
      state,
      taskSummary:
        state === "app_store_active"
          ? `App Store 任务 ${row.active_app_store_job_count}`
          : `App Store 任务已暂停 ${row.app_store_job_count}`,
      coverageTitle: `${row.covered_pair_count} / ${coverage.effectiveTarget} 套餐地区`,
      coverageDetail: `${coverage.percent}% · 缺 ${row.missing_country_count} 地区 · 不可售 ${row.confirmed_unavailable_country_count}`,
      coveragePercent: coverage.percent,
      reviewTitle: `${row.pending_stability_count} 等稳定 · ${row.pending_anomaly_count} 异常`,
      reviewDetail: `近 30 天自动忽略 ${row.ignored_observation_count}`,
      nextCollection: formatNextCollection(row),
      lastCollectionLabel: "上次采集",
      lastCollectionAt: row.latest_run_started_at,
      supportsManualCollection: state === "app_store_active",
    };
  }

  if (state.startsWith("official_web_")) {
    const hasSamples = row.pending_web_observation_count > 0;
    const taskSummary =
      state === "official_web_active"
        ? `官网任务 ${row.active_official_web_job_count}`
        : state === "official_web_paused"
          ? `官网任务已暂停 ${row.paused_official_web_job_count}`
          : state === "official_web_observed"
            ? `官网样本 ${row.pending_web_observation_count} 条`
            : "官网采集器待接入";
    const nextCollection =
      state === "official_web_active"
        ? "按官网任务调度"
        : state === "official_web_paused" || row.paused_official_web_job_count > 0
          ? "官网任务已暂停"
          : "尚未配置官网任务";

    return {
      state,
      taskSummary,
      coverageTitle: hasSamples
        ? `${row.pending_web_country_count} 个 Web 地区`
        : "官网来源 · 尚未采集",
      coverageDetail: hasSamples
        ? `${row.pending_web_observation_count} 条待审官网样本 · 不计 App Store 覆盖`
        : "暂不计算 App Store 覆盖",
      coveragePercent: null,
      reviewTitle: hasSamples
        ? `${row.pending_web_observation_count} 条 Web 待审`
        : "暂无 Web 样本",
      reviewDetail: hasSamples
        ? "等待 Web 专属稳定性规则"
        : "等待专用网页采集器",
      nextCollection,
      lastCollectionLabel: "最近官网样本",
      lastCollectionAt: row.latest_web_observed_at,
      supportsManualCollection: false,
    };
  }

  if (state === "one_time") {
    return {
      state,
      taskSummary: "无需订阅采集任务",
      coverageTitle: "不适用订阅覆盖",
      coverageDetail: "一次性商品 · 不纳入地区订阅任务",
      coveragePercent: null,
      reviewTitle: "不适用订阅审核",
      reviewDetail: "按一次性商品独立处理",
      nextCollection: "无需订阅采集",
      lastCollectionLabel: "最近来源核验",
      lastCollectionAt: row.latest_observed_at,
      supportsManualCollection: false,
    };
  }

  return {
    state,
    taskSummary: "尚未配置采集来源",
    coverageTitle: "尚无可计算覆盖",
    coverageDetail: "等待确认采集来源与目标地区",
    coveragePercent: null,
    reviewTitle: "尚无待审样本",
    reviewDetail: "采集任务建立后进入自动审核",
    nextCollection: "无可用任务",
    lastCollectionLabel: "上次采集",
    lastCollectionAt: row.latest_run_started_at,
    supportsManualCollection: false,
  };
}

export function hasUnconsumedQueue(row: ProductQualityRow) {
  const latestRunAt = toDate(row.latest_run_started_at);
  const latestQueuedAt = toDate(row.latest_queued_at);

  return Boolean(latestQueuedAt && (!latestRunAt || latestQueuedAt > latestRunAt));
}

export function categoryLabel(category: string) {
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

export function getProductHealth(row: ProductQualityRow): ProductHealth {
  if (row.running_run_count > 0 || row.latest_run_status === "running") {
    return {
      level: "info",
      label: "正在采集",
      reason: "后台采集脚本正在执行，完成后会自动写回结果。",
      nextAction: "等待脚本完成",
    };
  }

  const collectionState = getProductCollectionState(row);

  if (collectionState === "one_time") {
    return {
      level: "info",
      label: "一次性商品",
      reason: "该产品不是周期订阅，不适用订阅采集任务和地区覆盖指标。",
      nextAction: "按一次性商品独立处理",
    };
  }

  if (collectionState === "official_web_observed") {
    return {
      level: "info",
      label: "Web 样本待审",
      reason: `已有 ${row.pending_web_observation_count} 条官网样本，等待 Web 专属稳定性规则后再形成正式价格。`,
      nextAction:
        row.paused_official_web_job_count > 0
          ? "完善 Web 审核规则"
          : "等待 Web 自动审核",
    };
  }

  if (collectionState === "official_web_active") {
    return {
      level: "info",
      label: "官网采集中",
      reason: "该产品采用官网价格口径，专用 Web 采集任务正在运行。",
      nextAction: "等待官网采集结果",
    };
  }

  if (collectionState === "official_web_paused") {
    return {
      level: "warning",
      label: "官网任务已暂停",
      reason: "该产品采用官网价格口径，但专用 Web 采集任务目前处于暂停状态。",
      nextAction: "确认后恢复官网任务",
    };
  }

  if (collectionState === "official_web_unconfigured") {
    return {
      level: "warning",
      label: "等待官网采集器",
      reason: "该产品已明确采用官网价格口径，尚未接入可自动运行的专用采集器。",
      nextAction: "接入官网采集器",
    };
  }

  if (collectionState === "unconfigured") {
    return {
      level: "danger",
      label: "缺少采集任务",
      reason: "尚未声明可用的数据来源，也没有可运行的采集任务。",
      nextAction: "确认来源并补充采集任务",
    };
  }

  if (row.latest_run_status === "failed") {
    const runError = summarizeCollectorRunError(row.latest_run_error);

    return {
      level: "danger",
      label: "采集失败",
      reason: runError.summary,
      reasonDetail: runError.detail,
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

  if (collectionState === "app_store_paused") {
    return {
      level: "warning",
      label: "App Store 任务已暂停",
      reason: "产品已有 App Store 采集配置，但当前没有处于启用状态的任务。",
      nextAction: "确认后恢复采集任务",
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

export function getProductOperationalAssessment(row: ProductQualityRow) {
  const collectionState = getProductCollectionState(row);

  if (collectionState === "app_store_paused") {
    const issueAssessment = assessProductOperationalStatus({
      publishStatus: row.status,
      planCount: row.plan_count,
      latestRunStatus: row.latest_run_status,
      pendingWorkCount: row.pending_app_store_count,
      blockedCount: row.pending_anomaly_count,
      publishedPriceCount: row.published_price_count,
      stalePriceCount: row.stale_published_count,
    });

    if (issueAssessment?.status === "exception") return issueAssessment;
  }

  if (collectionState === "one_time") {
    return { status: "pending" as const, reason: "一次性商品不进入订阅采集流程。" };
  }
  if (collectionState === "official_web_observed") {
    return {
      status: "pending" as const,
      reason: `${row.pending_web_observation_count} 条官网样本等待 Web 专属审核规则。`,
    };
  }
  if (collectionState === "official_web_active") {
    return { status: "pending" as const, reason: "官网采集任务正在运行。" };
  }
  if (collectionState === "official_web_paused") {
    return { status: "pending" as const, reason: "官网采集任务目前已暂停。" };
  }
  if (collectionState === "official_web_unconfigured") {
    return { status: "pending" as const, reason: "等待接入专用官网采集器。" };
  }
  if (collectionState === "app_store_paused") {
    return { status: "pending" as const, reason: "App Store 采集任务目前已暂停。" };
  }

  return assessProductOperationalStatus({
    publishStatus: row.status,
    planCount: row.plan_count,
    activeCollectorJobCount: row.active_app_store_job_count,
    latestRunStatus: row.latest_run_status,
    pendingWorkCount: row.pending_app_store_count,
    blockedCount: row.pending_anomaly_count,
    publishedPriceCount: row.published_price_count,
    stalePriceCount: row.stale_published_count,
  });
}

export function getProductOperationalStatus(
  row: ProductQualityRow,
): AdminOperationalStatus {
  return getProductOperationalAssessment(row)?.status ?? "not_started";
}

export function healthPriority(level: HealthLevel) {
  if (level === "danger") return 1;
  if (level === "warning") return 2;
  if (level === "info") return 3;
  return 4;
}

export function healthClasses(level: HealthLevel) {
  if (level === "good") {
    return {
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
      dot: "bg-emerald-500",
      row: "border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/60 dark:bg-emerald-950/20",
    };
  }

  if (level === "info") {
    return {
      badge: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800",
      dot: "bg-blue-500",
      row: "border-blue-100 bg-blue-50/30 dark:border-blue-900/60 dark:bg-blue-950/20",
    };
  }

  if (level === "warning") {
    return {
      badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
      dot: "bg-amber-500",
      row: "border-amber-100 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/20",
    };
  }

  return {
    badge: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800",
    dot: "bg-red-500",
    row: "border-red-100 bg-red-50/30 dark:border-red-900/60 dark:bg-red-950/20",
  };
}

export function healthIcon(level: HealthLevel) {
  if (level === "good") return CheckCircle2;
  if (level === "info") return Loader2;
  if (level === "warning") return AlertTriangle;
  return ShieldAlert;
}

export function countByHealth(rows: ProductQualityRow[], level: HealthLevel) {
  return rows.filter((row) => getProductHealth(row).level === level).length;
}
