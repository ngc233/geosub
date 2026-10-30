import AdminProductLogo from "@/components/admin/AdminProductLogo";
import { productWorkflowHref } from "@/lib/admin-product-next-action";
import { withAdminReturnTo, adminListLocation } from "@/lib/admin-workflow-context";
import { AdminLinkButton } from "@/components/admin/AdminButton";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import type { AdminProductFilter } from "@/lib/admin-workflow-context";
import { adminButtonClassName } from "@/components/admin/AdminButton";
import AdminPagination from "@/components/admin/AdminPagination";
import { createAdminListView } from "@/lib/admin-list-params";
import AdminLink from "@/components/admin/AdminLink";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import type { AdminOperationalStatus } from "@/lib/admin-operational-status";
import {
  ArrowRight,
  Clock3,
  DatabaseZap,
} from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import {
  categoryLabel,
  formatDate,
  formatDuration,
  formatIgnoredReasons,
  formatRelative,
  getProductCollectionPresentation,
  getProductHealth,
  getProductOperationalAssessment,
  hasUnconsumedQueue,
  healthClasses,
  type ProductQualityRow,
  type RepairCycleRow,
} from "./model";

export function DataQualityOverview({
  rows,
  listPage,
  listParams = {},
  filter,
  latestRepairCycle,
  operationalCounts,
  coverageGapProductCount,
}: {
  rows: ProductQualityRow[];
  listPage?: string;
  listParams?: Record<string,string|undefined>;
  filter?: AdminProductFilter;
  latestRepairCycle: RepairCycleRow | null;
  operationalCounts: Record<AdminOperationalStatus, number>;
  coverageGapProductCount: number;
}) {
  const list = createAdminListView(rows, { basePath: "/admin/data-quality", params: {...listParams,page:listPage}, pageSize: 25, pageParam: "page", id: "data-quality-list" });
  return (
    <div>
      <AdminPageHeader
        eyebrow="数据质量"
        title="产品数据健康总览"
        description="把采集、自动审核、地区覆盖和正式价格按产品归因。日常先处理红色产品，蓝色状态由系统继续采集和判断。"
        action={
          <AdminLink
            href="/admin/collector-jobs"
            className={adminButtonClassName({variant:"secondary",size:"md",className:""})}
          >
            查看采集任务
            <ArrowRight size={16} strokeWidth={2} />
          </AdminLink>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="产品总数" value={rows.length} helper="服务库内未归档产品" />
        <AdminStatCard label="未开始" value={operationalCounts.not_started} helper="缺少可运行的采集任务" />
        <AdminStatCard label="待处理" value={operationalCounts.pending} helper="系统正在采集、复核或补资料" />
        <AdminStatCard label="异常" value={operationalCounts.exception} helper="需要查看阻塞原因" />
        <AdminStatCard label="已发布" value={operationalCounts.published} helper="当前无需手工介入" />
      </div>

      <AdminCard className="mb-6">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex gap-3">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <DatabaseZap size={20} strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-blue-950 dark:text-blue-100 text-admin-text">
              产品更新判断
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-blue-800 dark:text-blue-200">
                系统按 App Store、官网和一次性商品等来源分别判断采集状态，再检查覆盖、价格时效、极端值、重复套餐和税务资料。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-blue-800 2xl:min-w-[620px] 2xl:grid-cols-4 dark:text-blue-200">
            <div className="rounded-admin-card bg-admin-surface/70 px-3 py-2 dark:bg-admin-surface/70">
              最近质量扫描：{latestRepairCycle ? formatRelative(latestRepairCycle.created_at) : "等待首次运行"}
            </div>
            <div className="rounded-admin-card bg-admin-surface/70 px-3 py-2 dark:bg-admin-surface/70">
              本轮排队：{latestRepairCycle
                ? latestRepairCycle.anomaly_jobs_queued +
                  latestRepairCycle.stale_jobs_queued +
                  latestRepairCycle.coverage_jobs_queued
                : 0}
            </div>
            <div className="rounded-admin-card bg-admin-surface/70 px-3 py-2 dark:bg-admin-surface/70">
              本轮隔离：{latestRepairCycle
                ? latestRepairCycle.anomaly_observations_closed +
                  latestRepairCycle.published_outliers_quarantined +
                  latestRepairCycle.stale_prices_quarantined
                : 0}
            </div>
            <div className="rounded-admin-card bg-admin-surface/70 px-3 py-2 dark:bg-admin-surface/70">
              覆盖缺口：{coverageGapProductCount} 个产品
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="dark:border-admin-border dark:bg-admin-surface dark:shadow-black/20">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">
              产品级处理队列
            </h2>
            <p className="mt-1 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
              一行代表一个产品。当前问题按套餐、地区和渠道归并；历史样本保留为证据，按具体原因选择下一步。
            </p>
          </div>
          <p className="text-xs font-semibold text-admin-text-faint dark:text-admin-text-muted">
            更新时间：{formatDate(new Date())}
          </p>
        </div>

        <AdminFilterBar action="/admin/data-quality" q={filter?.q || filter?.product} searchLabel="搜索产品" searchPlaceholder="产品名称或 slug" clearHref="/admin/data-quality" />
        {filter?.product ? <p className="mb-4 text-sm text-admin-text-muted">当前仅显示产品：{filter.product}</p> : null}
        <AdminPagination {...list.pagination} ariaLabel="列表分页" className="mb-4" id="data-quality-list" />
        <div className="overflow-hidden rounded-xl border border-admin-border dark:border-admin-border">
          <div className="hidden grid-cols-[1.05fr_1.05fr_1fr_0.9fr_0.9fr_1.15fr_0.85fr] gap-4 border-b
            border-admin-border bg-admin-surface-subtle px-4 py-3 text-xs font-semibold
            text-admin-text-muted lg:grid dark:border-admin-border dark:bg-admin-canvas/50
            dark:text-admin-text-muted">
            <div>产品</div>
            <div>地区覆盖</div>
            <div>自动审核</div>
            <div>采集状态</div>
            <div>下次采集</div>
            <div>更新原因</div>
            <div className="text-right">操作</div>
          </div>

          <div className="divide-y divide-admin-border dark:divide-admin-border">
            {list.items.map((row) => {
              const health = getProductHealth(row);
              const operationalAssessment = getProductOperationalAssessment(row);
              const operationalStatus = operationalAssessment?.status ?? "not_started";
              const classes = healthClasses(health.level);
              const unconsumedQueue = hasUnconsumedQueue(row);
              const collection = getProductCollectionPresentation(row);
              const isAppStoreCollection =
                collection.state === "app_store_active" ||
                collection.state === "app_store_paused";

              return (
                <div
                  key={row.id}
                  id={`quality-row-${row.id}`}
                  className={[
                    "grid gap-4 px-4 py-4 text-sm lg:grid-cols-[1.05fr_1.05fr_1fr_0.9fr_0.9fr_1.15fr_0.85fr] lg:items-center",
                    classes.row,
                  ].join(" ")}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <AdminProductLogo slug={row.slug} name={row.name}/>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${classes.dot}`} />
                      <p className="font-semibold text-admin-text dark:text-admin-text">{row.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      {row.slug} · {categoryLabel(row.category)} · {row.plan_count} 个套餐
                    </p>
                    <p className="mt-1 text-xs text-admin-text-faint dark:text-admin-text-muted">
                      极端价 {row.published_outlier_count} · 重复套餐 {row.duplicate_plan_group_count} · 税务缺口 {row.missing_tax_profile_count}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-admin-text-faint lg:hidden dark:text-admin-text-muted">地区覆盖</p>
                    <p className="font-semibold text-admin-text dark:text-admin-text">
                      {collection.coverageTitle}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-admin-chip-hover dark:bg-admin-chip-hover">
                      <div
                        className={[
                          "h-full rounded-full",
                          collection.coveragePercent === null
                            ? "w-full bg-admin-border-strong dark:bg-slate-600"
                            : "bg-emerald-500",
                        ].join(" ")}
                        style={
                          collection.coveragePercent === null
                            ? undefined
                            : { width: `${collection.coveragePercent}%` }
                        }
                      />
                    </div>
                    <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted" title={row.missing_country_codes || undefined}>
                      {collection.coverageDetail}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-admin-text-faint lg:hidden dark:text-admin-text-muted">自动审核</p>
                    <p className="font-semibold text-admin-text dark:text-admin-text">
                      {collection.reviewTitle}
                    </p>
                    <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      {collection.reviewDetail}
                    </p>
                    {isAppStoreCollection ? (
                      <p className="mt-1 line-clamp-2 text-xs text-admin-text-faint dark:text-admin-text-muted" title={formatIgnoredReasons(row.ignored_reason_codes)}>
                        历史样本：{formatIgnoredReasons(row.ignored_reason_codes)}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-admin-text-faint lg:hidden dark:text-admin-text-muted">采集状态</p>
                    <AdminStatusBadge
                      status={operationalStatus}
                      title={operationalAssessment?.reason}
                    />
                    <p className="mt-1 text-xs font-semibold text-admin-text-secondary dark:text-admin-text-secondary">{health.label}</p>
                    <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      {collection.taskSummary}
                      {isAppStoreCollection && row.stale_queue_count > 0 && unconsumedQueue
                        ? ` · 未消费 ${row.stale_queue_count}`
                        : ""}
                      {isAppStoreCollection && row.stale_refresh_retry_count > 0
                        ? ` · 已执行复采 ${row.stale_refresh_success_count}/3`
                        : ""}
                      {isAppStoreCollection && row.coverage_refresh_retry_count > 0
                        ? ` · 已执行补采 ${Math.min(row.coverage_refresh_success_count, 3)}/3`
                        : ""}
                      {isAppStoreCollection && row.anomaly_refresh_retry_count > 0
                        ? ` · 已执行异常复采 ${Math.min(row.anomaly_refresh_success_count, 3)}/3`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-admin-text-faint lg:hidden dark:text-admin-text-muted">下次采集</p>
                    <p className="font-semibold text-admin-text-body dark:text-admin-text-body">
                      {collection.nextCollection}
                    </p>
                    <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      {collection.lastCollectionLabel} {formatRelative(collection.lastCollectionAt)}
                    </p>
                    <p className="mt-1 text-xs text-admin-text-faint dark:text-admin-text-muted">
                      价格确认 {formatRelative(row.latest_price_checked_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-admin-text-faint lg:hidden dark:text-admin-text-muted">结论</p>
                    <p
                      className={`${health.reasonDetail ? "line-clamp-3" : ""} break-words font-semibold text-admin-text dark:text-admin-text`}
                      title={health.reasonDetail || undefined}
                    >
                      {health.reason}
                    </p>
                    <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      建议：{health.nextAction} · 最近运行 {row.latest_run_status || "暂无"} · {formatDuration(row.latest_run_age_seconds)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {collection.supportsManualCollection && row.running_run_count > 0 ?
                      <AdminLinkButton href={`/admin/collector-jobs?product=${encodeURIComponent(row.slug)}`}
                        variant="secondary" size="sm">查看运行进度</AdminLinkButton>
                      : collection.supportsManualCollection ? (
                      <AdminLinkButton href={productWorkflowHref("/admin/pipeline",row.slug)} variant="secondary" size="sm">进入产品队列</AdminLinkButton>
                    ) : null}
                    <AdminLink
                      href={`/admin/review?product=${encodeURIComponent(row.slug)}`}
                      className={adminButtonClassName({variant:"secondary",size:"sm",className:""})}
                    >
                      审核
                    </AdminLink>
                    <AdminLink
                      href={withAdminReturnTo(`/admin/data-quality/${encodeURIComponent(row.slug)}`,adminListLocation("/admin/data-quality",{...listParams,page:listPage},`quality-row-${row.id}`))}
                      className={adminButtonClassName({variant:"secondary",size:"sm",className:""})}
                    >
                      诊断
                    </AdminLink>
                    <AdminLink
                      href={`/admin/collector-jobs?product=${encodeURIComponent(row.slug)}`}
                      className={adminButtonClassName({variant:"secondary",size:"sm",className:""})}
                    >
                      任务
                    </AdminLink>
                  </div>
                </div>
              );
            })}

            {rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-admin-text-muted dark:text-admin-text-muted">
                暂无产品数据。先从线索入口添加产品，再生成采集任务。
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-admin-card bg-admin-surface-subtle px-4 py-3 text-xs leading-5 text-admin-text-muted dark:bg-admin-canvas/50 dark:text-admin-text-muted">
          <Clock3 size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
          <p>
            这页只做产品级归因，不替代明细审核。若某个产品长期处于“已排队”或“正在采集”，优先进入采集任务页查看后台脚本是否卡住。
          </p>
        </div>
      <AdminPagination {...list.pagination} ariaLabel="列表底部分页" className="mt-4" />
      </AdminCard>
    </div>
  );
}
