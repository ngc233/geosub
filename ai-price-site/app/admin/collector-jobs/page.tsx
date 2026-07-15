import Link from "next/link";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import { prisma } from "../../../lib/prisma";
import CollectorRunTimeline, { CollectorRunOutcomeSummary } from "../review/CollectorRunTimeline";
import { reconcileStaleCollectorRuns } from "../review/collection-runner";
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";
import {
  pauseCollectorJob,
  runCollectorJobNow,
} from "./actions";
import {
  isManuallyQueuedAppStoreJob,
  isRunningAppStoreJob,
} from "./job-state";

export const dynamic = "force-dynamic";

type JobRow = {
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
  published_price_count: number;
  pending_observation_count: number;
  approved_observation_count: number;
  recent_app_store_observation_count: number;
  is_due: boolean;
  queue_pending: boolean;
};

type RunRow = {
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

type AvailabilityRow = {
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

type ProductJobGroup = {
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
};

function formatDate(value: Date | string | null) {
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

function formatDuration(value: number | null) {
  if (!value) return "未记录";
  if (value < 1000) return `${value} 毫秒`;
  return `${Math.round(value / 1000)} 秒`;
}

function formatRunDuration(row: {
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

function statusLabel(status: string | null) {
  if (status === "active") return "启用";
  if (status === "paused") return "暂停";
  if (status === "failed") return "失败";
  if (status === "archived") return "归档";
  if (status === "running") return "运行中";
  if (status === "succeeded") return "成功";
  if (status === "skipped") return "跳过";
  return status || "未知";
}

function statusClassName(status: string | null) {
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

function availabilityLabel(status: string | null) {
  if (status === "available_with_prices") return "可采集价格";
  if (status === "available_no_iap") return "无订阅价格";
  if (status === "not_available") return "未上架";
  if (status === "blocked") return "访问受限";
  if (status === "unknown_error") return "检查异常";
  return status || "未知";
}

function availabilityClassName(status: string | null) {
  if (status === "available_with_prices") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "available_no_iap") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "blocked" || status === "unknown_error") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function diagnosisLabel(diagnosis: string | null) {
  if (diagnosis === "price_hints_found") return "发现价格线索";
  if (diagnosis === "login_required") return "需要登录";
  if (diagnosis === "no_price_hints") return "未识别价格";
  if (diagnosis === "snapshot_ok") return "网页快照正常";
  return diagnosis || null;
}

function diagnosisClassName(diagnosis: string | null) {
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

function collectorLabel(kind: string | null) {
  if (kind === "app_store") return "App Store";
  if (kind === "google_play") return "Google Play";
  if (kind === "pricing_page") return "定价页";
  if (kind === "official_site") return "官网";
  return kind || "未指定";
}

function sourceTypeLabel(type: string | null) {
  if (type === "official_page") return "官网";
  if (type === "app_store") return "App Store";
  if (type === "google_play") return "Google Play";
  if (type === "manual") return "手动来源";
  return type || "未知来源";
}

function shortText(value: string | null, fallback = "暂无摘要") {
  if (!value) return fallback;
  return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}

function collectorRunOutput({
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

function isManuallyQueued(job: JobRow) {
  return isManuallyQueuedAppStoreJob(job);
}

function isAppStoreRunning(job: JobRow) {
  return isRunningAppStoreJob(job);
}

function dateValue(value: Date | string | null) {
  if (!value) return 0;
  return (value instanceof Date ? value : new Date(value)).getTime();
}

function uniqueLabels(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function groupCollectorJobs(jobs: JobRow[]) {
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

function productPublishLabel(group: ProductJobGroup) {
  if (group.publishedPriceCount > 0) return "已入正式库";
  if (group.pendingObservationCount > 0) return "待审核";
  if (group.approvedObservationCount > 0) return "已通过，待同步";
  return "未采集";
}

function productPublishClassName(group: ProductJobGroup) {
  if (group.publishedPriceCount > 0) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (group.pendingObservationCount > 0) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function productActionLabel(group: ProductJobGroup) {
  if (group.hasAppStoreRunningJob) return "正在采集";
  if (group.hasQueuedJob) return "已排队";
  return "只采这个产品";
}

function autoReviewSummary(group: ProductJobGroup) {
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

export default async function CollectorJobsPage() {
  await reconcileStaleCollectorRuns();

  const [jobs, runs, availabilityChecks] = await Promise.all([
    prisma.$queryRaw<JobRow[]>`
      WITH job_scope AS (
        SELECT
          job.id,
          job.product_id,
          product.name AS product_name,
          product.slug AS product_slug,
          product.status::text AS product_status,
          source.name AS source_name,
          source.type::text AS source_type,
          job.job_type,
          job.schedule,
          job.status,
          job.next_run_at,
          job.last_run_at,
          job.success_count,
          job.error_count,
          job.last_error,
          job.priority,
          job.job_config,
          job.updated_at,
          job.created_at,
          candidate.name AS discovery_candidate_name
        FROM collector_jobs job
        JOIN products product ON product.id = job.product_id
        LEFT JOIN price_sources source ON source.id = job.source_id
        LEFT JOIN product_discovery_candidates candidate ON candidate.id = job.discovery_candidate_id
        WHERE job.status <> 'archived'
        ORDER BY
          CASE job.status
            WHEN 'failed' THEN 1
            WHEN 'active' THEN 2
            WHEN 'paused' THEN 3
            ELSE 4
          END,
          job.priority DESC,
          job.next_run_at NULLS FIRST,
          job.created_at DESC
        LIMIT 160
      ),
      published_price_state AS (
        SELECT
          price.product_id,
          COUNT(*) FILTER (
            WHERE price.status = 'published'::publish_status
          )::int AS published_price_count
        FROM region_prices price
        JOIN (SELECT DISTINCT product_id FROM job_scope WHERE product_id IS NOT NULL) scoped_product
          ON scoped_product.product_id = price.product_id
        GROUP BY price.product_id
      ),
      observation_state AS (
        SELECT
          observation.product_id,
          COUNT(*) FILTER (
            WHERE observation.status = 'pending'::observation_status
          )::int AS pending_observation_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'approved'::observation_status
          )::int AS approved_observation_count,
          COUNT(*) FILTER (
            WHERE observation.billing_platform = 'ios'::billing_platform
              AND observation.observed_at >= NOW() - INTERVAL '14 days'
          )::int AS recent_app_store_observation_count
        FROM price_observations observation
        JOIN (SELECT DISTINCT product_id FROM job_scope WHERE product_id IS NOT NULL) scoped_product
          ON scoped_product.product_id = observation.product_id
        GROUP BY observation.product_id
      )
      SELECT
        job.id::text,
        job.product_id::text,
        job.product_name,
        job.product_slug,
        job.product_status,
        job.source_name,
        job.source_type,
        job.job_type,
        job.schedule,
        job.status,
        job.next_run_at,
        job.last_run_at,
        job.success_count,
        job.error_count,
        job.last_error,
        job.priority,
        job.job_config ->> 'collector_kind' AS collector_kind,
        job.discovery_candidate_name,
        latest_runs.status AS latest_run_status,
        latest_runs.started_at AS latest_run_started_at,
        latest_runs.error_message AS latest_run_error,
        latest_runs.output_excerpt AS latest_run_output,
        latest_runs.raw_payload ->> 'diagnosis' AS latest_run_diagnosis,
        latest_runs.raw_payload ->> 'state' AS latest_runner_state,
        latest_runs.raw_payload ->> 'pid' AS latest_process_id,
        CASE
          WHEN latest_runs.started_at IS NULL THEN NULL
          ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(latest_runs.finished_at, NOW()) - latest_runs.started_at)))::int
        END AS latest_run_age_seconds,
        COALESCE(published_price_state.published_price_count, 0)::int AS published_price_count,
        COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
        COALESCE(observation_state.approved_observation_count, 0)::int AS approved_observation_count,
        COALESCE(observation_state.recent_app_store_observation_count, 0)::int AS recent_app_store_observation_count,
        (
          job.status = 'active'
          AND (
            job.next_run_at IS NULL
            OR job.next_run_at <= NOW()
          )
        ) AS is_due,
        (
          job.status = 'active'
          AND job.priority >= 100
          AND (
            job.next_run_at IS NULL
            OR job.next_run_at <= NOW()
          )
          AND (
            latest_runs.started_at IS NULL
            OR job.updated_at > latest_runs.started_at
          )
        ) AS queue_pending
      FROM job_scope job
      LEFT JOIN LATERAL (
        SELECT
          run.status,
          run.started_at,
          run.finished_at,
          run.error_message,
          run.output_excerpt,
          run.raw_payload
        FROM collector_job_runs run
        WHERE run.job_id = job.id
        ORDER BY run.started_at DESC
        LIMIT 1
      ) latest_runs ON TRUE
      LEFT JOIN published_price_state ON published_price_state.product_id = job.product_id
      LEFT JOIN observation_state ON observation_state.product_id = job.product_id
      ORDER BY
        CASE job.status
          WHEN 'failed' THEN 1
          WHEN 'active' THEN 2
          WHEN 'paused' THEN 3
          ELSE 4
        END,
        job.priority DESC,
        job.next_run_at NULLS FIRST,
        job.created_at DESC
      LIMIT 160
    `,
    prisma.$queryRaw<RunRow[]>`
      SELECT
        run.id::text,
        run.job_id::text,
        product.slug AS product_slug,
        product.name AS product_name,
        source.name AS source_name,
        run.status,
        run.collector_kind,
        run.started_at,
        run.finished_at,
        run.duration_ms,
        run.error_message,
        run.output_excerpt,
        run.raw_payload ->> 'diagnosis' AS diagnosis
        ,
        run.raw_payload ->> 'pid' AS process_id,
        run.raw_payload ->> 'state' AS runner_state,
        GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(run.finished_at, NOW()) - run.started_at)))::int AS run_age_seconds,
        COALESCE(observation_outcome.observed_count, 0)::int AS observed_count,
        COALESCE(observation_outcome.pending_observation_count, 0)::int AS pending_observation_count,
        COALESCE(observation_outcome.approved_observation_count, 0)::int AS approved_observation_count,
        COALESCE(observation_outcome.rejected_observation_count, 0)::int AS rejected_observation_count,
        COALESCE(observation_outcome.ignored_observation_count, 0)::int AS ignored_observation_count,
        COALESCE(observation_outcome.anomaly_observation_count, 0)::int AS anomaly_observation_count,
        COALESCE(published_outcome.published_price_count, 0)::int AS published_price_count
      FROM collector_job_runs run
      LEFT JOIN products product ON product.id = run.product_id
      LEFT JOIN price_sources source ON source.id = run.source_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(observation.id)::int AS observed_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'pending'::observation_status
          )::int AS pending_observation_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'approved'::observation_status
          )::int AS approved_observation_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'rejected'::observation_status
          )::int AS rejected_observation_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'ignored'::observation_status
          )::int AS ignored_observation_count,
          COUNT(*) FILTER (
            WHERE COALESCE(observation.anomaly_flag, FALSE)
          )::int AS anomaly_observation_count
        FROM price_observations observation
        WHERE run.product_id IS NOT NULL
          AND observation.product_id = run.product_id
          AND (
            run.source_id IS NULL
            OR observation.source_id IS NULL
            OR observation.source_id = run.source_id
          )
          AND observation.observed_at >= run.started_at - INTERVAL '2 minutes'
          AND observation.observed_at <= LEAST(
            COALESCE(run.finished_at, NOW()) + INTERVAL '10 minutes',
            run.started_at + INTERVAL '2 hours'
          )
      ) observation_outcome ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(price.id)::int AS published_price_count
        FROM region_prices price
        WHERE run.product_id IS NOT NULL
          AND price.product_id = run.product_id
          AND (
            run.source_id IS NULL
            OR price.primary_source_id IS NULL
            OR price.primary_source_id = run.source_id
          )
          AND price.status = 'published'::publish_status
          AND price.last_checked_at >= run.started_at - INTERVAL '2 minutes'
          AND price.last_checked_at <= LEAST(
            COALESCE(run.finished_at, NOW()) + INTERVAL '10 minutes',
            run.started_at + INTERVAL '2 hours'
          )
      ) published_outcome ON TRUE
      ORDER BY run.started_at DESC
      LIMIT 50
    `,
    prisma.$queryRaw<AvailabilityRow[]>`
      SELECT
        availability.id::text,
        availability.product_name,
        availability.product_slug,
        availability.country_code,
        availability.country_name_zh,
        availability.status,
        availability.source_name,
        availability.item_count,
        availability.subscription_item_count,
        availability.ignored_item_count,
        availability.reason,
        availability.checked_at
      FROM app_store_availability_latest_view availability
      ORDER BY availability.checked_at DESC, availability.product_name, availability.country_code
      LIMIT 80
    `,
  ]);

  const productGroups = groupCollectorJobs(jobs);
  const activeCount = jobs.filter((job) => job.status === "active").length;
  const runningProductCount = productGroups.filter((group) => group.hasRunningJob).length;
  const queuedProductCount = productGroups.filter((group) => group.hasQueuedJob).length;
  const failedProductCount = productGroups.filter((group) => group.hasFailedJob).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="采集系统"
        title="产品采集状态中心"
        description="这里按产品展示采集、自动审核和正式入库状态。日常只需要点某个产品的采集按钮；底层任务留在展开详情里排查。"
      />

      <AdminPipelineSteps currentStep="collector" />

      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
        主流程是：线索入库 → 生成产品采集任务 → 按产品触发采集 → 自动审核稳定价格 → 写入正式价格库。
        价格审核入口仍在{" "}
        <Link href="/admin/review" className="font-bold underline underline-offset-4">
          审核中心
        </Link>
        ，这里负责看后台到底有没有排队、运行和产出。
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminStatCard
          label="产品数"
          value={productGroups.length}
          helper="按产品聚合后的采集对象。"
        />
        <AdminStatCard
          label="运行中"
          value={runningProductCount}
          helper="已有后台运行记录，等待完成即可。"
        />
        <AdminStatCard
          label="已排队"
          value={queuedProductCount}
          helper="下一轮执行器会优先处理。"
        />
        <AdminStatCard
          label="异常产品"
          value={failedProductCount}
          helper="底层任务或最近运行失败。"
        />
      </div>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">产品采集列表</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              一个产品只保留一个主要按钮。系统会汇总它下面的 App Store、官网或定价页任务，不再把几十页底层记录直接摊开。
            </p>
          </div>
          <p className="text-xs text-slate-400">
            当前启用底层任务 {activeCount} 个，列表最多展示最近和高优先级的 160 个任务。
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">任务来源</th>
                <th className="px-4 py-3 font-medium">入库状态</th>
                <th className="px-4 py-3 font-medium">最近采集</th>
                <th className="px-4 py-3 font-medium">自动审核</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {productGroups.map((group) => (
                <tr key={group.productId} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{group.productName}</div>
                    <div className="mt-1 text-xs text-slate-500">{group.productSlug}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.hasRunningJob ? (
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                          运行中
                        </span>
                      ) : null}
                      {group.hasQueuedJob ? (
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                          已排队
                        </span>
                      ) : null}
                      {group.hasFailedJob ? (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                          有异常
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex max-w-[260px] flex-wrap gap-2">
                      {group.sourceLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      共 {group.jobs.length} 个底层任务，启用 {group.activeJobCount} 个
                    </div>
                    <details className="mt-3 text-xs text-slate-500">
                      <summary className="cursor-pointer font-semibold text-slate-700">
                        查看底层任务
                      </summary>
                      <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                        {group.jobs.map((job) => (
                          <div
                            key={job.id}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {collectorLabel(job.collector_kind)}
                                </div>
                                <div className="mt-1 text-slate-400">
                                  {job.source_name || "未绑定来源"} · {sourceTypeLabel(job.source_type)}
                                </div>
                              </div>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusClassName(job.status)}`}
                              >
                                {statusLabel(job.status)}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-1 text-slate-500 md:grid-cols-2">
                              <span>下次：{formatDate(job.next_run_at)}</span>
                              <span>上次：{formatDate(job.last_run_at)}</span>
                            </div>
                            {job.last_error ? (
                              <p className="mt-2 leading-5 text-red-600">{job.last_error}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <form action={runCollectorJobNow}>
                                <input type="hidden" name="id" value={job.id} />
                                <button
                                  type="submit"
                                  disabled={isManuallyQueued(job) || job.latest_run_status === "running"}
                                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  {isManuallyQueued(job) ? "已排队" : "加入下一轮"}
                                </button>
                              </form>
                              {job.status !== "paused" ? (
                                <form action={pauseCollectorJob}>
                                  <input type="hidden" name="id" value={job.id} />
                                  <button
                                    type="submit"
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                  >
                                    暂停
                                  </button>
                                </form>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${productPublishClassName(group)}`}
                    >
                      {productPublishLabel(group)}
                    </span>
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      正式价格 {group.publishedPriceCount} 条
                      <br />
                      待审核 {group.pendingObservationCount} 条
                      <br />
                      已通过样本 {group.approvedObservationCount} 条
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {group.latestJob?.latest_run_status ? (
                      <>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusClassName(group.latestJob.latest_run_status)}`}
                        >
                          {statusLabel(group.latestJob.latest_run_status)}
                        </span>
                        <div className="mt-1 text-xs text-slate-400">
                          {formatDate(group.latestJob.latest_run_started_at)}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          成功 {group.successCount} / 失败 {group.errorCount}
                        </div>
                        {diagnosisLabel(group.latestJob.latest_run_diagnosis) ? (
                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${diagnosisClassName(group.latestJob.latest_run_diagnosis)}`}
                            >
                              {diagnosisLabel(group.latestJob.latest_run_diagnosis)}
                            </span>
                          </div>
                        ) : null}
                        <div className="mt-2 max-w-[320px] text-xs leading-5 text-slate-400">
                          {shortText(
                            collectorRunOutput({
                              status: group.latestJob.latest_run_status,
                              error: group.latestJob.latest_run_error,
                              output: group.latestJob.latest_run_output,
                              processId: group.latestJob.latest_process_id,
                              runnerState: group.latestJob.latest_runner_state,
                            })
                          )}
                        </div>
                        <div className="mt-3">
                          <CollectorRunTimeline
                            compact
                            run={{
                              status: group.latestJob.latest_run_status,
                              runner_state: group.latestJob.latest_runner_state,
                              process_id: group.latestJob.latest_process_id,
                              error_message: group.latestJob.latest_run_error,
                              output_excerpt: group.latestJob.latest_run_output,
                              duration_ms: null,
                              run_age_seconds: group.latestJob.latest_run_age_seconds,
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400">暂无运行记录</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[300px] text-xs leading-5 text-slate-600">
                      {autoReviewSummary(group)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ManualCollectionProgressForm
                        productSlug={group.productSlug}
                        buttonLabel={productActionLabel(group)}
                        pendingLabel="正在采集"
                        disabled={group.hasQueuedJob || group.hasAppStoreRunningJob}
                      />
                      <Link
                        href={`/admin/data-quality/${encodeURIComponent(group.productSlug)}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        数据诊断
                      </Link>
                      <Link
                        href={`/admin/products/${group.productId}/edit`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        编辑
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {productGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-lg">
                      <h3 className="text-base font-bold text-slate-950">
                        还没有可采集任务
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        先在线索入口把候选服务加入服务库，系统会自动生成对应采集任务。
                      </p>
                      <div className="mt-5 flex justify-center">
                        <Link
                          href="/admin/discovery"
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          去线索入口生成任务
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">最近采集运行</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              这里显示脚本是否真的跑过。运行中的任务会先出现，完成后会补上耗时和输出摘要。
            </p>
          </div>
          <Link
            href="/admin/review"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            去审核中心
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">开始时间</th>
                <th className="px-4 py-3 font-medium">耗时</th>
                <th className="px-4 py-3 font-medium">输出</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {runs.map((run) => (
                <tr key={run.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">
                      {run.product_name || "未知产品"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{run.product_slug || run.job_id}</div>
                    {run.product_slug ? (
                      <Link
                        href={`/admin/data-quality/${encodeURIComponent(run.product_slug)}`}
                        className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        数据诊断
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {collectorLabel(run.collector_kind)}
                    </span>
                    {run.source_name ? (
                      <div className="mt-2 text-xs text-slate-400">{run.source_name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClassName(run.status)}`}
                    >
                      {statusLabel(run.status)}
                    </span>
                    {diagnosisLabel(run.diagnosis) ? (
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${diagnosisClassName(run.diagnosis)}`}
                        >
                          {diagnosisLabel(run.diagnosis)}
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {formatDate(run.started_at)}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {formatRunDuration(run)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[520px] text-xs leading-5 text-slate-500">
                      {collectorRunOutput({
                        status: run.status,
                        error: run.error_message,
                        output: run.output_excerpt,
                        processId: run.process_id,
                        runnerState: run.runner_state,
                      })}
                    </div>
                    <div className="mt-3">
                      <CollectorRunTimeline compact run={run} />
                    </div>
                    <div className="mt-3">
                      <CollectorRunOutcomeSummary compact run={run} />
                    </div>
                  </td>
                </tr>
              ))}

              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    暂无采集运行记录。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">App Store 地区可用性</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            这里不是价格审核，而是解释每个国家为什么有价格、无价格或采集失败。
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">地区</th>
                <th className="px-4 py-3 font-medium">可用性</th>
                <th className="px-4 py-3 font-medium">采集项</th>
                <th className="px-4 py-3 font-medium">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {availabilityChecks.map((check) => (
                <tr key={check.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {formatDate(check.checked_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{check.product_name}</div>
                    <div className="mt-1 text-xs text-slate-400">{check.product_slug}</div>
                    <Link
                      href={`/admin/data-quality/${encodeURIComponent(check.product_slug)}`}
                      className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      数据诊断
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-700">
                      {check.country_name_zh || check.country_code}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{check.country_code}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${availabilityClassName(check.status)}`}
                    >
                      {availabilityLabel(check.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs leading-5 text-slate-500">
                    总项 {check.item_count}
                    <br />
                    订阅 {check.subscription_item_count}
                    <br />
                    忽略 {check.ignored_item_count}
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[420px] text-xs leading-5 text-slate-500">
                      {shortText(check.reason, "暂无说明")}
                    </div>
                  </td>
                </tr>
              ))}

              {availabilityChecks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    暂无 App Store 可用性检查记录。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <div className="mt-6">
        <Link href="/admin" className="text-sm font-semibold text-slate-900 hover:text-blue-700">
          ← 返回运营驾驶舱
        </Link>
      </div>
    </div>
  );
}
