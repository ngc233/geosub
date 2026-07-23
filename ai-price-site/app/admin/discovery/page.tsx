import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { AdminButton } from "../../../components/admin/AdminButton";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import {
  ignoreCandidate,
  promoteCandidate,
  queueDiscoverySourceScan,
  watchCandidate,
} from "./actions";
import { buildDiscoveryReviewRedirectPath } from "./discovery-redirect";
import DiscoveryIntakeForms from "./DiscoveryIntakeForms";

export const dynamic = "force-dynamic";

type CandidateRow = {
  id: string;
  name: string;
  suggested_slug: string | null;
  suggested_category: string;
  provider: string | null;
  official_url: string | null;
  app_store_url: string | null;
  google_play_url: string | null;
  pricing_url: string | null;
  source_type: string;
  source_name: string | null;
  source_url: string | null;
  discovery_reason: string | null;
  confidence_score: number;
  status: string;
  review_note: string | null;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  promoted_product_name: string | null;
  matched_product_name: string | null;
  collector_job_count: number;
};

type SourceRow = {
  id: string;
  name: string;
  source_type: string;
  url: string;
  category_hint: string | null;
  query: string | null;
  scan_interval_hours: number;
  status: string;
  reliability_score: number;
  strategy: string;
  promote_threshold: number;
  watch_threshold: number;
  last_checked_at: Date | string | null;
  last_success_at: Date | string | null;
  manual_scan_requested_at: Date | string | null;
  next_due_at: Date | string | null;
  is_due: boolean;
  last_error: string | null;
  note: string | null;
  latest_check_status: string | null;
  latest_check_changed: boolean | null;
  latest_check_kind: string | null;
  latest_importance_score: number | null;
  latest_check_title: string | null;
  latest_check_summary: string | null;
  latest_source_strategy: string | null;
  latest_trigger_url: string | null;
  latest_trigger_published_at: Date | string | null;
};

type CheckRow = {
  id: string;
  source_name: string;
  source_type: string;
  status: string;
  http_status: number | null;
  changed: boolean;
  change_kind: string | null;
  importance_score: number | null;
  matched_keywords: string[] | null;
  source_strategy: string | null;
  title: string | null;
  summary: string | null;
  trigger_url: string | null;
  trigger_published_at: Date | string | null;
  candidate_name: string | null;
  error_message: string | null;
  checked_at: Date | string;
};

function statusLabel(status: string) {
  if (status === "new") return "新候选";
  if (status === "watching") return "观察中";
  if (status === "promoted") return "已入库";
  if (status === "merged") return "已合并";
  if (status === "ignored") return "已忽略";
  return status;
}

function statusClassName(status: string) {
  if (status === "new") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "watching") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "promoted") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "merged") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (status === "ignored") return "bg-slate-100 text-slate-500 ring-slate-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function sourceLabel(sourceType: string) {
  if (sourceType === "manual_tip") return "人工线索";
  if (sourceType === "official_site") return "官网";
  if (sourceType === "app_store") return "App Store";
  if (sourceType === "google_play") return "Google Play";
  if (sourceType === "rss") return "RSS";
  if (sourceType === "search") return "搜索";
  if (sourceType === "competitor") return "竞品站";
  if (sourceType === "social") return "社媒";
  return "其他";
}

