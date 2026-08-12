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
import ManualCollectionProgressForm from "../../review/ManualCollectionProgressForm";
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">{row.plan_name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {row.plan_slug} · {row.billing_cycle} · {statusLabel(row.status)}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-bold ring-1",
            complete
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-700 ring-amber-200",
          ].join(" ")}
        >
          {complete ? "覆盖稳定" : `缺口 ${commonMissing}`}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">正式价格</div>
          <div className="mt-1 font-bold text-slate-950">{row.published_price_count} 条</div>
          <div className="mt-1 text-xs text-slate-500">{row.published_country_count} 地区</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">常见国家</div>
          <div className="mt-1 font-bold text-slate-950">
            {row.common_published_country_count} / {row.common_country_count}
          </div>
          <div className="mt-1 text-xs text-slate-500">App Store 核心覆盖</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">待审</div>
          <div className="mt-1 font-bold text-slate-950">{row.pending_observation_count} 条</div>
          <div className="mt-1 text-xs text-slate-500">异常 {row.pending_anomaly_count}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">美元范围</div>
          <div className="mt-1 font-bold text-slate-950">
            {formatUsd(row.min_price_usd)} - {formatUsd(row.max_price_usd)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            更新 {formatRelative(row.latest_price_checked_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

function collectionDisabledReason(product: ProductSummaryRow) {
  if (product.app_store_job_count <= 0) {
    return "还没有 App Store 采集任务，请先编辑产品来源。";
  }

  if (product.running_run_count > 0 || product.latest_run_status === "running") {
    return "这个产品正在采集中，等本轮结束后再重跑。";
  }

  return null;
}

function ProductActionPanel({ product }: { product: ProductSummaryRow }) {
  const disabledReason = collectionDisabledReason(product);
  const productQuery = encodeURIComponent(product.slug);

  return (
    <AdminCard className="mb-6">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">处理动作</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            诊断页只保留和这个产品相关的操作入口，避免再回到全站列表里翻找。
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {product.slug}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="text-xs font-bold text-blue-600">重新采集</div>
          <h3 className="mt-2 text-base font-bold text-slate-950">只采这个产品</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
            只唤起 {product.name} 的 App Store 采集任务，完成后进入自动审核。
          </p>
          <div className="mt-4">
            <ManualCollectionProgressForm
              productSlug={product.slug}
              buttonLabel="立即采集"
              pendingLabel="正在采集"
              disabled={Boolean(disabledReason)}
            />
          </div>
          {disabledReason ? (
            <p className="mt-3 text-xs leading-5 text-blue-700">{disabledReason}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-amber-600">异常处理</div>
          <h3 className="mt-2 text-base font-bold text-slate-950">查看待审核异常</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
            当前待审 {product.pending_observation_count} 条，其中硬异常 {product.hard_anomaly_count} 条。
          </p>
          <AdminLink
            href={`/admin/review?q=${productQuery}`}
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
          >
            打开审核中心
          </AdminLink>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-emerald-600">采集排查</div>
          <h3 className="mt-2 text-base font-bold text-slate-950">查看采集任务</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
            已配置 {product.app_store_job_count} 个 App Store 任务，到期 {product.due_job_count} 个。
          </p>
          <AdminLink
            href={`/admin/collector-jobs?q=${productQuery}`}
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            打开采集中心
          </AdminLink>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-slate-500">来源配置</div>
          <h3 className="mt-2 text-base font-bold text-slate-950">编辑产品来源</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
            维护 App Store、官网、Logo 和 SEO 等基础资料，缺采集任务时先从这里补。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminLink
              href={`/admin/products/${product.id}/edit`}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              编辑产品
            </AdminLink>
            {product.official_url ? (
              <a
                href={product.official_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                打开官网
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </AdminCard>
  );
}

export default function ProductDataQualityView({
  product,
  plans,
  missingRows,
  reasonRows,
  availabilityRows,
  collectorRuns,
}: {
  product: ProductSummaryRow;
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
  return (
    <div>
      <AdminPageHeader
        eyebrow="产品诊断"
        title={`${product.name} 数据准确性诊断`}
        description="把采集、审核、缺口和正式价格按产品串起来看。这里不是逐条人工审核，而是判断这个产品当前卡在哪一步。"
        action={
          <AdminLink
            href="/admin/data-quality"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${conclusionClasses.badge}`}
              >
                {conclusion.label}
              </span>
              <h2 className="mt-3 text-xl font-bold text-slate-950">{conclusion.title}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
                {conclusion.detail}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-950">
                下一步：{conclusion.nextAction}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ManualCollectionProgressForm
              productSlug={product.slug}
              buttonLabel="只采这个产品"
              pendingLabel="正在采集"
              disabled={
                product.app_store_job_count <= 0 ||
                product.running_run_count > 0 ||
                product.latest_run_status === "running"
              }
            />
            <AdminLink
              href={`/admin/review?q=${encodeURIComponent(product.slug)}`}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              查看审核
            </AdminLink>
            <AdminLink
              href={`/admin/collector-jobs?q=${encodeURIComponent(product.slug)}`}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              采集任务
            </AdminLink>
            <AdminLink
              href={`/admin/products/${product.id}/edit`}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              编辑来源
            </AdminLink>
          </div>
        </div>
      </AdminCard>

      <ProductActionPanel product={product} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard label="套餐" value={product.plan_count} helper={categoryLabel(product.category)} />
        <AdminStatCard label="采集任务" value={product.app_store_job_count} helper={`到期 ${product.due_job_count}`} />
        <AdminStatCard label="正式价" value={product.published_price_count} helper={`${product.published_country_count} 地区`} />
        <AdminStatCard
          label="默认地区缺口"
          value={commonMissingCount}
          helper={`${eligibleCountryCount} 个可采集地区`}
        />
        <AdminStatCard label="待审" value={product.pending_observation_count} helper={`异常 ${product.pending_anomaly_count}`} />
        <AdminStatCard label="硬异常" value={product.hard_anomaly_count} helper="不会自动上线" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">套餐覆盖</h2>
              <p className="mt-1 text-sm text-slate-500">
                先看每个套餐是否覆盖常见 App Store 国家，再看是否有异常样本积压。
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-400">
              最近价格更新 {formatDate(product.latest_price_checked_at)}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCoverageCard key={plan.plan_id} row={plan} />
            ))}
            {plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                暂无套餐。需要先在产品资料里补套餐。
              </div>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">地区可用性</h2>
            <p className="mt-1 text-sm text-slate-500">
              这里解释“没有采到”到底是地区不可用、无订阅，还是还没检查。
            </p>
          </div>
          <div className="space-y-3">
            {availabilityRows.map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
              >
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {availabilityLabel(row.status)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    最近 {formatRelative(row.latest_checked_at)}
                  </div>
                </div>
                <div className="text-lg font-bold text-slate-950">{row.country_count}</div>
              </div>
            ))}
            {availabilityRows.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                暂无地区可用性检查记录。
              </div>
            ) : null}
          </div>
        </AdminCard>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <div className="mb-4 flex items-start gap-3">
            <CircleAlert className="mt-0.5 text-amber-500" size={19} strokeWidth={2.2} />
            <div>
              <h2 className="text-lg font-bold text-slate-950">常见国家缺口</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                已确认“无订阅”或“地区不可用”的国家不会计入套餐缺口；这里只显示仍需系统补采或审核的套餐地区。
              </p>
            </div>
          </div>
          <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">套餐</th>
                  <th className="px-3 py-3 font-medium">地区</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {missingRows.map((row) => (
                  <tr key={`${row.plan_slug}-${row.country_code}`} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-950">{row.plan_name}</div>
                      <div className="mt-1 text-xs text-slate-400">{row.plan_slug}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">{row.country_name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {row.country_code} · {row.currency}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-700">
                        {missingPlanCountryLabel(row)}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">
                        {missingPlanCountryDetail(row)}
                      </div>
                    </td>
                  </tr>
                ))}
                {missingRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-10 text-center text-sm text-slate-500">
                      常见地区没有明显缺口。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-4 flex items-start gap-3">
            <ShieldAlert className="mt-0.5 text-red-500" size={19} strokeWidth={2.2} />
            <div>
              <h2 className="text-lg font-bold text-slate-950">待审原因分组</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                这里按原因聚合，不再让你逐条翻。硬异常会自动拦截，稳定样本会自动入库。
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {reasonRows.map((row) => (
              <div key={row.reason_code || "unknown"} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {reviewReasonLabel(row.reason_code)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.plan_count} 套餐 · {row.country_count} 地区 · 最近 {formatRelative(row.latest_observed_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    {row.observation_count} 条
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {reviewReasonAction(row.reason_code)}
                </p>
                <div className="mt-3 text-xs font-semibold text-slate-400">
                  美元范围 {formatUsd(row.min_price_usd)} - {formatUsd(row.max_price_usd)}
                </div>
              </div>
            ))}
            {reasonRows.length === 0 ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-8 text-center text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                没有待审异常。这个产品当前不需要人工处理。
              </div>
            ) : null}
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">最近采集运行</h2>
            <p className="mt-1 text-sm text-slate-500">
              这里看脚本是否真的运行，以及本轮产生了多少观测、待审和正式价。
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            最近观测 {formatDate(product.latest_observed_at)}
          </div>
        </div>
        <div className="space-y-4">
          {collectorRuns.map((run) => (
            <div key={run.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-950">
                    {statusLabel(run.status)} · {formatDate(run.started_at)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    耗时 {formatDuration(run.run_age_seconds)} · {run.source_type || "unknown"}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
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
            <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              暂无采集运行记录。点击“只采这个产品”后，这里会显示运行过程和结果。
            </div>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}
