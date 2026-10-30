import AdminProductLogo from "@/components/admin/AdminProductLogo";
import CollectorExecutionStatus from "./CollectorExecutionStatus";
import ClaudeJobReuseWorkbench from "./ClaudeJobReuseWorkbench";
import { productWorkflowHref } from "@/lib/admin-product-next-action";
import { withAdminReturnTo, adminListLocation } from "@/lib/admin-workflow-context";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { parseAdminProductFilter } from "@/lib/admin-workflow-context";
import { adminButtonClassName } from "@/components/admin/AdminButton";
import AdminPagination from "@/components/admin/AdminPagination";
import { createAdminListView } from "@/lib/admin-list-params";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import AdminLink from "@/components/admin/AdminLink";
import { ArrowLeft } from "lucide-react";
import { AdminButton, AdminLinkButton } from "../../../components/admin/AdminButton";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import CollectorRunTimeline, { CollectorRunOutcomeSummary } from "../review/CollectorRunTimeline";
import { pauseCollectorJob, runCollectorJobNow } from "./actions";
import {
  availabilityClassName,
  availabilityLabel,
  collectorLabel,
  collectorRunOutput,
  diagnosisClassName,
  diagnosisLabel,
  formatDate,
  formatNextRun,
  formatRunDuration,
  groupCollectorJobs,
  isManuallyQueued,
  productPublishClassName,
  productPublishLabel,
  shortText,
  sourceTypeLabel,
  statusClassName,
  statusLabel,
  type AvailabilityRow,
  type JobRow,
  type RunRow,
} from "./model";

function jobExecutionInput(job: JobRow) {
  return {
    ...job,
    status: job.latest_run_status,
    job_status: job.status,
    error_message: job.latest_run_error || job.last_error,
    published_count: job.latest_published_price_count,
    pending_count: job.latest_pending_stability_count,
    isolated_count: job.latest_isolated_count,
  };
}

function claudeReuseHref(params:Record<string,string|undefined>,jobId:string) {
  const query=new URLSearchParams();
  for (const key of ["q","page","runPage","checkPage","returnTo"]) if (params[key]) query.set(key,params[key]!);
  query.set("product","claude");query.set("platform","web");query.set("reuseJob",jobId);
  return `/admin/collector-jobs?${query.toString()}#claude-job-reuse`;
}

