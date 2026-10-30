import { productWorkflowHref } from "@/lib/admin-product-next-action";
import { safeAdminReturnTo, withAdminReturnTo } from "@/lib/admin-workflow-context";
import { adminButtonClassName } from "@/components/admin/AdminButton";
import AdminPagination from "@/components/admin/AdminPagination";
import { createAdminListView } from "@/lib/admin-list-params";
import AdminLink from "@/components/admin/AdminLink";
import {
  ArrowLeft,
  CircleAlert,
  ShieldAlert,
} from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../../components/admin/AdminCard";
import { DEFAULT_APP_STORE_COUNTRY_CODES } from "../../../../lib/app-store-country-policy";
import CollectorRunTimeline, {
  CollectorRunOutcomeSummary,
} from "../../review/CollectorRunTimeline";
import { reviewReasonAction, reviewReasonLabel } from "../../review/review-reason-copy";
import type { CollectorRunHistoryRow } from "../../review/types";
import {
  availabilityLabel,
  categoryLabel,
  formatDate,
  formatDuration,
  formatRelative,
  formatUsd,
  getDiagnosisConclusion,
  levelClasses,
  missingPlanCountryDetail,
  missingPlanCountryLabel,
  statusLabel,
  type AvailabilitySummaryRow,
  type MissingCountryRow,
  type PendingReasonRow,
  type PlanCoverageRow,
  type ProductSummaryRow,
} from "./model";
function PlanCoverageCard({ row }: { row: PlanCoverageRow }) {
  const commonMissing = Math.max(
    0,
    row.common_country_count - row.common_published_country_count,
  );
  const complete = commonMissing === 0 && row.pending_anomaly_count === 0;

  return (
    <div className="rounded-admin-card border border-admin-border bg-admin-surface p-4 dark:border-admin-border-strong dark:bg-admin-surface">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-admin-text dark:text-admin-text">{row.plan_name}</h3>
          <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
            {row.plan_slug} · {row.billing_cycle} · {statusLabel(row.status)}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
            complete
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800"
              : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
          ].join(" ")}
        >
          {complete ? "覆盖稳定" : `缺口 ${commonMissing}`}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
          <div className="text-xs font-semibold text-admin-text-faint">正式价格</div>
          <div className="mt-1 font-semibold text-admin-text dark:text-admin-text">{row.published_price_count} 条</div>
          <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">{row.published_country_count} 地区</div>
        </div>
        <div className="rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
          <div className="text-xs font-semibold text-admin-text-faint">常见国家</div>
          <div className="mt-1 font-semibold text-admin-text dark:text-admin-text">
            {row.common_published_country_count} / {row.common_country_count}
          </div>
          <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">App Store 核心覆盖</div>
        </div>
        <div className="rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
          <div className="text-xs font-semibold text-admin-text-faint">待审</div>
          <div className="mt-1 font-semibold text-admin-text dark:text-admin-text">{row.pending_observation_count} 组</div>
          <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">异常 {row.pending_anomaly_count}</div>
        </div>
        <div className="rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
          <div className="text-xs font-semibold text-admin-text-faint">美元范围</div>
          <div className="mt-1 font-semibold text-admin-text dark:text-admin-text">
            {formatUsd(row.min_price_usd)} - {formatUsd(row.max_price_usd)}
          </div>
          <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
            更新 {formatRelative(row.latest_price_checked_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDataQualityView({
  product,
  listPage,
  returnTo,
  plans,
  missingRows,
  reasonRows,
  availabilityRows,
  collectorRuns,
}: {
  product: ProductSummaryRow;
  listPage?: string;
  returnTo?:string;
  plans: PlanCoverageRow[];
  missingRows: MissingCountryRow[];
  reasonRows: PendingReasonRow[];
  availabilityRows: AvailabilitySummaryRow[];
  collectorRuns: CollectorRunHistoryRow[];
}) {
  const commonMissingCount = plans.reduce(
    (sum, plan) =>
      sum + Math.max(0, plan.common_country_count - plan.common_published_country_count),
    0,
  );
  const eligibleCountryCount =
    plans[0]?.common_country_count ?? DEFAULT_APP_STORE_COUNTRY_CODES.length;
  const conclusion = getDiagnosisConclusion(product, commonMissingCount);
  const conclusionClasses = levelClasses(conclusion.level);
  const ConclusionIcon = conclusionClasses.icon;
  const gapList=createAdminListView(missingRows,{basePath:`/admin/data-quality/${encodeURIComponent(product.slug)}`,params:{page:listPage},pageSize:25,id:"country-gaps"});
  return (
    <div>
      <AdminPageHeader
        eyebrow="产品诊断"
        title={`${product.name} 数据准确性诊断`}
        description="把采集、审核、缺口和正式价格按产品串起来看。这里不是逐条人工审核，而是判断这个产品当前卡在哪一步。"
        action={
          <AdminLink
            href={safeAdminReturnTo(returnTo,"/admin/data-quality")}
            className={adminButtonClassName({variant:"secondary",size:"md",className:""})}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            返回总览
          </AdminLink>
        }
      />

      <AdminCard className={`mb-6 ${conclusionClasses.card}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <span
              className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${conclusionClasses.badge}`}
            >
              <ConclusionIcon size={21} strokeWidth={2.2} />
            </span>
            <div>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${conclusionClasses.badge}`}
              >
                {conclusion.label}
              </span>
              <h2 className="mt-3 text-base font-semibold text-admin-text dark:text-admin-text">{conclusion.title}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-admin-text-body dark:text-admin-text-body">
                {conclusion.detail}
              </p>
              <p className="mt-2 text-sm font-semibold text-admin-text dark:text-admin-text">
                下一步：{conclusion.nextAction}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2"><AdminLink href={withAdminReturnTo(
            productWorkflowHref("/admin/pipeline",product.slug),
            safeAdminReturnTo(returnTo,"/admin/data-quality")
          )} className={adminButtonClassName({variant:"primary",size:"md"})}>查看产品下一步</AdminLink>
          </div>
        </div>
      </AdminCard>


      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard label="套餐" value={product.plan_count} helper={categoryLabel(product.category)} />
        <AdminStatCard label="采集任务" value={product.app_store_job_count} helper={`到期 ${product.due_job_count}`} />
        <AdminStatCard label="正式价" value={product.published_price_count} helper={`${product.published_country_count} 地区`} />
        <AdminStatCard
          label="默认地区缺口"
          value={commonMissingCount}
          helper={`${eligibleCountryCount} 个可采集地区`}
        />
        <AdminStatCard
          label="当前待审"
          value={product.pending_observation_count}
          helper={`App Store 组合 · 异常 ${product.pending_anomaly_count} 组`}
        />
        <AdminStatCard label="当前硬异常" value={product.hard_anomaly_count} helper="App Store 组合 · 不会自动上线" />
      </div>

      <p className="mb-6 text-sm leading-6 text-admin-text-muted">
        当前问题按产品、套餐、地区、渠道和价格类型分组，只取各组最新证据；以下待审统计限定 App Store。
        历史采集样本共 {product.historical_observation_count} 条，保留用于追溯，不作为当前待办计数。
      </p>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">套餐覆盖</h2>
              <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
                先看每个套餐是否覆盖常见 App Store 国家，再看是否有异常样本积压。
              </p>
            </div>
            <p className="text-xs font-semibold text-admin-text-faint">
              最近价格更新 {formatDate(product.latest_price_checked_at)}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCoverageCard key={plan.plan_id} row={plan} />
            ))}
            {plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-admin-border px-4 py-8 text-center text-sm text-admin-text-muted dark:border-admin-border-strong dark:text-admin-text-muted">
                暂无套餐。需要先在产品资料里补套餐。
              </div>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">地区可用性</h2>
            <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
              这里解释“没有采到”到底是地区不可用、无订阅，还是还没检查。
            </p>
          </div>
          <div className="space-y-3">
            {availabilityRows.map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between rounded-admin-card bg-admin-surface-subtle px-3 py-3 dark:bg-admin-chip"
              >
                <div>
                  <div className="text-sm font-semibold text-admin-text dark:text-admin-text-body">
                    {availabilityLabel(row.status)}
                  </div>
                  <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                    最近 {formatRelative(row.latest_checked_at)}
                  </div>
                </div>
                <div className="text-lg font-semibold text-admin-text dark:text-admin-text">{row.country_count}</div>
              </div>
            ))}
            {availabilityRows.length === 0 ? (
              <div className="rounded-admin-card bg-admin-surface-subtle px-3 py-8 text-center text-sm text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted">
                暂无地区可用性检查记录。
              </div>
            ) : null}
          </div>
        </AdminCard>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <div className="mb-4 flex items-start gap-3">
            <CircleAlert className="mt-0.5 text-amber-500 dark:text-amber-300" size={19} strokeWidth={2.2} />
            <div>
              <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">常见国家缺口</h2>
              <p className="mt-1 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
                已确认“无订阅”或“地区不可用”的国家不会计入套餐缺口；这里只显示仍需系统补采或审核的套餐地区。
              </p>
            </div>
          </div>
          <AdminPagination {...gapList.pagination} id="country-gaps" ariaLabel="地区缺口分页" className="mb-4" />
          <div className="max-h-[480px] overflow-auto rounded-xl border border-admin-border dark:border-admin-border-strong">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-admin-border bg-admin-surface-subtle text-xs
                text-admin-text-muted dark:border-admin-border-strong dark:bg-admin-chip
                dark:text-admin-text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">套餐</th>
                  <th className="px-3 py-3 font-medium">地区</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-surface dark:bg-admin-surface">
                {gapList.items.map((row) => (
                  <tr key={`${row.plan_slug}-${row.country_code}`} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-admin-text dark:text-admin-text">{row.plan_name}</div>
                      <div className="mt-1 text-xs text-admin-text-faint">{row.plan_slug}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-admin-text dark:text-admin-text-body">{row.country_name}</div>
                      <div className="mt-1 text-xs text-admin-text-faint">
                        {row.country_code} · {row.currency}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-admin-text-body dark:text-admin-text-body">
                        {missingPlanCountryLabel(row)}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-admin-text-faint">
                        {missingPlanCountryDetail(row)}
                      </div>
                    </td>
                  </tr>
                ))}
                {missingRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-10 text-center text-sm text-admin-text-muted dark:text-admin-text-muted">
                      常见地区没有明显缺口。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        <AdminPagination {...gapList.pagination} ariaLabel="地区缺口底部分页" className="mt-4" />
        </AdminCard>

        <AdminCard>
          <div className="mb-4 flex items-start gap-3">
            <ShieldAlert className="mt-0.5 text-red-500 dark:text-red-300" size={19} strokeWidth={2.2} />
            <div>
              <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">待审原因分组</h2>
              <p className="mt-1 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
                按当前 App Store 待审组合聚合，最多显示 12 类原因；历史样本不重复累计。
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {reasonRows.map((row) => (
              <div key={row.reason_code || "unknown"} className="rounded-xl border border-admin-border p-4 dark:border-admin-border-strong">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-admin-text dark:text-admin-text">
                      {reviewReasonLabel(row.reason_code)}
                    </h3>
                    <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      {row.plan_count} 套餐 · {row.country_count} 地区 · 最近 {formatRelative(row.latest_observed_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800">
                    {row.observation_count} 组
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-admin-text-secondary dark:text-admin-text-secondary">
                  {reviewReasonAction(row.reason_code)}
                </p>
                <div className="mt-3 text-xs font-semibold text-admin-text-faint">
                  美元范围 {formatUsd(row.min_price_usd)} - {formatUsd(row.max_price_usd)}
                </div>
              </div>
            ))}
            {reasonRows.length === 0 ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-8 text-center text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800">
                当前没有 App Store 待审组合；其他问题仍以产品诊断为准。
              </div>
            ) : null}
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">最近采集运行</h2>
            <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
              这里看脚本是否真的运行，以及本轮产生了多少观测、待审和正式价。
            </p>
          </div>
          <div className="text-xs font-semibold text-admin-text-faint">
            最近观测 {formatDate(product.latest_observed_at)}
          </div>
        </div>
        <div className="space-y-4">
          {collectorRuns.map((run) => (
            <div key={run.id} className="rounded-xl border border-admin-border p-4 dark:border-admin-border-strong">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-admin-text dark:text-admin-text">
                    {statusLabel(run.status)} · {formatDate(run.started_at)}
                  </div>
                  <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                    耗时 {formatDuration(run.run_age_seconds)} · {run.source_type || "unknown"}
                  </div>
                </div>
                <div className="min-w-0 break-words text-xs text-admin-text-faint [overflow-wrap:anywhere]">
                  {run.error_message || run.output_excerpt || "暂无输出摘要"}
                </div>
              </div>
              <div className="mt-3">
                <CollectorRunTimeline compact run={run} />
              </div>
              <div className="mt-3">
                <CollectorRunOutcomeSummary compact run={run} />
              </div>
            </div>
          ))}
          {collectorRuns.length === 0 ? (
            <div className="rounded-admin-card bg-admin-surface-subtle px-4 py-10 text-center text-sm text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted">
              暂无采集运行记录。点击“只采这个产品”后，这里会显示运行过程和结果。
            </div>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}
