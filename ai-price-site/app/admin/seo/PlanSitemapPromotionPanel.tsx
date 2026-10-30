import { adminControlClassName } from "@/components/admin/admin-control";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import type { PlanPromotionRecommendation } from "../../../lib/plan-sitemap-promotion-recommendation";
import type { PlanSitemapPromotionRevision } from "../../../lib/seo-plan-promotion-state";
import { AdminCard } from "../../../components/admin/AdminCard";
import { AdminButton } from "../../../components/admin/AdminButton";
import AdminSelect from "../../../components/admin/AdminSelect";
import {
  applyPlanSitemapPromotionAction,
  rollbackPlanSitemapPromotionAction,
} from "./actions";

function stateClassName(state: PlanPromotionRecommendation["state"]) {
  if (state === "add") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (state === "swap") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (state === "blocked") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-admin-chip text-admin-text-secondary ring-admin-border dark:bg-admin-chip dark:text-admin-text-secondary";
}

function errorMessage(error: string | null) {
  if (error === "signal") return "产品尚未达到推广信号门槛，请刷新数据后重试。";
  if (error === "donor") return "请选择一个有效的置换产品。";
  if (error === "budget") return "调整后会超过页面预算，操作已取消。";
  if (error === "history") return "推广历史已经变化，请刷新后再撤销。";
  return error ? "推广调整未保存，请刷新后重试。" : null;
}

function formatRevisionTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

