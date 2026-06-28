import Link from "next/link";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import { prisma } from "../../../lib/prisma";
import { pauseCollectorJob, runCollectorJobNow } from "./actions";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  product_name: string;
  product_slug: string;
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

export default async function CollectorJobsPage() {
  const [jobs, runs] = await Promise.all([
    prisma.$queryRaw<JobRow[]>`
      SELECT
        job.id::text,
        product.name AS product_name,
        product.slug AS product_slug,
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
        latest.status AS latest_run_status,
        latest.started_at AS latest_run_started_at,
        latest.error_message AS latest_run_error,
        latest.output_excerpt AS latest_run_output,
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
      LEFT JOIN LATERAL (
        SELECT status, started_at, error_message, output_excerpt
        FROM collector_job_runs
        WHERE job_id = job.id
        ORDER BY started_at DESC
        LIMIT 1
      ) latest ON TRUE
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
        run.output_excerpt
      FROM collector_job_runs run
      LEFT JOIN products product ON product.id = run.product_id
      LEFT JOIN price_sources source ON source.id = run.source_id
      ORDER BY run.started_at DESC
      LIMIT 50
    `,
  ]);

  const activeCount = jobs.filter((job) => job.status === "active").length;
  const failedCount = jobs.filter((job) => job.status === "failed").length;
  const pausedCount = jobs.filter((job) => job.status === "paused").length;
  const dueCount = jobs.filter((job) => job.is_due).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="COLLECTOR"
        title="采集任务"
        description="管理自动价格采集任务。后台只负责排队、暂停和查看结果，真正的浏览器采集由独立执行器完成，避免拖慢网站访问。"
      />

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
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          立即采集
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
                        “立即采集”是针对具体任务的操作。当前任务列表为空，所以暂时没有可执行按钮。先在发现中心把候选服务加入服务库，系统会自动生成对应的采集任务。
                      </p>
                      <div className="mt-5 flex justify-center">
                        <Link
                          href="/admin/discovery"
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          去发现中心生成任务
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
