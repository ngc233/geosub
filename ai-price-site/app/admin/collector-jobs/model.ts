import {
  isManuallyQueuedAppStoreJob,
  isRunningAppStoreJob,
} from "./job-state";
export type JobRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string;
  product_status: string | null;
  source_name: string | null;
  source_type: string | null;
  job_type: string;
  schedule: string | null;
  status: string;
  next_run_at: Date | string | null;
  last_run_at: Date | string | null;
  success_count: number;
  error_count: number;
  last_error: string | null;
  priority: number;
  collector_kind: string | null;
  discovery_candidate_name: string | null;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_error: string | null;
  latest_run_output: string | null;
  latest_run_diagnosis: string | null;
  latest_runner_state: string | null;
  latest_process_id: string | null;
  latest_run_age_seconds: number | null;
  latest_has_review_outcome: boolean;
  latest_observed_count: number;
  latest_approved_count: number;
  latest_pending_stability_count: number;
  latest_isolated_count: number;
  latest_published_price_count: number;
  latest_storefront_count: number;
  published_price_count: number;
  pending_observation_count: number;
  approved_observation_count: number;
  recent_app_store_observation_count: number;
  is_due: boolean;
  queue_pending: boolean;
};

export type RunRow = {
  id: string;
  job_id: string;
  product_slug: string | null;
  product_name: string | null;
  source_name: string | null;
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
  observed_count: number;
  pending_observation_count: number;
  approved_observation_count: number;
  rejected_observation_count: number;
  ignored_observation_count: number;
  anomaly_observation_count: number;
  published_price_count: number;
};

export type AvailabilityRow = {
  id: string;
  product_name: string;
  product_slug: string;
  country_code: string;
  country_name_zh: string;
  status: string;
  source_name: string | null;
  item_count: number;
  subscription_item_count: number;
  ignored_item_count: number;
  reason: string | null;
  checked_at: Date | string;
};

export type ProductJobGroup = {
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: string | null;
  jobs: JobRow[];
  latestJob: JobRow | null;
  hasQueuedJob: boolean;
  hasRunningJob: boolean;
  hasAppStoreRunningJob: boolean;
  hasFailedJob: boolean;
  activeJobCount: number;
  sourceLabels: string[];
  publishedPriceCount: number;
  pendingObservationCount: number;
  approvedObservationCount: number;
  recentAppStoreObservationCount: number;
  successCount: number;
  errorCount: number;
  nextRunAt: Date | string | null;
};

export function formatDate(value: Date | string | null) {
  if (!value) return "未安排";

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNextRun(value: Date | string | null) {
  if (!value) return "按数据状态自动安排";
  if (dateValue(value) <= Date.now()) return "已到期，等待执行器";
  return formatDate(value);
}

export function formatDuration(value: number | null) {
  if (!value) return "未记录";
  if (value < 1000) return `${value} 毫秒`;
  return `${Math.round(value / 1000)} 秒`;
}

export function formatRunDuration(row: {
  status: string;
  duration_ms: number | null;
  run_age_seconds: number | null;
}) {
  if (row.duration_ms !== null && row.duration_ms !== undefined) {
    return formatDuration(row.duration_ms);
  }

  if (row.status === "running" && row.run_age_seconds !== null) {
    return `${row.run_age_seconds} 秒`;
  }

  return row.status === "running" ? "运行中" : "未记录";
}

export function statusLabel(status: string | null) {
  if (status === "active") return "启用";
  if (status === "paused") return "暂停";
  if (status === "failed") return "失败";
  if (status === "archived") return "归档";
  if (status === "running") return "运行中";
  if (status === "succeeded") return "成功";
  if (status === "skipped") return "跳过";
  return status || "未知";
}

export function statusClassName(status: string | null) {
  if (status === "active" || status === "succeeded") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "running") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "failed") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "paused" || status === "skipped") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function availabilityLabel(status: string | null) {
  if (status === "available_with_prices") return "可采集价格";
  if (status === "available_no_iap") return "确认无订阅";
  if (status === "available_unmatched_items") return "发现未识别套餐";
  if (status === "not_available") return "未上架";
  if (status === "blocked") return "访问受限";
  if (status === "unknown_error") return "检查异常";
  return status || "未知";
}