export default function CollectorJobsView({
  jobs,
  listParams = {},
  runs,
  availabilityChecks,
}: {
  jobs: JobRow[];
  listParams?: Record<string, string | undefined>;
  runs: RunRow[];
  availabilityChecks: AvailabilityRow[];
}) {
  const filter = parseAdminProductFilter(listParams);
  const productGroups = groupCollectorJobs(jobs);
  const activeCount = jobs.filter((job) => job.status === "active").length;
  const runningProductCount = productGroups.filter((group) => group.hasRunningJob).length;
  const queuedProductCount = productGroups.filter((group) => group.hasQueuedJob).length;
  const failedProductCount = productGroups.filter((group) => group.hasFailedJob).length;
  const list = createAdminListView(productGroups, { basePath: "/admin/collector-jobs", params: listParams, pageSize: 10, pageParam: "page", id: "collector-products" });
  const runList = createAdminListView(runs, { basePath: "/admin/collector-jobs", params: listParams, pageSize: 25, pageParam: "runPage", id: "collector-runs" });
  const checkList = createAdminListView(availabilityChecks, { basePath: "/admin/collector-jobs", params: listParams, pageSize: 25, pageParam: "checkPage", id: "collector-checks" });
  return (
    <div>
      <AdminPageHeader
        eyebrow="采集系统"
        title="来源与运行记录"
        description="核对来源、计划和最近运行。日常采集从产品队列发起；这里保留底层任务供排查。"
      />

      <AdminPipelineSteps currentStep="collector" productSlug={filter.product || undefined} returnTo={listParams.returnTo} />

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        执行完成不等于价格已发布。这里区分来源巡检、价格观测、自动重试和正式更新。
        价格审核入口在{" "}
        <AdminLink href={filter.product ? `/admin/review?product=${encodeURIComponent(filter.product)}` : "/admin/review"} className="font-semibold underline underline-offset-4">
          审核中心
        </AdminLink>
        ，每轮产出和下一步以任务记录为准。
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminStatCard
          label="产品数"
          value={productGroups.length}
          helper="按产品聚合后的采集对象。"
        />
        <AdminStatCard
          label="运行中"
          value={runningProductCount}
          helper="已有后台运行记录，等待完成即可。"
        />
        <AdminStatCard
          label="已排队"
          value={queuedProductCount}
          helper="下一轮执行器会优先处理。"
        />
        <AdminStatCard
          label="异常产品"
          value={failedProductCount}
          helper="底层任务或最近运行失败。"
        />
      </div>

      <AdminCard className="mb-6">
        <AdminFilterBar action="/admin/collector-jobs" q={filter.q} filters={[
          {name:"platform",label:"采集来源",value:filter.platform,options:[
            {value:"ios",label:"App Store"},{value:"web",label:"官网 Web"}
          ]}
        ]} preserve={{product:filter.product}} clearHref="/admin/collector-jobs" />
        {filter.product ? <p className="text-sm text-admin-text-muted">当前产品：{filter.product}</p> : null}
      </AdminCard>
      {filter.product === "claude" ? <ClaudeJobReuseWorkbench key={listParams.reuseJob || "claude"}
        preferredJobId={listParams.reuseJob} jobs={jobs.filter(job=>["official_site","pricing_page"].includes(job.collector_kind || ""))
          .map(job=>({id:job.id,name:job.source_name || "Claude 官网任务",status:job.status,
            running:job.latest_run_status === "running",priceTask:job.collector_kind === "pricing_page",
            reviewMode:job.review_mode ?? 'unknown'}))}/>
        : null}
      <details open={Boolean(listParams.page || filter.product || filter.q)}
        className="mb-4 rounded-admin-card border border-admin-border bg-admin-surface">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-admin-text">
          产品采集列表 · {productGroups.length} 个产品
        </summary>
      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">产品采集列表</h2>
            <p className="mt-1 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
              按产品汇总 App Store、官网和定价页任务；展开后查看底层配置与调度。
            </p>
          </div>
          <p className="text-xs text-admin-text-faint">
            当前启用底层任务 {activeCount} 个，列表最多展示最近和高优先级的 160 个任务。
          </p>
        </div>

        <AdminPagination {...list.pagination} ariaLabel="列表分页" className="mb-4" id="collector-products" />
        <div className="overflow-x-auto rounded-xl border border-admin-border dark:border-admin-border-strong">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-admin-border bg-admin-surface-subtle text-xs text-admin-text-muted dark:border-admin-border-strong dark:bg-admin-chip dark:text-admin-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">任务来源</th>
                <th className="px-4 py-3 font-medium">入库状态</th>
                <th className="px-4 py-3 font-medium">最近采集</th>
                <th className="px-4 py-3 font-medium">执行与下一步</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border bg-admin-surface dark:bg-admin-surface">
              {list.items.map((group) => (
                <tr key={group.productId} className="align-top hover:bg-admin-surface-subtle dark:hover:bg-admin-chip">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <AdminProductLogo slug={group.productSlug} name={group.productName}/>
                      <div className="font-semibold text-admin-text">{group.productName}</div>
                    </div>
                    <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">{group.productSlug}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.hasRunningJob ? (
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800">
                          运行中
                        </span>
                      ) : null}
                      {group.hasQueuedJob ? (
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800">
                          已排队
                        </span>
                      ) : null}
                      {group.hasFailedJob ? (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800">
                          有异常
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex max-w-[260px] flex-wrap gap-2">
                      {group.sourceLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex rounded-full bg-admin-surface-subtle px-2 py-1 text-xs
                            font-medium text-admin-text-secondary ring-1 ring-admin-border
                            dark:bg-admin-chip dark:text-admin-text-secondary dark:ring-admin-border-strong"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-admin-text-faint">
                      共 {group.jobs.length} 个底层任务，启用 {group.activeJobCount} 个
                    </div>
                    <details className="mt-3 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      <summary className="cursor-pointer font-semibold text-admin-text-body dark:text-admin-text-body">
                        查看底层任务
                      </summary>
                      <div className="mt-3 space-y-2 rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
                        {group.jobs.map((job) => (
                          <div
                            key={job.id}
                            className="rounded-lg border border-admin-border bg-admin-surface p-3 dark:border-admin-border-strong dark:bg-admin-surface"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="font-semibold text-admin-text dark:text-admin-text-body">
                                  {collectorLabel(job.collector_kind)}
                                </div>
                                <div className="mt-1 text-admin-text-faint">
                                  {job.source_name || "未绑定来源"} · {sourceTypeLabel(job.source_type)}
                                </div>
                              </div>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusClassName(job.status)}`}
                              >
                                {statusLabel(job.status)}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-1 text-admin-text-muted md:grid-cols-2 dark:text-admin-text-muted">
                              <span>下次：{job.status === "active" ? formatNextRun(job.next_run_at) : "未启用自动调度"}</span>
                              <span>上次：{formatDate(job.last_run_at)}</span>
                            </div>
                            <div className="mt-3">
                              <CollectorExecutionStatus input={jobExecutionInput(job)} />
                            </div>
                            {group.productSlug === "claude" &&
                            ["official_site","pricing_page"].includes(job.collector_kind || "") ? (
                              <AdminLink href={claudeReuseHref(listParams,job.id)}
                                className={adminButtonClassName({variant:"secondary",size:"sm",className:"mt-3"})}>
                                {job.collector_kind === "pricing_page" ? "采集配置" : "复用配置"}
                              </AdminLink>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {!(group.productSlug === "claude" && job.collector_kind === "pricing_page") ? (
                              <AdminActionForm action={runCollectorJobNow}>
                                <input type="hidden" name="id" value={job.id} />
                                <AdminButton
                                  type="submit"
                                  size="sm"
                                  disabled={isManuallyQueued(job) || job.latest_run_status === "running"}
                                >
                                  {isManuallyQueued(job) ? "已排队" : "加入下一轮"}
                                </AdminButton>
                              </AdminActionForm>
                              ) : null}
                              {job.status !== "paused" ? (
                                <AdminActionForm action={pauseCollectorJob}>
                                  <input type="hidden" name="id" value={job.id} />
                                  <AdminButton type="submit" size="sm" variant="secondary">
                                    暂停
                                  </AdminButton>
                                </AdminActionForm>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${productPublishClassName(group)}`}
                    >
                      {productPublishLabel(group)}
                    </span>
                    <div className="mt-2 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                      正式价格 {group.publishedPriceCount} 条
                      <br />
                      待审核 {group.pendingObservationCount} 条
                      <br />
                      已通过样本 {group.approvedObservationCount} 条
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {group.latestJob?.latest_run_status ? (
                      <>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusClassName(group.latestJob.latest_run_status)}`}
                        >
                          {statusLabel(group.latestJob.latest_run_status)}
                        </span>
                        <div className="mt-1 text-xs text-admin-text-faint">
                          {formatDate(group.latestJob.latest_run_started_at)}
                        </div>
                        <div className="mt-2 text-xs text-admin-text-muted dark:text-admin-text-muted">
                          成功 {group.successCount} / 失败 {group.errorCount}
                        </div>
                        {diagnosisLabel(group.latestJob.latest_run_diagnosis) ? (
                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${diagnosisClassName(group.latestJob.latest_run_diagnosis)}`}
                            >
                              {diagnosisLabel(group.latestJob.latest_run_diagnosis)}
                            </span>
                          </div>
                        ) : null}
                        <div className="mt-2 max-w-[320px] text-xs leading-5 text-admin-text-faint">
                          {shortText(
                            collectorRunOutput({
                              status: group.latestJob.latest_run_status,
                              error: group.latestJob.latest_run_error,
                              output: group.latestJob.latest_run_output,
                              processId: group.latestJob.latest_process_id,
                              runnerState: group.latestJob.latest_runner_state,
                            })
                          )}
                        </div>
                        {group.latestJob.collector_kind === "app_store" ? <div className="mt-3">
                          <CollectorRunTimeline
                            compact
                            run={{
                              status: group.latestJob.latest_run_status,
                              runner_state: group.latestJob.latest_runner_state,
                              process_id: group.latestJob.latest_process_id,
                              error_message: group.latestJob.latest_run_error,
                              output_excerpt: group.latestJob.latest_run_output,
                              duration_ms: null,
                              run_age_seconds: group.latestJob.latest_run_age_seconds,
                            }}
                          />
                        </div> : null}
                        {group.latestJob.collector_kind === "app_store" &&
                        group.latestJob.latest_run_status === "succeeded" &&
                        group.latestJob.latest_has_review_outcome ? (
                          <div className="mt-3">
                            <CollectorRunOutcomeSummary
                              compact
                              run={{
                                status: group.latestJob.latest_run_status,
                                runner_state: group.latestJob.latest_runner_state,
                                process_id: group.latestJob.latest_process_id,
                                error_message: group.latestJob.latest_run_error,
                                output_excerpt: group.latestJob.latest_run_output,
                                duration_ms: null,
                                run_age_seconds: group.latestJob.latest_run_age_seconds,
                                observed_count: group.latestJob.latest_observed_count,
                                approved_observation_count:
                                  group.latestJob.latest_approved_count,
                                pending_observation_count:
                                  group.latestJob.latest_pending_stability_count,
                                anomaly_observation_count:
                                  group.latestJob.latest_isolated_count,
                                published_price_count:
                                  group.latestJob.latest_published_price_count,
                              }}
                            />
                            <p className="mt-2 text-[11px] leading-5 text-admin-text-faint">
                              本轮检查 {group.latestJob.latest_storefront_count} 个地区；下次计划：
                              {group.activeJobCount > 0 ? formatNextRun(group.nextRunAt) : "未启用自动调度"}
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="text-xs text-admin-text-faint">暂无运行记录</div>
                    )}
                  </td>
                  <td className="min-w-[220px] px-4 py-4">
                    {group.latestJob || group.jobs[0] ? (
                      <CollectorExecutionStatus input={jobExecutionInput(group.latestJob || group.jobs[0])} />
                    ) : null}
                    <div className="mt-2 text-xs text-admin-text-faint">
                      下次计划：{group.activeJobCount > 0 ? formatNextRun(group.nextRunAt) : "未启用自动调度"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <AdminLinkButton href={withAdminReturnTo(
                        productWorkflowHref("/admin/pipeline",group.productSlug),
                        adminListLocation("/admin/collector-jobs",listParams,"collector-products")
                      )} variant="secondary" size="sm">进入产品队列</AdminLinkButton>
                      <AdminLink
                        href={withAdminReturnTo(`/admin/data-quality/${encodeURIComponent(group.productSlug)}`,adminListLocation("/admin/collector-jobs",listParams,"collector-products"))}
                        className="rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5
                          text-xs font-semibold text-admin-text-secondary transition hover:border-blue-200
                          hover:bg-blue-50 hover:text-blue-700 dark:border-admin-border-strong
                          dark:bg-admin-surface dark:text-admin-text-secondary dark:hover:border-blue-800
                          dark:hover:bg-blue-950 dark:hover:text-blue-300"
                      >
                        数据诊断
                      </AdminLink>
                      <AdminLink
                        href={withAdminReturnTo(`/admin/products/${group.productId}/edit`,adminListLocation("/admin/collector-jobs",listParams,"collector-products"))}
                        className="rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5
                          text-xs font-semibold text-admin-text-secondary transition hover:bg-admin-surface-subtle
                          dark:border-admin-border-strong dark:bg-admin-surface
                          dark:text-admin-text-secondary dark:hover:bg-admin-chip"
                      >
                        编辑
                      </AdminLink>
                    </div>
                  </td>
                </tr>
              ))}

              {productGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-lg">
                      <h3 className="text-base font-semibold text-admin-text dark:text-admin-text">
                        还没有可采集任务
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
                        先在线索入口把候选服务加入服务库，系统会自动生成对应采集任务。
                      </p>
                      <div className="mt-5 flex justify-center">
                        <AdminLinkButton
                          href="/admin/discovery"
                        >
                          去线索入口生成任务
                        </AdminLinkButton>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      <AdminPagination {...list.pagination} ariaLabel="列表底部分页" className="mt-4" />
      </AdminCard>
      </details>

      <details open={Boolean(listParams.runPage)}
        className="mb-4 rounded-admin-card border border-admin-border bg-admin-surface">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-admin-text">
          最近采集运行 · 最近 {runs.length} 条
        </summary>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">最近采集运行</h2>
            <p className="mt-1 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
              这里显示脚本是否真的跑过。运行中的任务会先出现，完成后会补上耗时和输出摘要。
            </p>
          </div>
          <AdminLink
            href={filter.product ? `/admin/review?product=${encodeURIComponent(filter.product)}` : "/admin/review"}
            className="rounded-lg border border-admin-border bg-admin-surface px-4 py-2 text-sm font-semibold
              text-admin-text-body transition hover:bg-admin-surface-subtle dark:border-admin-border-strong
              dark:bg-admin-surface dark:text-admin-text-body dark:hover:bg-admin-chip"
          >
            去审核中心
          </AdminLink>
        </div>

        <AdminPagination {...runList.pagination} id="collector-runs" ariaLabel="记录分页" className="mb-4" />
        <div className="overflow-x-auto rounded-xl border border-admin-border dark:border-admin-border-strong">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-admin-border bg-admin-surface-subtle text-xs text-admin-text-muted dark:border-admin-border-strong dark:bg-admin-chip dark:text-admin-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">开始时间</th>
                <th className="px-4 py-3 font-medium">耗时</th>
                <th className="px-4 py-3 font-medium">输出</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border bg-admin-surface dark:bg-admin-surface">
              {runList.items.map((run) => (
                <tr key={run.id} className="align-top hover:bg-admin-surface-subtle dark:hover:bg-admin-chip">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {run.product_slug ? <AdminProductLogo slug={run.product_slug} name={run.product_name}/> : null}
                      <div className="font-semibold text-admin-text">{run.product_name || "未知产品"}</div>
                    </div>
                    <div className="mt-1 text-xs text-admin-text-faint">{run.product_slug || run.job_id}</div>
                    {run.product_slug ? (
                      <AdminLink
                        href={`/admin/data-quality/${encodeURIComponent(run.product_slug)}`}
                        className={adminButtonClassName({variant:"secondary",size:"sm",className:"mt-2"})}
                      >
                        数据诊断
                      </AdminLink>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-admin-chip px-2 py-1 text-xs font-medium text-admin-text-secondary dark:bg-admin-chip dark:text-admin-text-secondary">
                      {collectorLabel(run.collector_kind)}
                    </span>
                    {run.source_name ? (
                      <div className="mt-2 text-xs text-admin-text-faint">{run.source_name}</div>
                    ) : null}
                  </td>
                  <td className="min-w-[220px] px-4 py-4">
                    <CollectorExecutionStatus input={{
                      ...run,
                      published_count: run.published_price_count,
                      pending_count: run.pending_observation_count,
                      isolated_count: run.anomaly_observation_count,
                    }} />
                    {diagnosisLabel(run.diagnosis) ? (
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${diagnosisClassName(run.diagnosis)}`}
                        >
                          {diagnosisLabel(run.diagnosis)}
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-xs text-admin-text-muted dark:text-admin-text-muted">
                    {formatDate(run.started_at)}
                  </td>
                  <td className="px-4 py-4 text-xs text-admin-text-muted dark:text-admin-text-muted">
                    {formatRunDuration(run)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[520px] text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                      {collectorRunOutput({
                        status: run.status,
                        error: run.error_message,
                        output: run.output_excerpt,
                        processId: run.process_id,
                        runnerState: run.runner_state,
                      })}
                    </div>
                    {run.collector_kind === "app_store" ? <>
                      <div className="mt-3">
                        <CollectorRunTimeline compact run={run} />
                      </div>
                      <div className="mt-3">
                        <CollectorRunOutcomeSummary compact run={run} />
                      </div>
                    </> : null}
                  </td>
                </tr>
              ))}

              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-admin-text-muted dark:text-admin-text-muted">
                    暂无采集运行记录。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      <AdminPagination {...runList.pagination} ariaLabel="记录底部分页" className="mt-4" />
      </AdminCard>
      </details>

      <details open={Boolean(listParams.checkPage)}
        className="rounded-admin-card border border-admin-border bg-admin-surface">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-admin-text">
          App Store 地区可用性 · 最近 {availabilityChecks.length} 条
        </summary>

      <AdminCard>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">App Store 地区可用性</h2>
          <p className="mt-1 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
            这里不是价格审核，而是解释每个国家为什么有价格、无价格或采集失败。
          </p>
        </div>

        <AdminPagination {...checkList.pagination} id="collector-checks" ariaLabel="记录分页" className="mb-4" />
        <div className="overflow-x-auto rounded-xl border border-admin-border dark:border-admin-border-strong">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-admin-border bg-admin-surface-subtle text-xs text-admin-text-muted dark:border-admin-border-strong dark:bg-admin-chip dark:text-admin-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">地区</th>
                <th className="px-4 py-3 font-medium">可用性</th>
                <th className="px-4 py-3 font-medium">采集项</th>
                <th className="px-4 py-3 font-medium">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border bg-admin-surface dark:bg-admin-surface">
              {checkList.items.map((check) => (
                <tr key={check.id} className="align-top hover:bg-admin-surface-subtle dark:hover:bg-admin-chip">
                  <td className="px-4 py-4 text-xs text-admin-text-muted dark:text-admin-text-muted">
                    {formatDate(check.checked_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <AdminProductLogo slug={check.product_slug} name={check.product_name}/>
                      <div className="font-semibold text-admin-text">{check.product_name}</div>
                    </div>
                    <div className="mt-1 text-xs text-admin-text-faint">{check.product_slug}</div>
                    <AdminLink
                      href={`/admin/data-quality/${encodeURIComponent(check.product_slug)}`}
                      className={adminButtonClassName({variant:"secondary",size:"sm",className:"mt-2"})}
                    >
                      数据诊断
                    </AdminLink>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-admin-text-body dark:text-admin-text-body">
                      {check.country_name_zh || check.country_code}
                    </div>
                    <div className="mt-1 text-xs text-admin-text-faint">{check.country_code}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${availabilityClassName(check.status)}`}
                    >
                      {availabilityLabel(check.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                    总项 {check.item_count}
                    <br />
                    订阅 {check.subscription_item_count}
                    <br />
                    忽略 {check.ignored_item_count}
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[420px] text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                      {shortText(check.reason, "暂无说明")}
                    </div>
                  </td>
                </tr>
              ))}

              {availabilityChecks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-admin-text-muted dark:text-admin-text-muted">
                    暂无 App Store 可用性检查记录。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      <AdminPagination {...checkList.pagination} ariaLabel="记录底部分页" className="mt-4" />
      </AdminCard>
      </details>

      <div className="mt-6">
        <AdminLink href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-admin-text hover:text-blue-700 dark:text-admin-text dark:hover:text-blue-300">
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.8} />
          返回运营驾驶舱
        </AdminLink>
      </div>
    </div>
  );
}