export default function PlanSitemapPromotionPanel({
  recommendations,
  activePages,
  pageBudget,
  history,
  saved,
  rolledBack,
  error,
}: {
  recommendations: PlanPromotionRecommendation[];
  activePages: number;
  pageBudget: number;
  history: PlanSitemapPromotionRevision[];
  saved: boolean;
  rolledBack: boolean;
  error: string | null;
}) {
  const waiting = recommendations.filter((item) => item.state !== "current");
  const current = recommendations
    .filter((item) => item.state === "current")
    .sort((left, right) =>
      left.signalScore - right.signalScore
      || right.requiredPages - left.requiredPages
      || left.productName.localeCompare(right.productName)
    );
  const strongCandidates = waiting.filter(
    (item) => item.state === "add" || item.state === "swap",
  ).length;
  const failure = errorMessage(error);
  const latestRevision = history.at(-1);

  return (
    <AdminCard className="mb-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">
            下一批套餐推广建议
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
            综合 Google/Bing 曝光、站内搜索和搜索落地后的套餐意向。这里只给出只读建议，不会自动修改 sitemap，也不会操作站长平台。
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-admin-border bg-admin-surface-subtle px-3 py-2
          text-right text-xs text-admin-text-muted dark:border-admin-border-strong dark:bg-admin-chip
          dark:text-admin-text-muted">
          <div className="font-semibold text-admin-text dark:text-admin-text-body">
            产品与套餐页预算 {activePages}/{pageBudget}
          </div>
          <div className="mt-1">
            {strongCandidates > 0
              ? `${strongCandidates} 个产品达到候选信号`
              : "暂无需要调整的强信号"}
          </div>
        </div>
      </div>

      {(saved || rolledBack || failure) ? (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${failure
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {failure
            || (rolledBack
              ? "已撤销上一轮套餐推广调整，sitemap 将按恢复后的名单生成。"
              : "推广名单已保存，预算和 sitemap 会使用新的有效名单。")}
        </div>
      ) : null}

      <div className="mt-5 divide-y divide-admin-border overflow-hidden rounded-lg border border-admin-border dark:border-admin-border-strong">
        {waiting.map((item) => {
          const donors = current.filter(
            (candidate) => candidate.requiredPages >= item.requiredPages,
          );
          const canApprove =
            item.state === "add" || (item.state === "swap" && donors.length > 0);

          return (
            <div key={item.productId} className="bg-admin-surface px-4 py-4 dark:bg-admin-surface">
              <div className="grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_170px_110px_minmax(280px,1.7fr)] md:items-center">
                <div>
                  <div className="font-semibold text-admin-text dark:text-admin-text">{item.productName}</div>
                  <div className="mt-1 font-mono text-xs text-admin-text-faint">
                    {item.publicPath}
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${stateClassName(item.state)}`}
                  >
                    {item.label}
                  </span>
                  <div className="mt-2 text-xs text-admin-text-muted dark:text-admin-text-muted">
                    推广信号 {item.signalScore}/100
                  </div>
                </div>
                <div className="text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                  <div className="font-semibold text-admin-text-body dark:text-admin-text-body">
                    需要 {item.requiredPages} 页
                  </div>
                  <div>中英文套餐页</div>
                </div>
                <div className="text-xs leading-5 text-admin-text-secondary dark:text-admin-text-secondary">
                  {item.reason}
                </div>
              </div>

              {(item.state === "add" || item.state === "swap") ? (
                <AdminActionForm
                  action={applyPlanSitemapPromotionAction}
                  className="mt-4 grid gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1fr)_auto] md:items-end"
                >
                  <input type="hidden" name="targetSlug" value={item.productSlug} />
                  <div className="text-xs font-semibold text-admin-text-body dark:text-admin-text-body">
                    {item.state === "swap" ? (
                      <AdminSelect
                        name="removeSlug"
                        label="释放预算"
                        value=""
                        options={[
                          { value: "", label: "选择要暂停推广的产品" },
                          ...donors.map((donor) => ({
                            value: donor.productSlug,
                            label: donor.productName,
                            description: `释放 ${donor.requiredPages} 页 · 信号 ${donor.signalScore}`,
                          })),
                        ]}
                      />
                    ) : (
                      <>
                        <span className="block">预算处理</span>
                        <div className="mt-2 flex h-10 items-center rounded-lg border border-emerald-200 bg-admin-surface px-3 text-sm text-emerald-700 dark:bg-admin-surface">
                          使用当前剩余预算
                        </div>
                      </>
                    )}
                  </div>
                  <label className="text-xs font-semibold text-admin-text-body dark:text-admin-text-body">
                    审批备注（选填）
                    <input
                      name="operatorNote"
                      maxLength={240}
                      placeholder="记录本次判断依据"
                      className={`${adminControlClassName} mt-2 h-10 w-full`}
                    />
                  </label>
                  <AdminButton type="submit" size="sm" disabled={!canApprove}>
                    确认调整
                  </AdminButton>
                  {!canApprove ? (
                    <p className="text-xs text-amber-700 md:col-span-3">
                      当前没有单个产品能释放足够预算，本轮不能提交。
                    </p>
                  ) : null}
                </AdminActionForm>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-admin-border pt-5 dark:border-admin-border-strong">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 className="text-sm font-semibold text-admin-text dark:text-admin-text">审批与回退记录</h3>
            <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
              只记录 GeoSub 内部推广名单变化，不会向 Google 或 Bing 自动提交网址。
            </p>
          </div>
          {latestRevision ? (
            <AdminActionForm action={rollbackPlanSitemapPromotionAction}>
              <input type="hidden" name="revisionId" value={latestRevision.id} />
              <AdminButton type="submit" size="sm" variant="secondary">
                撤销上一次调整
              </AdminButton>
            </AdminActionForm>
          ) : null}
        </div>

        {history.length > 0 ? (
          <div className="mt-4 divide-y divide-admin-border rounded-lg border border-admin-border dark:border-admin-border-strong">
            {[...history].reverse().slice(0, 5).map((revision) => (
              <div key={revision.id} className="grid gap-2 px-3 py-3 text-xs text-admin-text-secondary md:grid-cols-[160px_1fr] dark:text-admin-text-secondary">
                <div>
                  <div className="font-semibold text-admin-text dark:text-admin-text-body">
                    {formatRevisionTime(revision.changedAt)}
                  </div>
                  <div className="mt-1">{revision.actorLabel}</div>
                </div>
                <div className="leading-5">
                  <div>
                    {revision.addedSlugs.length > 0
                      ? `加入：${revision.addedSlugs.join("、")}`
                      : "没有加入产品"}
                    {revision.removedSlugs.length > 0
                      ? `；暂停：${revision.removedSlugs.join("、")}`
                      : ""}
                  </div>
                  <div className="mt-1 text-admin-text-muted dark:text-admin-text-muted">{revision.reason}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-admin-border-strong px-3 py-4 text-sm text-admin-text-muted dark:border-admin-border-strong dark:text-admin-text-muted">
            尚无人工推广调整，当前使用代码内的默认推广名单。
          </div>
        )}
      </div>
    </AdminCard>
  );
}
