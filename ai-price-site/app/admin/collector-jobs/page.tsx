import Link from "next/link";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import { prisma } from "../../../lib/prisma";
import { pauseCollectorJob, runCollectorJobNow, runProductCollectorJobsNow } from "./actions";

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
  published_price_count: number;
  pending_observation_count: number;
  approved_observation_count: number;
  recent_app_store_observation_count: number;
  is_due: boolean;
};

type RunRow = {
  id: string;
  job_id: string;
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

function statusLabel(status: string | null) {
  if (status === "active") return "启用";
  if (status === "paused") return "暂停";
  if (status === "failed") return "失败";
  if (status === "archived") return "归档";
  if (status === "succeeded") return "成功";
  if (status === "skipped") return "跳过";
  return status || "未知";
}

function statusClassName(status: string | null) {
  if (status === "active" || status === "succeeded") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
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

  if (status === "not_available") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
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

function shortText(value: string | null, fallback = "暂无") {
  if (!value) return fallback;
  return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}

function isManuallyQueued(job: JobRow) {
  return job.status === "active" && job.is_due && job.priority >= 100;
}

type ProductJobGroup = {
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: string | null;
  jobs: JobRow[];
  latestJob: JobRow | null;
  hasQueuedJob: boolean;
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

    if (!existing) {
      groups.set(key, {
        productId: key,
        productName: job.product_name,
        productSlug: job.product_slug,
        productStatus: job.product_status,
        jobs: [job],
        latestJob: job.latest_run_started_at || job.last_run_at ? job : null,
        hasQueuedJob: isManuallyQueued(job),
        hasFailedJob: job.status === "failed" || job.latest_run_status === "failed",
        activeJobCount: job.status === "active" ? 1 : 0,
        sourceLabels: uniqueLabels([collectorLabel(job.collector_kind), sourceTypeLabel(job.source_type)]),
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
    existing.hasFailedJob = existing.hasFailedJob || job.status === "failed" || job.latest_run_status === "failed";
    existing.activeJobCount += job.status === "active" ? 1 : 0;
    existing.sourceLabels = uniqueLabels([
      ...existing.sourceLabels,
      collectorLabel(job.collector_kind),
      sourceTypeLabel(job.source_type),
    ]);
    existing.publishedPriceCount = Math.max(existing.publishedPriceCount, job.published_price_count);
    existing.pendingObservationCount = Math.max(existing.pendingObservationCount, job.pending_observation_count);
    existing.approvedObservationCount = Math.max(existing.approvedObservationCount, job.approved_observation_count);
    existing.recentAppStoreObservationCount = Math.max(
      existing.recentAppStoreObservationCount,
      job.recent_app_store_observation_count
    );
    existing.successCount += job.success_count;
    existing.errorCount += job.error_count;

    const latestCurrent = dateValue(existing.latestJob?.latest_run_started_at || existing.latestJob?.last_run_at || null);
    const latestCandidate = dateValue(job.latest_run_started_at || job.last_run_at);
    if (latestCandidate > latestCurrent) {
      existing.latestJob = job;
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.hasFailedJob !== b.hasFailedJob) return a.hasFailedJob ? -1 : 1;
    if (a.hasQueuedJob !== b.hasQueuedJob) return a.hasQueuedJob ? -1 : 1;
    return dateValue(b.latestJob?.latest_run_started_at || b.latestJob?.last_run_at || null) -
      dateValue(a.latestJob?.latest_run_started_at || a.latestJob?.last_run_at || null);
  });
}

function productPublishLabel(group: ProductJobGroup) {
  if (group.publishedPriceCount > 0) return "已采纳并上架";
  if (group.pendingObservationCount > 0) return "待审核";
  if (group.approvedObservationCount > 0) return "已通过，待同步";
  return "未采纳";
}

function productPublishClassName(group: ProductJobGroup) {
  if (group.publishedPriceCount > 0) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (group.pendingObservationCount > 0) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function autoReviewSummary(group: ProductJobGroup) {
  if (group.pendingObservationCount === 0 && group.publishedPriceCount > 0) {
    return `已进入正式价格库：${group.publishedPriceCount} 条价格。`;
  }

  if (group.recentAppStoreObservationCount >= 3) {
    return "App Store 样本已满 3 次；稳定一致会自动通过，异常会留在审核中心。";
  }

  if (group.recentAppStoreObservationCount > 0) {
    return `等待满 3 次 App Store 稳定样本；当前 ${group.recentAppStoreObservationCount} 次。`;
  }

  return "还没有可用于自动审核的 App Store 样本。";
}

export default async function CollectorJobsPage() {
  const [jobs, runs, availabilityChecks] = await Promise.all([
    prisma.$queryRaw<JobRow[]>`
      WITH latest_runs AS (
        SELECT *
        FROM (
          SELECT
            run.job_id,
            run.status,
            run.started_at,
            run.error_message,
            run.output_excerpt,
            run.raw_payload,
            ROW_NUMBER() OVER (
              PARTITION BY run.job_id
              ORDER BY run.started_at DESC
            ) AS row_number
          FROM collector_job_runs run
        ) ranked_runs
        WHERE row_number = 1
      ),
      published_price_state AS (
        SELECT
          product_id,
          COUNT(*) FILTER (
            WHERE status = 'published'::publish_status
          )::int AS published_price_count
        FROM region_prices
        GROUP BY product_id
      ),
      observation_state AS (
        SELECT
          product_id,
          COUNT(*) FILTER (
            WHERE status = 'pending'::observation_status
          )::int AS pending_observation_count,
          COUNT(*) FILTER (
            WHERE status = 'approved'::observation_status
          )::int AS approved_observation_count,
          COUNT(*) FILTER (
            WHERE billing_platform = 'ios'::billing_platform
              AND observed_at >= NOW() - INTERVAL '14 days'
          )::int AS recent_app_store_observation_count
        FROM price_observations
        GROUP BY product_id
      )
      SELECT
        job.id::text,
        job.product_id::text,
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
        job.job_config ->> 'collector_kind' AS collector_kind,
        candidate.name AS discovery_candidate_name,
        latest_runs.status AS latest_run_status,
        latest_runs.started_at AS latest_run_started_at,
        latest_runs.error_message AS latest_run_error,
        latest_runs.output_excerpt AS latest_run_output,
        latest_runs.raw_payload ->> 'diagnosis' AS latest_run_diagnosis,
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
        ) AS is_due
      FROM collector_jobs job
      JOIN products product ON product.id = job.product_id
      LEFT JOIN price_sources source ON source.id = job.source_id
      LEFT JOIN product_discovery_candidates candidate ON candidate.id = job.discovery_candidate_id
      LEFT JOIN latest_runs ON latest_runs.job_id = job.id
      LEFT JOIN published_price_state ON published_price_state.product_id = job.product_id
      LEFT JOIN observation_state ON observation_state.product_id = job.product_id
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
      LIMIT 100
    `,
    prisma.$queryRaw<RunRow[]>`
      SELECT
        run.id::text,
        run.job_id::text,
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
      FROM collector_job_runs run
      LEFT JOIN products product ON product.id = run.product_id
      LEFT JOIN price_sources source ON source.id = run.source_id
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

  const activeCount = jobs.filter((job) => job.status === "active").length;
  const failedCount = jobs.filter((job) => job.status === "failed").length;
  const pausedCount = jobs.filter((job) => job.status === "paused").length;
  const dueCount = jobs.filter((job) => job.is_due).length;
  const productGroups = groupCollectorJobs(jobs);

  return (
    <div>
      <AdminPageHeader
        eyebrow="技术详情"
        title="采集任务详情"
        description="这个页面保留给排错和查看执行日志。日常采集请回到“价格采集审核”页按产品操作。"
      />

      <AdminPipelineSteps currentStep="collector" />

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        普通操作入口已经合并到{" "}
        <Link href="/admin/review" className="font-bold underline underline-offset-4">
          价格采集审核
        </Link>
        。这里主要用于查看底层任务、失败原因和最近运行日志。
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminStatCard
          label="启用任务"
          value={activeCount}
          helper="会被执行器按计划读取。"
        />
        <AdminStatCard
          label="等待采集"
          value={dueCount}
          helper="已经到时间，下一轮会执行。"
        />
        <AdminStatCard
          label="失败任务"
          value={failedCount}
          helper="需要查看错误或重新触发。"
        />
        <AdminStatCard
          label="暂停任务"
          value={pausedCount}
          helper="不会自动执行。"
        />
      </div>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">产品采集列表</h2>
            <p className="mt-1 text-sm text-slate-500">
              按产品聚合展示。一个产品可能有 App Store、官网、定价页等多个底层任务，但这里统一成一个采集入口。
            </p>
          </div>
          <p className="text-xs text-slate-400">
            App Store 最近 3 次稳定样本一致会自动通过并写入正式价格库。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">来源任务</th>
                <th className="px-4 py-3 font-medium">采纳状态</th>
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
                    {group.hasQueuedJob ? (
                      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                        已排队，等待执行器
                      </span>
                    ) : null}
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
                    {group.hasFailedJob ? (
                      <div className="mt-2 text-xs font-medium text-red-600">
                        有任务失败，建议优先处理来源或重采。
                      </div>
                    ) : null}
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
                          {shortText(group.latestJob.latest_run_error || group.latestJob.latest_run_output)}
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
                      <form action={runProductCollectorJobsNow}>
                        <input type="hidden" name="productId" value={group.productId} />
                        <button
                          type="submit"
                          disabled={group.hasQueuedJob}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {group.hasQueuedJob ? "已排队" : "立即采集"}
                        </button>
                      </form>
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
                      <h3 className="text-base font-bold text-slate-950">还没有可采集任务</h3>
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

      <AdminCard className="hidden">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">任务列表</h2>
            <p className="mt-1 text-sm text-slate-500">
              最多显示 100 个未归档任务。失败任务会排在前面，方便优先处理。
            </p>
          </div>
          <p className="text-xs text-slate-400">
            手动点击“立即采集”后，执行器下一轮会优先处理。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">产品 / 来源</th>
                <th className="px-4 py-3 font-medium">采集器</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">最近结果</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {jobs.map((job) => (
                <tr key={job.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">
                      {job.product_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {job.product_slug}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {job.source_name || "未绑定来源"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {sourceTypeLabel(job.source_type)}
                    </div>
                    {job.discovery_candidate_name ? (
                      <div className="mt-2 text-xs text-emerald-700">
                        来自发现：{job.discovery_candidate_name}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-800">
                      {collectorLabel(job.collector_kind)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {job.job_type}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      优先级 {job.priority}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClassName(job.status)}`}
                    >
                      {statusLabel(job.status)}
                    </span>
                    <div className="mt-2 text-xs text-slate-500">
                      下次：{formatDate(job.next_run_at)}
                    </div>
                    {isManuallyQueued(job) ? (
                      <div className="mt-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                          已排队，等待执行器
                        </span>
                      </div>
                    ) : null}
                    <div className="mt-1 text-xs text-slate-400">
                      上次：{formatDate(job.last_run_at)}
                    </div>
                    {job.last_error ? (
                      <div className="mt-2 max-w-[260px] text-xs leading-5 text-red-600">
                        {job.last_error}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    {job.latest_run_status ? (
                      <>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusClassName(job.latest_run_status)}`}
                        >
                          {statusLabel(job.latest_run_status)}
                        </span>
                        <div className="mt-1 text-xs text-slate-400">
                          {formatDate(job.latest_run_started_at)}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          成功 {job.success_count} / 失败 {job.error_count}
                        </div>
                        {diagnosisLabel(job.latest_run_diagnosis) ? (
                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${diagnosisClassName(job.latest_run_diagnosis)}`}
                            >
                              {diagnosisLabel(job.latest_run_diagnosis)}
                            </span>
                          </div>
                        ) : null}
                        <div className="mt-2 max-w-[320px] text-xs leading-5 text-slate-400">
                          {shortText(job.latest_run_error || job.latest_run_output)}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400">
                        暂无运行记录
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <form action={runCollectorJobNow}>
                        <input type="hidden" name="id" value={job.id} />
                        <button
                          type="submit"
                          disabled={isManuallyQueued(job)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {isManuallyQueued(job) ? "已排队" : "加入下一轮采集"}
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
                  </td>
                </tr>
              ))}

              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-lg">
                      <h3 className="text-base font-bold text-slate-950">
                        还没有可采集任务
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        “立即采集”是针对具体任务的操作。当前任务列表为空，所以暂时没有可执行按钮。先在线索入口把候选服务加入服务库，系统会自动生成对应的采集任务。
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
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">
            App Store 地区可用性
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            这里不是价格审核，而是解释每个国家为什么有价格、没价格或采集失败。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
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
                    <div className="font-semibold text-slate-950">
                      {check.product_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {check.product_slug}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {check.source_name || "App Store"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">
                      {check.country_name_zh}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {check.country_code}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${availabilityClassName(check.status)}`}
                    >
                      {availabilityLabel(check.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs leading-5 text-slate-500">
                    <div>订阅 {check.subscription_item_count}</div>
                    <div>全部 {check.item_count}</div>
                    <div>忽略 {check.ignored_item_count}</div>
                  </td>
                  <td className="max-w-[420px] px-4 py-4 text-xs leading-5 text-slate-500">
                    {shortText(check.reason, "暂无说明")}
                  </td>
                </tr>
              ))}

              {availabilityChecks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    暂无可用性记录。App Store 采集器跑过一轮后，会显示每个地区的可用状态。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">最近运行记录</h2>
          <p className="mt-1 text-sm text-slate-500">
            显示最近 50 次采集执行结果，用来追踪执行器是否稳定。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">产品 / 来源</th>
                <th className="px-4 py-3 font-medium">结果</th>
                <th className="px-4 py-3 font-medium">输出</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {runs.map((run) => (
                <tr key={run.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">
                      {formatDate(run.started_at)}
                    </div>
                    {run.duration_ms !== null ? (
                      <div className="mt-1 text-xs text-slate-400">
                        {Math.round(run.duration_ms / 1000)} 秒
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-800">
                      {run.product_name || "未知产品"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {run.source_name || "未知来源"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {collectorLabel(run.collector_kind)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClassName(run.status)}`}
                    >
                      {statusLabel(run.status)}
                    </span>
                    {run.error_message ? (
                      <div className="mt-2 max-w-[320px] text-xs leading-5 text-red-600">
                        {run.error_message}
                      </div>
                    ) : null}
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
                  <td className="max-w-[420px] px-4 py-4 text-xs leading-5 text-slate-500">
                    {shortText(run.output_excerpt, "无输出")}
                  </td>
                </tr>
              ))}

              {runs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    暂无运行记录。采集执行器运行后，会写入这里。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