export function availabilityClassName(status: string | null) {
  if (status === "available_with_prices") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "available_no_iap") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (
    status === "available_unmatched_items" ||
    status === "blocked" ||
    status === "unknown_error"
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function diagnosisLabel(diagnosis: string | null) {
  if (diagnosis === "price_hints_found") return "发现价格线索";
  if (diagnosis === "login_required") return "需要登录";
  if (diagnosis === "no_price_hints") return "未识别价格";
  if (diagnosis === "snapshot_ok") return "网页快照正常";
  return diagnosis || null;
}

export function diagnosisClassName(diagnosis: string | null) {
  if (diagnosis === "price_hints_found") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (diagnosis === "login_required") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (diagnosis === "no_price_hints") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (diagnosis === "snapshot_ok") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function collectorLabel(kind: string | null) {
  if (kind === "app_store") return "App Store";
  if (kind === "google_play") return "Google Play";
  if (kind === "pricing_page") return "定价页";
  if (kind === "official_site") return "官网";
  return kind || "未指定";
}

export function sourceTypeLabel(type: string | null) {
  if (type === "official_page") return "官网";
  if (type === "app_store") return "App Store";
  if (type === "google_play") return "Google Play";
  if (type === "manual") return "手动来源";
  return type || "未知来源";
}

export function shortText(value: string | null, fallback = "暂无摘要") {
  if (!value) return fallback;
  return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}

export function collectorRunOutput({
  status,
  error,
  output,
  processId,
  runnerState,
}: {
  status: string;
  error: string | null;
  output: string | null;
  processId: string | null;
  runnerState: string | null;
}) {
  if (error) return shortText(error);
  if (output) return shortText(output);

  if (status === "running") {
    if (processId) {
      return `脚本进程 ${processId} 正在运行，完成后会写回结果。`;
    }

    if (runnerState === "queued_from_admin") {
      return "已创建运行记录，正在唤起后台脚本。超过 3 分钟未接管会自动标记失败。";
    }

    return "正在等待后台脚本写回结果。";
  }

  return "暂无摘要";
}

export function isManuallyQueued(job: JobRow) {
  return isManuallyQueuedAppStoreJob(job);
}

export function isAppStoreRunning(job: JobRow) {
  return isRunningAppStoreJob(job);
}

export function dateValue(value: Date | string | null) {
  if (!value) return 0;
  return (value instanceof Date ? value : new Date(value)).getTime();
}

export function uniqueLabels(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

export function groupCollectorJobs(jobs: JobRow[]) {
  const groups = new Map<string, ProductJobGroup>();

  for (const job of jobs) {
    const key = job.product_id || job.product_slug || job.id;
    const existing = groups.get(key);
    const hasLatestRun = Boolean(job.latest_run_started_at || job.last_run_at);

    if (!existing) {
      groups.set(key, {
        productId: key,
        productName: job.product_name,
        productSlug: job.product_slug,
        productStatus: job.product_status,
        jobs: [job],
        latestJob: hasLatestRun ? job : null,
        hasQueuedJob: isManuallyQueued(job),
        hasRunningJob: job.latest_run_status === "running",
        hasAppStoreRunningJob: isAppStoreRunning(job),
        hasFailedJob: job.status === "failed" || job.latest_run_status === "failed",
        activeJobCount: job.status === "active" ? 1 : 0,
        sourceLabels: uniqueLabels([
          collectorLabel(job.collector_kind),
          sourceTypeLabel(job.source_type),
        ]),
        publishedPriceCount: job.published_price_count,
        pendingObservationCount: job.pending_observation_count,
        approvedObservationCount: job.approved_observation_count,
        recentAppStoreObservationCount: job.recent_app_store_observation_count,
        successCount: job.success_count,
        errorCount: job.error_count,
        nextRunAt: job.status === "active" ? job.next_run_at : null,
      });
      continue;
    }

    existing.jobs.push(job);
    existing.hasQueuedJob = existing.hasQueuedJob || isManuallyQueued(job);
    existing.hasRunningJob = existing.hasRunningJob || job.latest_run_status === "running";
    existing.hasAppStoreRunningJob = existing.hasAppStoreRunningJob || isAppStoreRunning(job);
    existing.hasFailedJob =
      existing.hasFailedJob || job.status === "failed" || job.latest_run_status === "failed";
    existing.activeJobCount += job.status === "active" ? 1 : 0;
    existing.sourceLabels = uniqueLabels([
      ...existing.sourceLabels,
      collectorLabel(job.collector_kind),
      sourceTypeLabel(job.source_type),
    ]);
    existing.publishedPriceCount = Math.max(
      existing.publishedPriceCount,
      job.published_price_count
    );
    existing.pendingObservationCount = Math.max(
      existing.pendingObservationCount,
      job.pending_observation_count
    );
    existing.approvedObservationCount = Math.max(
      existing.approvedObservationCount,
      job.approved_observation_count
    );
    existing.recentAppStoreObservationCount = Math.max(
      existing.recentAppStoreObservationCount,
      job.recent_app_store_observation_count
    );
    existing.successCount += job.success_count;
    existing.errorCount += job.error_count;
    if (
      job.status === "active" &&
      (!existing.nextRunAt || dateValue(job.next_run_at) < dateValue(existing.nextRunAt))
    ) {
      existing.nextRunAt = job.next_run_at;
    }

    const latestCurrent = dateValue(
      existing.latestJob?.latest_run_started_at || existing.latestJob?.last_run_at || null
    );
    const latestCandidate = dateValue(job.latest_run_started_at || job.last_run_at);
    if (latestCandidate > latestCurrent) {
      existing.latestJob = job;
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.hasRunningJob !== b.hasRunningJob) return a.hasRunningJob ? -1 : 1;
    if (a.hasQueuedJob !== b.hasQueuedJob) return a.hasQueuedJob ? -1 : 1;
    if (a.hasFailedJob !== b.hasFailedJob) return a.hasFailedJob ? -1 : 1;
    if (a.pendingObservationCount !== b.pendingObservationCount) {
      return b.pendingObservationCount - a.pendingObservationCount;
    }
    return (
      dateValue(b.latestJob?.latest_run_started_at || b.latestJob?.last_run_at || null) -
      dateValue(a.latestJob?.latest_run_started_at || a.latestJob?.last_run_at || null)
    );
  });
}

export function productPublishLabel(group: ProductJobGroup) {
  if (group.publishedPriceCount > 0) return "已入正式库";
  if (group.pendingObservationCount > 0) return "待审核";
  if (group.approvedObservationCount > 0) return "已通过，待同步";
  return "未采集";
}

export function productPublishClassName(group: ProductJobGroup) {
  if (group.publishedPriceCount > 0) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (group.pendingObservationCount > 0) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function productActionLabel(group: ProductJobGroup) {
  if (group.hasAppStoreRunningJob) return "正在采集";
  if (group.hasQueuedJob) return "已排队";
  return "只采这个产品";
}

export function autoReviewSummary(group: ProductJobGroup) {
  if (group.pendingObservationCount === 0 && group.publishedPriceCount > 0) {
    return `已进入正式价格库：${group.publishedPriceCount} 条价格。`;
  }

  if (group.recentAppStoreObservationCount >= 3) {
    return "App Store 样本已满 3 次。稳定一致会自动通过，异常会留在审核中心。";
  }

  if (group.recentAppStoreObservationCount > 0) {
    return `等待满 3 次 App Store 稳定样本，当前 ${group.recentAppStoreObservationCount} 次。`;
  }

  return "还没有可用于自动审核的 App Store 样本。";
}

