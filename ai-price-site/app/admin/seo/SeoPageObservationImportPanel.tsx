import { AdminActionForm } from "@/components/admin/AdminPermissions";
import { AdminButton } from "../../../components/admin/AdminButton";
import { AdminCard } from "../../../components/admin/AdminCard";
import SeoPageImportForm from "./SeoPageImportForm";
import type { SeoSearchImportRecovery } from "../../../lib/seo-search-import-recovery";

export type SeoImportRecoveryView = { plan: SeoSearchImportRecovery | null; error: string | null };
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
  recordVersion,
  recovery,
}: {
  engine: SeoSearchEngine;
  state: SeoSearchPageImportState;
  saved: boolean;
  rolledBack: boolean;
  recordVersion: string;
  recovery: SeoImportRecoveryView;
}) {
  const latest = getLatestSeoSearchPageImportBatch(state, engine);
  const history = state.batches.filter((batch) => batch.engine === engine).toReversed();
  const lastImported = history[0];
  const baselineCount = seoSearchPerformanceBaseline.filter(
    (item) => item.engine === engine,
  ).length;

  return (
    <section className="rounded-lg border border-admin-border bg-admin-surface p-4 dark:border-admin-border-strong dark:bg-admin-surface">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-semibold text-admin-text dark:text-admin-text">{engineLabel(engine)}</h3>
          {latest ? (
            <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
              当前使用数据库导入 · {latest.observations.length} 个页面 · {latest.periodStart} 至 {latest.periodEnd}
              <br />导入于 {formatImportedAt(latest.importedAt)} · {latest.actorLabel}
              <br />按观察结束日、开始日选择最新窗口，同窗采用较新导入；导入时间不代表数据新鲜度。
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
              当前使用 {SEO_SEARCH_BASELINE_OBSERVED_AT} 随代码核验的历史基线，共 {baselineCount} 个页面；不是当前实时数据。观察窗口见下方排序表。
            </p>
          )}
        </div>

      </div>

      {lastImported ? (
        <details className="mt-3 text-xs leading-5">
          <summary className="cursor-pointer rounded py-3 font-semibold focus-visible:outline-2">撤销最近导入与同窗口恢复</summary>
          {recovery.plan ? <div className="space-y-3 py-2">
            <p>目标：{lastImported.periodStart} 至 {lastImported.periodEnd} · {lastImported.observations.length} 页。</p>
            <p>{recovery.plan.restored ? `将从原始审计恢复该窗口的 ${recovery.plan.restored.observations.length} 页（导入于 ${formatImportedAt(recovery.plan.restored.importedAt)}）。` : '审计证明这是该窗口的首次导入，撤销将移除此窗口；剩余窗口重新选择，无批次时使用历史基线。'}其他窗口和另一搜索引擎保持原样。</p>
            <AdminActionForm key={recordVersion} action={rollbackSeoSearchPageObservationsAction} confirmMessage="确认按所示审计撤销最近导入并恢复目标窗口？其他窗口保持原样。">
              <input type="hidden" name="engine" value={engine} />
              <input type="hidden" name="recordVersion" value={recordVersion} />
              <input type="hidden" name="batchId" value={recovery.plan.target.id} />
              <input type="hidden" name="auditId" value={recovery.plan.auditId} />
              <AdminButton type="submit" size="sm" variant="secondary">{recovery.plan.restored ? '恢复同窗口原批次' : '撤销此窗口首次导入'}</AdminButton>
            </AdminActionForm>
          </div> : <p role="status" className="py-2">{recovery.error ?? '缺少对应导入审计，无法安全恢复；未修改数据。'}</p>}
        </details>
      ) : null}

      {latest && lastImported && latest.id !== lastImported.id ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          最近导入窗口为 {lastImported.periodStart} 至 {lastImported.periodEnd}，未替代当前最新观察窗口。撤销最近导入针对这份留档报表。
        </p>
      ) : null}

      {history.length > 0 ? (
        <details className="mt-3 text-xs leading-5 text-admin-text-secondary dark:text-admin-text-secondary">
          <summary className="cursor-pointer rounded py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">已导入窗口与选择状态（{history.length} 批）</summary>
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
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {saved
            ? "页面级搜索数据已导入；当前使用的观察窗口见上方来源说明。"
            : "最近一批导入已按审计撤销；同窗口原批次已恢复，首次导入则移除该窗口。"}
        </div>
      ) : null}

      <details className="mt-4 rounded-lg border border-admin-border bg-admin-surface-subtle open:bg-admin-surface dark:border-admin-border-strong dark:bg-admin-chip dark:open:bg-admin-surface">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-blue-700">
          导入新的完整页面报表
        </summary>
        <SeoPageImportForm key={recordVersion} engine={engine} recordVersion={recordVersion} />
      </details>
    </section>
  );
}

export default function SeoPageObservationImportPanel({
  state,
  savedEngine,
  rolledBackEngine,
  error,
  recordVersion,
  recoveries,
}: {
  state: SeoSearchPageImportState;
  savedEngine: string | null;
  rolledBackEngine: string | null;
  error: string | null;
  recordVersion: string;
  recoveries: Record<SeoSearchEngine, SeoImportRecoveryView>;
}) {
  return (
    <AdminCard className="mb-6">
      <div>
        <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">页面级搜索信号</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
          全站快照用于判断整体趋势；这里的页面报表用于判断具体产品是否值得推广套餐页。所有数据均来自人工核验的 Google/Bing 导出，不会自动连接站长平台。
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
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
            recordVersion={recordVersion}
            recovery={recoveries[engine]}
            saved={savedEngine === engine}
            rolledBack={rolledBackEngine === engine}
          />
        ))}
      </div>
    </AdminCard>
  );
}
