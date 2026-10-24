import { AdminActionForm } from "@/components/admin/AdminPermissions";
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
  const history = state.batches.filter((batch) => batch.engine === engine).toReversed();
  const lastImported = history[0];
  const baselineCount = seoSearchPerformanceBaseline.filter(
    (item) => item.engine === engine,
  ).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-black text-slate-950 dark:text-slate-50">{engineLabel(engine)}</h3>
          {latest ? (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              当前使用数据库导入 · {latest.observations.length} 个页面 · {latest.periodStart} 至 {latest.periodEnd}
              <br />导入于 {formatImportedAt(latest.importedAt)} · {latest.actorLabel}
              <br />按观察结束日、开始日选择最新窗口，同窗采用较新导入；导入时间不代表数据新鲜度。
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              当前使用 {SEO_SEARCH_BASELINE_OBSERVED_AT} 随代码核验的历史基线，共 {baselineCount} 个页面；不是当前实时数据。观察窗口见下方排序表。
            </p>
          )}
        </div>
        {latest ? (
          <AdminActionForm action={rollbackSeoSearchPageObservationsAction}>
            <input type="hidden" name="engine" value={engine} />
            <AdminButton type="submit" size="sm" variant="secondary">
              撤销最近导入
            </AdminButton>
          </AdminActionForm>
        ) : null}
      </div>

      {latest && lastImported && latest.id !== lastImported.id ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          最近导入窗口为 {lastImported.periodStart} 至 {lastImported.periodEnd}，未替代当前最新观察窗口。撤销最近导入针对这份留档报表。
        </p>
      ) : null}

      {history.length > 0 ? (
        <details className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer rounded py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">已导入窗口与选择状态（{history.length} 批）</summary>
          <ul className="mt-1 space-y-2">
            {history.map((batch, index) => (
              <li key={batch.id} className="break-words">
                {batch.periodStart} 至 {batch.periodEnd} · {batch.observations.length} 个页面 · {batch.id === latest?.id ? "当前使用" : "历史留档"}{index === 0 ? " · 最近导入" : ""}
                <br />导入于 {formatImportedAt(batch.importedAt)} · {batch.actorLabel}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {saved || rolledBack ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {saved
            ? "页面级搜索数据已导入；当前使用的观察窗口见上方来源说明。"
            : "最近一批导入已撤销；已从剩余批次选择最新观察窗口，无批次时回退历史基线。"}
        </div>
      ) : null}

      <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 open:bg-white dark:border-slate-700 dark:bg-slate-800 dark:open:bg-slate-900">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-black text-blue-700">
          导入新的完整页面报表
        </summary>
        <AdminActionForm action={importSeoSearchPageObservationsAction} className="border-t border-slate-200 p-3 dark:border-slate-700">
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
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              按观察结束日、开始日选择该引擎最新窗口；旧窗口仅留档，不与旧周期相加，也不会向搜索平台提交网址。
            </p>
            <AdminButton type="submit" size="sm">导入并重新计算</AdminButton>
          </div>
        </AdminActionForm>
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
        <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">页面级搜索信号</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
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