function categoryLabel(category: string) {
  if (category === "ai") return "AI 订阅";
  if (category === "streaming") return "流媒体";
  if (category === "software") return "软件订阅";
  if (category === "game") return "游戏";
  if (category === "gift_card") return "礼品卡";
  if (category === "vpn") return "网络工具";
  if (category === "payment") return "支付服务";
  return "其他";
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOptionalDate(value: Date | string | null) {
  if (!value) return "未检查";
  return formatDate(value);
}

function scoreClassName(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-slate-500";
}

function changeKindLabel(kind: string | null) {
  if (kind === "price_change") return "价格相关";
  if (kind === "new_model_or_plan") return "新模型/套餐";
  if (kind === "product_launch") return "新品发布";
  if (kind === "content_update") return "普通更新";
  if (kind === "no_change") return "无变化";
  return "未分类";
}

function changeKindClassName(kind: string | null) {
  if (kind === "price_change") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (kind === "new_model_or_plan") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (kind === "product_launch") return "bg-violet-50 text-violet-700 ring-violet-200";
  if (kind === "content_update") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (kind === "no_change") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-100 text-slate-500 ring-slate-200";
}

function strategyLabel(strategy: string | null) {
  if (strategy === "pricing_page") return "价格页";
  if (strategy === "announcement_feed") return "官方动态";
  if (strategy === "marketplace") return "应用市场";
  if (strategy === "competitor_page") return "竞品页";
  if (strategy === "search_result") return "搜索结果";
  return "自动判断";
}

function sourceQueueLabel(source: SourceRow) {
  if (source.manual_scan_requested_at) return "已加入队列";
  if (source.is_due) return "等待自动检查";
  if (source.next_due_at) return `下次：${formatDate(source.next_due_at)}`;
  return "等待首次检查";
}

function sourceQueueClassName(source: SourceRow) {
  if (source.manual_scan_requested_at) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (source.is_due) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function CandidateActions({ candidate }: { candidate: CandidateRow }) {
  if (["promoted", "merged", "ignored"].includes(candidate.status)) {
    const reviewHref = buildDiscoveryReviewRedirectPath({
      productSlug: candidate.suggested_slug || candidate.name,
      productName: candidate.promoted_product_name || candidate.matched_product_name || candidate.name,
      appStoreJobCount: candidate.collector_job_count,
    });

    return (
      <div className="space-y-2 text-xs leading-5 text-slate-500">
        {candidate.promoted_product_name ? (
          <div>已加入：{candidate.promoted_product_name}</div>
        ) : null}
        {candidate.matched_product_name ? (
          <div>已合并：{candidate.matched_product_name}</div>
        ) : null}
        {candidate.collector_job_count > 0 ? (
          <div className="rounded-lg bg-emerald-50 px-2 py-2 font-medium leading-5 text-emerald-800 ring-1 ring-emerald-100">
            已生成 {candidate.collector_job_count} 个采集任务。
            <Link href={reviewHref} className="mt-1 inline-flex font-semibold text-blue-700 underline underline-offset-4">
              去这个产品的采集工作台
            </Link>
          </div>
        ) : ["promoted", "merged"].includes(candidate.status) ? (
          <div className="rounded-lg bg-amber-50 px-2 py-2 font-medium leading-5 text-amber-800 ring-1 ring-amber-100">
            已入库，但还没有 App Store 采集任务。先到产品资料补 App Store 链接或应用 ID，再回来采集。
          </div>
        ) : null}
        {!candidate.promoted_product_name && !candidate.matched_product_name
          ? candidate.review_note || "已处理"
          : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <form action={promoteCandidate}>
        <input type="hidden" name="id" value={candidate.id} />
        <AdminButton type="submit" size="sm">
          加入并进入采集
        </AdminButton>
      </form>

      <form action={watchCandidate}>
        <input type="hidden" name="id" value={candidate.id} />
        <AdminButton type="submit" size="sm" variant="warning">
          标记观察
        </AdminButton>
      </form>

      <form action={ignoreCandidate}>
        <input type="hidden" name="id" value={candidate.id} />
        <AdminButton type="submit" size="sm" variant="secondary">
          忽略
        </AdminButton>
      </form>
    </div>
  );
}

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams?: Promise<{
    promotionError?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const [candidates, sources, recentChecks] = await Promise.all([
    prisma.$queryRaw<CandidateRow[]>`
      SELECT
        c.id::text,
        c.name,
        c.suggested_slug,
        c.suggested_category::text,
        c.provider,
        c.official_url,
        c.app_store_url,
        c.google_play_url,
        c.pricing_url,
        c.source_type::text,
        c.source_name,
        c.source_url,
        c.discovery_reason,
        c.confidence_score,
        c.status::text,
        c.review_note,
        c.first_seen_at,
        c.last_seen_at,
        promoted.name AS promoted_product_name,
        matched.name AS matched_product_name,
        (
          SELECT COUNT(*)::int
          FROM collector_jobs job
          WHERE job.discovery_candidate_id = c.id
            AND job.status <> 'archived'
        ) AS collector_job_count
      FROM product_discovery_candidates c
      LEFT JOIN products promoted ON promoted.id = c.promoted_product_id
      LEFT JOIN products matched ON matched.id = c.matched_product_id
      ORDER BY
        CASE c.status
          WHEN 'new' THEN 1
          WHEN 'watching' THEN 2
          WHEN 'promoted' THEN 3
          WHEN 'merged' THEN 4
          ELSE 5
        END,
        c.confidence_score DESC,
        c.last_seen_at DESC
    `,
    prisma.$queryRaw<SourceRow[]>`
      SELECT
        s.id::text,
        s.name,
        s.source_type::text,
        s.url,
        s.category_hint::text,
        s.query,
        s.scan_interval_hours,
        s.status::text,
        s.reliability_score,
        s.strategy,
        s.promote_threshold,
        s.watch_threshold,
        s.last_checked_at,
        s.last_success_at,
        s.manual_scan_requested_at,
        CASE
          WHEN s.last_checked_at IS NULL THEN NULL
          ELSE s.last_checked_at + (s.scan_interval_hours || ' hours')::interval
        END AS next_due_at,
        (
          s.status = 'active'::discovery_source_status
          AND (
            s.manual_scan_requested_at IS NOT NULL
            OR s.last_checked_at IS NULL
            OR s.last_checked_at <= NOW() - (s.scan_interval_hours || ' hours')::interval
          )
        ) AS is_due,
        s.last_error,
        s.note,
        latest.status AS latest_check_status,
        latest.changed AS latest_check_changed,
        latest.change_kind AS latest_check_kind,
        latest.importance_score AS latest_importance_score,
        latest.title AS latest_check_title,
        latest.summary AS latest_check_summary,
        latest.source_strategy AS latest_source_strategy,
        latest.trigger_url AS latest_trigger_url,
        latest.trigger_published_at AS latest_trigger_published_at
      FROM discovery_sources s
      LEFT JOIN LATERAL (
        SELECT status, changed, change_kind, importance_score, title, summary, source_strategy, trigger_url, trigger_published_at
        FROM discovery_source_checks
        WHERE source_id = s.id
        ORDER BY checked_at DESC
        LIMIT 1
      ) latest ON TRUE
      ORDER BY
        CASE s.status
          WHEN 'active' THEN 1
          WHEN 'paused' THEN 2
          ELSE 3
        END,
        s.reliability_score DESC,
        s.updated_at DESC
    `,
    prisma.$queryRaw<CheckRow[]>`
      SELECT
        c.id::text,
        s.name AS source_name,
        s.source_type::text AS source_type,
        c.status,
        c.http_status,
        c.changed,
        c.change_kind,
        c.importance_score,
        c.matched_keywords,
        c.source_strategy,
        c.title,
        c.summary,
        c.trigger_url,
        c.trigger_published_at,
        candidate.name AS candidate_name,
        c.error_message,
        c.checked_at
      FROM discovery_source_checks c
      JOIN discovery_sources s ON s.id = c.source_id
      LEFT JOIN product_discovery_candidates candidate ON candidate.id = c.candidate_id
      ORDER BY c.checked_at DESC
      LIMIT 30
    `,
  ]);

  const newCount = candidates.filter((candidate) => candidate.status === "new").length;
  const watchingCount = candidates.filter((candidate) => candidate.status === "watching").length;
  const handledCount = candidates.filter((candidate) =>
    ["promoted", "merged", "ignored"].includes(candidate.status)
  ).length;
  const highConfidenceCount = candidates.filter((candidate) => candidate.confidence_score >= 75).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="价格采集 · 第 1 步"
        title="线索入口"
        description="添加产品、官网或 App Store 线索。点击加入后，系统会创建或合并产品、尝试匹配 App Store，并直接带你进入这个产品的采集工作台。"
      />

      <AdminPipelineSteps currentStep="discovery" />

      {params.promotionError === "1" ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-800">
          加入服务库失败。请检查这条线索是否缺少名称、slug 或 App Store 链接，然后再试一次。
        </div>
      ) : null}

      <DiscoveryIntakeForms />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard>
          <div className="text-sm font-semibold text-slate-500">新候选</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{newCount}</div>
          <div className="mt-2 text-sm text-slate-500">等待判断是否上架。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-semibold text-slate-500">观察中</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{watchingCount}</div>
          <div className="mt-2 text-sm text-slate-500">暂不入库，但保留线索。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-semibold text-slate-500">高置信线索</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{highConfidenceCount}</div>
          <div className="mt-2 text-sm text-slate-500">优先审核，适合进入服务库。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-semibold text-slate-500">已处理</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{handledCount}</div>
          <div className="mt-2 text-sm text-slate-500">已加入、合并或忽略。</div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">候选产品池</h2>
          <p className="mt-1 text-sm text-slate-500">
            添加线索先进入候选池，不会立刻发布。点击“加入并进入采集”后，系统会创建或合并产品、自动匹配 App Store，并跳到价格采集审核页，只采这个产品。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">候选产品</th>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium">链接</th>
                <th className="px-4 py-3 font-medium">判断</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{candidate.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {candidate.suggested_slug || "未生成 slug"} / {categoryLabel(candidate.suggested_category)}
                    </div>
                    {candidate.provider ? <div className="mt-1 text-xs text-slate-400">{candidate.provider}</div> : null}
                    {candidate.collector_job_count > 0 ? (
                      <div className="mt-2 text-xs font-medium text-emerald-700">
                        已生成 {candidate.collector_job_count} 个采集任务
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-700">{sourceLabel(candidate.source_type)}</div>
                    <div className="mt-1 text-xs text-slate-500">{candidate.source_name || "未标注来源名"}</div>
                    <div className="mt-2 text-xs text-slate-400">发现：{formatDate(candidate.first_seen_at)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1 text-xs">
                      {candidate.official_url ? <a className="block font-medium text-blue-700 hover:text-blue-900" href={candidate.official_url} target="_blank" rel="noreferrer">官网</a> : null}
                      {candidate.pricing_url ? <a className="block font-medium text-blue-700 hover:text-blue-900" href={candidate.pricing_url} target="_blank" rel="noreferrer">定价页</a> : null}
                      {candidate.app_store_url ? <a className="block font-medium text-blue-700 hover:text-blue-900" href={candidate.app_store_url} target="_blank" rel="noreferrer">App Store</a> : null}
                      {candidate.google_play_url ? <a className="block font-medium text-blue-700 hover:text-blue-900" href={candidate.google_play_url} target="_blank" rel="noreferrer">Google Play</a> : null}
                      {!candidate.official_url && !candidate.pricing_url && !candidate.app_store_url && !candidate.google_play_url ? <span className="text-slate-400">暂无链接</span> : null}
                    </div>
                  </td>
                  <td className="max-w-[340px] px-4 py-4">
                    <div className={`text-sm font-semibold ${scoreClassName(candidate.confidence_score)}`}>
                      置信度 {candidate.confidence_score}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {candidate.discovery_reason || "暂无发现说明。"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClassName(candidate.status)}`}>
                      {statusLabel(candidate.status)}
                    </span>
                    {candidate.review_note ? <div className="mt-2 max-w-[220px] text-xs leading-5 text-slate-500">{candidate.review_note}</div> : null}
                  </td>
                  <td className="px-4 py-4">
                    <CandidateActions candidate={candidate} />
                  </td>
                </tr>
              ))}
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    暂无候选产品。后续自动发现任务会把线索写入这里。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">发现来源配置</h2>
          <p className="mt-1 text-sm text-slate-500">
            主动探测器后续会从这里读取目标。当前阶段负责配置、留档和检查记录展示。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">策略</th>
                <th className="px-4 py-3 font-medium">检查状态</th>
                <th className="px-4 py-3 font-medium">备注</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sources.map((source) => (
                <tr key={source.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{source.name}</div>
                    <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block max-w-[360px] truncate text-xs font-medium text-blue-700 hover:text-blue-900">
                      {source.url}
                    </a>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-700">{sourceLabel(source.source_type)}</div>
                    <div className="mt-1 text-xs text-slate-500">{source.category_hint ? categoryLabel(source.category_hint) : "未指定分类"}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs text-slate-500">每 {source.scan_interval_hours} 小时</div>
                    <div className="mt-1 text-xs text-slate-500">可靠度 {source.reliability_score}</div>
                    <div className="mt-1 text-xs font-medium text-slate-700">{strategyLabel(source.strategy)}</div>
                    <div className="mt-1 text-xs text-slate-400">入池 {source.promote_threshold} / 观察 {source.watch_threshold}</div>
                    {source.query ? <div className="mt-1 text-xs text-slate-400">{source.query}</div> : null}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${source.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                      {source.status === "active" ? "启用" : source.status === "paused" ? "暂停" : "归档"}
                    </span>
                    <div className="mt-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${sourceQueueClassName(source)}`}>
                        {sourceQueueLabel(source)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">上次检查：{formatOptionalDate(source.last_checked_at)}</div>
                    {source.manual_scan_requested_at ? (
                      <div className="mt-1 text-xs text-blue-600">
                        请求时间：{formatDate(source.manual_scan_requested_at)}
                      </div>
                    ) : null}
                    {source.latest_check_status ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${changeKindClassName(source.latest_check_kind)}`}>
                          {changeKindLabel(source.latest_check_kind)}
                        </span>
                        {source.latest_importance_score !== null ? <span className="text-xs text-slate-500">重要度 {source.latest_importance_score}</span> : null}
                      </div>
                    ) : null}
                    {source.last_error ? <div className="mt-1 text-xs text-red-600">{source.last_error}</div> : null}
                  </td>
                  <td className="max-w-[260px] px-4 py-4 text-xs leading-5 text-slate-500">
                    {source.latest_check_title ? <div className="font-semibold text-slate-700">{source.latest_check_title}</div> : null}
                    {source.latest_trigger_url ? <a className="mt-1 block truncate font-medium text-blue-700 hover:text-blue-900" href={source.latest_trigger_url} target="_blank" rel="noreferrer">触发条目</a> : null}
                    {source.latest_trigger_published_at ? <div className="mt-1 text-slate-400">发布时间：{formatDate(source.latest_trigger_published_at)}</div> : null}
                    {source.latest_check_summary ? <div className="mt-1 line-clamp-3">{source.latest_check_summary}</div> : <div>{source.note || "暂无备注"}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <form action={queueDiscoverySourceScan}>
                      <input type="hidden" name="id" value={source.id} />
                      <AdminButton
                        type="submit"
                        size="sm"
                        disabled={Boolean(source.manual_scan_requested_at)}
                      >
                        {source.manual_scan_requested_at ? "已在队列" : "加入下一轮检查"}
                      </AdminButton>
                    </form>
                    <div className="mt-2 max-w-[180px] text-xs leading-5 text-slate-400">
                      扫描器运行后会更新最近检查记录。
                    </div>
                  </td>
                </tr>
              ))}
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    暂无发现来源。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">最近检查记录</h2>
          <p className="mt-1 text-sm text-slate-500">
            保留最近 30 次主动探测结果，用来追踪系统为什么发现候选、为什么没有入池，或者哪个来源失败。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">时间 / 来源</th>
                <th className="px-4 py-3 font-medium">结果</th>
                <th className="px-4 py-3 font-medium">判断</th>
                <th className="px-4 py-3 font-medium">触发内容</th>
                <th className="px-4 py-3 font-medium">候选</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recentChecks.map((check) => (
                <tr key={check.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-950">{formatDate(check.checked_at)}</div>
                    <div className="mt-1 text-xs text-slate-500">{check.source_name}</div>
                    <div className="mt-1 text-xs text-slate-400">{sourceLabel(check.source_type)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${check.status === "succeeded" ? check.changed ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
                      {check.status === "succeeded" ? check.changed ? "有变化" : "无变化" : "失败"}
                    </span>
                    {check.http_status ? <div className="mt-2 text-xs text-slate-500">HTTP {check.http_status}</div> : null}
                    {check.error_message ? <div className="mt-2 max-w-[220px] text-xs leading-5 text-red-600">{check.error_message}</div> : null}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${changeKindClassName(check.change_kind)}`}>
                      {changeKindLabel(check.change_kind)}
                    </span>
                    <div className="mt-2 text-xs text-slate-500">重要度 {check.importance_score ?? 0}</div>
                    <div className="mt-1 text-xs text-slate-400">{strategyLabel(check.source_strategy)}</div>
                    {check.matched_keywords && check.matched_keywords.length > 0 ? (
                      <div className="mt-2 flex max-w-[240px] flex-wrap gap-1">
                        {check.matched_keywords.slice(0, 5).map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-[360px] px-4 py-4">
                    <div className="line-clamp-2 font-medium text-slate-800">{check.title || "无标题"}</div>
                    {check.trigger_url ? <a className="mt-1 block truncate text-xs font-medium text-blue-700 hover:text-blue-900" href={check.trigger_url} target="_blank" rel="noreferrer">打开触发条目</a> : null}
                    {check.trigger_published_at ? <div className="mt-1 text-xs text-slate-400">发布时间：{formatDate(check.trigger_published_at)}</div> : null}
                    {check.summary ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{check.summary}</div> : null}
                  </td>
                  <td className="px-4 py-4">
                    {check.candidate_name ? <div className="font-medium text-slate-800">{check.candidate_name}</div> : <div className="text-xs text-slate-400">未入候选池</div>}
                  </td>
                </tr>
              ))}
              {recentChecks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    暂无检查记录。主动发现扫描器运行后会写入这里。
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
