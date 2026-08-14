import { AdminButton } from "../../../components/admin/AdminButton";
import { AdminCard } from "../../../components/admin/AdminCard";
import { AdminInput, AdminTextarea } from "../../../components/admin/AdminInput";
import {
  getLatestSeoSearchPageImportBatch,
  type SeoSearchPageImportState,
} from "../../../lib/seo-search-observation-import";
import {
  SEO_SEARCH_BASELINE_OBSERVED_AT,
  seoSearchPerformanceBaseline,
  type SeoSearchEngine,
} from "../../../lib/seo-search-performance-baseline";
import {
  importSeoSearchPageObservationsAction,
  rollbackSeoSearchPageObservationsAction,
} from "./actions";

function engineLabel(engine: SeoSearchEngine) {
  return engine === "google" ? "Google Search Console" : "Bing Webmaster";
}

function formatImportedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

function ImportSource({
  engine,
  state,
  saved,
  rolledBack,
}: {
  engine: SeoSearchEngine;
  state: SeoSearchPageImportState;
  saved: boolean;
  rolledBack: boolean;
}) {
  const latest = getLatestSeoSearchPageImportBatch(state, engine);
  const baselineCount = seoSearchPerformanceBaseline.filter(
    (item) => item.engine === engine,
  ).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-black text-slate-950">{engineLabel(engine)}</h3>
          {latest ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              当前使用数据库导入 · {latest.observations.length} 个页面 · {latest.periodStart} 至 {latest.periodEnd}
              <br />导入于 {formatImportedAt(latest.importedAt)} · {latest.actorLabel}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              当前使用 {SEO_SEARCH_BASELINE_OBSERVED_AT} 随代码核验的基线，共 {baselineCount} 个页面。
            </p>
          )}
        </div>
        {latest ? (
          <form action={rollbackSeoSearchPageObservationsAction}>
            <input type="hidden" name="engine" value={engine} />
            <AdminButton type="submit" size="sm" variant="secondary">
              撤销最近导入
            </AdminButton>
          </form>
        ) : null}
      </div>

      {saved || rolledBack ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {saved
            ? "页面级搜索数据已导入，推广评分已使用这批数据重新计算。"
            : "最近一批导入已撤销，系统已恢复到上一批数据或代码基线。"}
        </div>
      ) : null}

      <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 open:bg-white">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-black text-blue-700">
          导入新的完整页面报表
        </summary>
        <form action={importSeoSearchPageObservationsAction} className="border-t border-slate-200 p-3">
          <input type="hidden" name="engine" value={engine} />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput label="报表开始日期" name="periodStart" type="date" required />
            <AdminInput label="报表结束日期" name="periodEnd" type="date" required />
          </div>
          <div className="mt-3">
            <AdminTextarea
              label="页面报表"
              name="pageRows"
              required
              maxLength={250000}
              placeholder={'网页,点击次数,展示次数,平均排名\nhttps://geosub.org/zh/ai-pricing/chatgpt,12,540,5.8'}
              helperText="从站长平台导出页面表格后直接粘贴，支持逗号、分号或制表符。必须包含页面、点击、展示列；平均排名可选。只接受 geosub.org 的公开语言页面，最多 500 行。"
            />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              新导入会替代该搜索引擎当前评分数据，不与旧周期相加，也不会向搜索平台提交网址。
            </p>
            <AdminButton type="submit" size="sm">导入并重新计算</AdminButton>
          </div>
        </form>
      </details>
    </section>
  );
}

export default function SeoPageObservationImportPanel({
  state,
  savedEngine,
  rolledBackEngine,
  error,
}: {
  state: SeoSearchPageImportState;
  savedEngine: string | null;
  rolledBackEngine: string | null;
  error: string | null;
}) {
  return (
    <AdminCard className="mb-6">
      <div>
        <h2 className="text-lg font-black text-slate-950">页面级搜索信号</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          全站快照用于判断整体趋势；这里的页面报表用于判断具体产品是否值得推广套餐页。所有数据均来自人工核验的 Google/Bing 导出，不会自动连接站长平台。
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error === "history"
            ? "没有可撤销的导入记录，请刷新页面后重试。"
            : "导入失败。请检查报表日期、表头、域名以及点击和展示数字。"}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {(["google", "bing"] as const).map((engine) => (
          <ImportSource
            key={engine}
            engine={engine}
            state={state}
            saved={savedEngine === engine}
            rolledBack={rolledBackEngine === engine}
          />
        ))}
      </div>
    </AdminCard>
  );
}
