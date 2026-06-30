import { prisma } from "../../../lib/prisma";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import ObservationReviewActions from "./ObservationReviewActions";
import { queueAppStoreCollectionAndReview } from "./actions";
import Link from "next/link";

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
  source_url: string | null;
  observed_at: Date | string;
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

export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ collectionQueued?: string; collectionRun?: string; page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const queuedCount =
    params.collectionQueued === undefined ? null : Number(params.collectionQueued);
  const collectionRun = params.collectionRun ?? null;
  const pendingPage = Math.max(1, Number(params.page ?? 1) || 1);
  const pendingPageSize = 25;
  const pendingOffset = (pendingPage - 1) * pendingPageSize;

  const pendingCountRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM pending_price_observations_view
    WHERE platform = 'ios'
  `;
  const pendingTotal = Number(pendingCountRows[0]?.count ?? 0);
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotal / pendingPageSize));

  const pendingRows = await prisma.$queryRaw<PendingRow[]>`
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
      review_note,
      source_url,
      observed_at
    FROM pending_price_observations_view
    WHERE platform = 'ios'
    ORDER BY observed_at DESC
    LIMIT ${pendingPageSize}
    OFFSET ${pendingOffset}
  `;

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
    LIMIT 50
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

  const approvedCount = historyRows.filter((row) => row.review_status === "approved").length;
  const ignoredCount = historyRows.filter((row) => row.review_status === "ignored").length;
  const rejectedCount = historyRows.filter((row) => row.review_status === "rejected").length;
  const collectorStatus = collectorStatusRows[0] ?? null;
  const pageHref = (page: number) => `/admin/review?page=${page}`;

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          采集流水线 · 第 3 步
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          价格审核
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          只处理采集后的价格观测。App Store 连续稳定样本会自动通过；异常、缺样本或冲突数据留给人工确认。
        </p>
      </header>

      <AdminPipelineSteps currentStep="review" />

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
            <p className="text-sm font-semibold text-slate-900">价格观测已接入审核中心</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              手动点击“立即补采并审核”会马上执行一次相关 App Store 采集；后台定时任务仍会按计划自动运行。为避免重复请求，手动执行有 2 分钟冷却。
            </p>
          </div>
        </div>
      </section>

      {queuedCount !== null ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {collectionRun === "succeeded"
            ? `已立即执行 ${queuedCount} 个 App Store 补采任务，并完成稳定性自动审核。`
            : collectionRun === "cooldown"
              ? "已收到补采请求，但相关任务 2 分钟内刚执行过，本次进入冷却保护。"
              : collectionRun === "failed"
                ? "补采任务已排队，但立即执行失败；后台定时任务仍会继续处理，请查看采集任务页的失败原因。"
              : `已处理 ${queuedCount} 个 App Store 补采任务。`}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">价格观测待审核</h2>
            <p className="mt-1 text-xs text-slate-500">
              仅显示 pending 状态的价格观测。当前第 {pendingPage} / {pendingTotalPages} 页，每页 {pendingPageSize} 条。
            </p>
            {collectorStatus ? (
              <p className="mt-2 text-xs text-slate-400">
                App Store 采集器：{collectorStatus.status}；下次执行 {formatDate(collectorStatus.next_run_at)}；最近结果 {collectorStatus.latest_run_status ?? "暂无"}。
              </p>
            ) : null}
          </div>
          <form action={queueAppStoreCollectionAndReview}>
            <button
              type="submit"
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            >
              立即补采并审核
            </button>
          </form>
        </div>

        {pendingRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            暂无待审核价格观测。
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
                  <th className="px-4 py-3 font-medium">美元</th>
                  <th className="px-4 py-3 font-medium">可信度</th>
                  <th className="px-4 py-3 font-medium">自动审核</th>
                  <th className="px-4 py-3 font-medium">来源</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pendingRows.map((row) => (
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
                        {formatLocal(row.observed_local_price, row.observed_currency)}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-950">
                      {formatUsd(row.observed_price_usd)}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {row.confidence_score ?? "—"}
                    </td>

                    <td className="max-w-[260px] px-4 py-3 text-xs leading-5 text-slate-500">
                      {row.review_note ? (
                        <span>{row.review_note}</span>
                      ) : (
                        <span className="text-slate-400">待规则判断</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.source_url ? (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          打开
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <ObservationReviewActions observationId={row.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pendingTotalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">共 {pendingTotal} 条待审核记录</div>
            <div className="flex items-center gap-2">
              <Link
                href={pageHref(Math.max(1, pendingPage - 1))}
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
                href={pageHref(Math.min(pendingTotalPages, pendingPage + 1))}
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
              显示最近 50 条已通过、已忽略或已拒绝记录。
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
      </section>
    </div>
  );
}
