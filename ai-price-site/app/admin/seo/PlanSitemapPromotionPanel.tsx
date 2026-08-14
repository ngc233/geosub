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
  return "bg-slate-100 text-slate-600 ring-slate-200";
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
          <h2 className="text-lg font-black text-slate-950">
            下一批套餐推广建议
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            综合 Google/Bing 曝光、站内搜索和搜索落地后的套餐意向。这里只给出只读建议，不会自动修改 sitemap，也不会操作站长平台。
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs text-slate-500">
          <div className="font-black text-slate-800">
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

      <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
        {waiting.map((item) => {
          const donors = current.filter(
            (candidate) => candidate.requiredPages >= item.requiredPages,
          );
          const canApprove =
            item.state === "add" || (item.state === "swap" && donors.length > 0);

          return (
            <div key={item.productId} className="bg-white px-4 py-4">
              <div className="grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_170px_110px_minmax(280px,1.7fr)] md:items-center">
                <div>
                  <div className="font-black text-slate-950">{item.productName}</div>
                  <div className="mt-1 font-mono text-xs text-slate-400">
                    {item.publicPath}
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-black ring-1 ${stateClassName(item.state)}`}
                  >
                    {item.label}
                  </span>
                  <div className="mt-2 text-xs text-slate-500">
                    推广信号 {item.signalScore}/100
                  </div>
                </div>
                <div className="text-xs leading-5 text-slate-500">
                  <div className="font-bold text-slate-700">
                    需要 {item.requiredPages} 页
                  </div>
                  <div>中英文套餐页</div>
                </div>
                <div className="text-xs leading-5 text-slate-600">
                  {item.reason}
                </div>
              </div>

              {(item.state === "add" || item.state === "swap") ? (
                <form
                  action={applyPlanSitemapPromotionAction}
                  className="mt-4 grid gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1fr)_auto] md:items-end"
                >
                  <input type="hidden" name="targetSlug" value={item.productSlug} />
                  <div className="text-xs font-bold text-slate-700">
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
                        <div className="mt-2 flex h-10 items-center rounded-lg border border-emerald-200 bg-white px-3 text-sm text-emerald-700">
                          使用当前剩余预算
                        </div>
                      </>
                    )}
                  </div>
                  <label className="text-xs font-bold text-slate-700">
                    审批备注（选填）
                    <input
                      name="operatorNote"
                      maxLength={240}
                      placeholder="记录本次判断依据"
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
                </form>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 className="text-sm font-black text-slate-950">审批与回退记录</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              只记录 GeoSub 内部推广名单变化，不会向 Google 或 Bing 自动提交网址。
            </p>
          </div>
          {latestRevision ? (
            <form action={rollbackPlanSitemapPromotionAction}>
              <input type="hidden" name="revisionId" value={latestRevision.id} />
              <AdminButton type="submit" size="sm" variant="secondary">
                撤销上一次调整
              </AdminButton>
            </form>
          ) : null}
        </div>

        {history.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {[...history].reverse().slice(0, 5).map((revision) => (
              <div key={revision.id} className="grid gap-2 px-3 py-3 text-xs text-slate-600 md:grid-cols-[160px_1fr]">
                <div>
                  <div className="font-bold text-slate-800">
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
                  <div className="mt-1 text-slate-500">{revision.reason}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
            尚无人工推广调整，当前使用代码内的默认推广名单。
          </div>
        )}
      </div>
    </AdminCard>
  );
}
