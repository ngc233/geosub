import AdminProductLogo from "@/components/admin/AdminProductLogo";
import CollectorExecutionStatus from "./CollectorExecutionStatus";
import { productWorkflowHref } from "@/lib/admin-product-next-action";
import { withAdminReturnTo, adminListLocation, parseAdminProductFilter } from "@/lib/admin-workflow-context";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { AdminButton, AdminLinkButton, adminButtonClassName } from "@/components/admin/AdminButton";
import AdminPagination from "@/components/admin/AdminPagination";
import { createAdminListView } from "@/lib/admin-list-params";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import AdminLink from "@/components/admin/AdminLink";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminCard";
import { AdminBadge } from "@/components/admin/AdminBadge";
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

export default function CollectorJobsView({
  jobs,
  listParams = {},
  runs,
  availabilityChecks,
  embedded = false,
  basePath = "/admin/pipeline",
}: {
  jobs: JobRow[];
  listParams?: Record<string, string | undefined>;
  runs: RunRow[];
  availabilityChecks: AvailabilityRow[];
  embedded?: boolean;
  basePath?: string;
}) {
  const effectiveParams = embedded ? { ...listParams, tab: "runs" } : listParams;
  const clearHref = embedded ? "/admin/pipeline?tab=runs" : basePath;
  const filter = parseAdminProductFilter(effectiveParams);
  const productGroups = groupCollectorJobs(jobs);
  const activeCount = jobs.filter((job) => job.status === "active").length;
  const runningProductCount = productGroups.filter((group) => group.hasRunningJob).length;
  const queuedProductCount = productGroups.filter((group) => group.hasQueuedJob).length;
  const failedProductCount = productGroups.filter((group) => group.hasFailedJob).length;

  const list = createAdminListView(productGroups, {
    basePath,
    params: effectiveParams,
    pageSize: 10,
    pageParam: "page",
    id: "collector-products",
  });
  const runList = createAdminListView(runs, {
    basePath,
    params: effectiveParams,
    pageSize: 25,
    pageParam: "runPage",
    id: "collector-runs",
  });
  const checkList = createAdminListView(availabilityChecks, {
    basePath,
    params: effectiveParams,
    pageSize: 25,
    pageParam: "checkPage",
    id: "collector-checks",
  });

  return (
    <div className="space-y-6">
      {!embedded ? (
        <AdminPageHeader
          eyebrow="采集中心"
          title="运行与任务记录"
          description="核对 App Store 与官网来源的采集调度、实时运行日志和地区可用性。"
        />
      ) : null}

      <div className="grid grid-cols-2 divide-y divide-admin-border rounded-admin-card border border-admin-border bg-admin-surface sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-admin-text-muted">配置任务产品</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-admin-text">{productGroups.length}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-admin-text-muted">运行中</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-admin-info">{runningProductCount}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-admin-text-muted">已排队</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-admin-text">{queuedProductCount}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-admin-text-muted">最近失败</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-admin-danger">{failedProductCount}</div>
        </div>
      </div>

      <AdminCard>
        <AdminFilterBar
          action={basePath}
          q={filter.q}
          searchLabel="搜索产品"
          searchPlaceholder="产品名称或 slug"
          filters={[
            {
              name: "platform",
              label: "采集来源",
              value: filter.platform,
              options: [
                { value: "ios", label: "App Store" },
                { value: "web", label: "官网 Web" },
              ],
            },
          ]}
          preserve={{
            tab: embedded ? "runs" : undefined,
            product: filter.product || undefined,
          }}
          clearHref={clearHref}
        />
        {filter.product ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-admin-text-muted">
            <span>当前筛选产品：<strong className="font-semibold text-admin-text">{filter.product}</strong></span>
            <AdminLink href={clearHref} className="font-medium text-admin-accent hover:underline">
              查看全部产品记录
            </AdminLink>
            <AdminLink
              href={`/admin/review?product=${encodeURIComponent(filter.product)}`}
              className="font-medium text-admin-accent hover:underline"
            >
              查看该产品待审异常
            </AdminLink>
          </div>
        ) : null}
      </AdminCard>

      <section id="collector-runs" className="scroll-mt-24">
        <AdminCard>
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-admin-text">最近采集运行</h2>
              <p className="mt-1 text-xs leading-5 text-admin-text-muted">
                全站统一的运行日志（运行中、已完成、采集失败与自动审核结果）。价格异常决策请前往异常审核台。
              </p>
            </div>
            <AdminLinkButton
              href={filter.product ? `/admin/review?product=${encodeURIComponent(filter.product)}` : "/admin/review"}
              variant="secondary"
              size="sm"
            >
              前往异常审核台
            </AdminLinkButton>
          </div>

          <AdminPagination {...runList.pagination} id="collector-runs-top" ariaLabel="记录分页" className="mb-3" />
          <div className="overflow-x-auto rounded-admin-card border border-admin-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-admin-border bg-admin-surface-subtle text-xs text-admin-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">产品</th>
                  <th className="px-4 py-3 font-medium">来源</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">开始时间</th>
                  <th className="px-4 py-3 font-medium">耗时</th>
                  <th className="px-4 py-3 font-medium">输出与阶段</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-surface">
                {runList.items.map((run) => (
                  <tr key={run.id} className="align-top hover:bg-admin-surface-subtle">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {run.product_slug ? <AdminProductLogo slug={run.product_slug} name={run.product_name} /> : null}
                        <div className="font-semibold text-admin-text">{run.product_name || "未知产品"}</div>
                      </div>
                      <div className="mt-1 font-mono text-xs text-admin-text-faint">{run.product_slug || run.job_id}</div>
                      {run.product_slug ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <AdminLink
                            href={`/admin/data-quality/${encodeURIComponent(run.product_slug)}`}
                            className="text-xs font-medium text-admin-accent hover:underline"
                          >
                            数据诊断
                          </AdminLink>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminBadge variant="neutral">{collectorLabel(run.collector_kind)}</AdminBadge>
                      {run.source_name ? (
                        <div className="mt-1.5 text-xs text-admin-text-faint">{run.source_name}</div>
                      ) : null}
                    </td>
                    <td className="min-w-[220px] px-4 py-3.5">
                      <CollectorExecutionStatus
                        input={{
                          ...run,
                          published_count: run.published_price_count,
                          pending_count: run.pending_observation_count,
                          isolated_count: run.anomaly_observation_count,
                        }}
                      />
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
                    <td className="px-4 py-3.5 text-xs tabular-nums text-admin-text-muted">
                      {formatDate(run.started_at)}
                    </td>
                    <td className="px-4 py-3.5 text-xs tabular-nums text-admin-text-muted">
                      {formatRunDuration(run)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-[520px] text-xs leading-5 text-admin-text-muted">
                        {collectorRunOutput({
                          status: run.status,
                          error: run.error_message,
                          output: run.output_excerpt,
                          processId: run.process_id,
                          runnerState: run.runner_state,
                        })}
                      </div>
                      {run.collector_kind === "app_store" ? (
                        <>
                          <div className="mt-2.5">
                            <CollectorRunTimeline compact run={run} />
                          </div>
                          <div className="mt-2.5">
                            <CollectorRunOutcomeSummary compact run={run} />
                          </div>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}

                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-admin-text-muted">
                      暂无采集运行记录。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <AdminPagination {...runList.pagination} ariaLabel="记录底部分页" className="mt-3" />
        </AdminCard>
      </section>

      <details
        id="collector-products"
        open={Boolean(effectiveParams.page || filter.product || filter.q || filter.platform)}
        className="scroll-mt-24 rounded-admin-card border border-admin-border bg-admin-surface"
      >
        <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-admin-text">
          <span>底层采集任务配置 · {productGroups.length} 个产品</span>
          <span className="text-xs font-medium tabular-nums text-admin-text-muted">启用 {activeCount} 个底层任务</span>
        </summary>
        <div className="border-t border-admin-border p-4">
          <AdminPagination {...list.pagination} ariaLabel="列表分页" className="mb-3" id="collector-products-top" />
          <div className="overflow-x-auto rounded-admin-card border border-admin-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-admin-border bg-admin-surface-subtle text-xs text-admin-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">产品</th>
                  <th className="px-4 py-3 font-medium">任务来源与调度</th>
                  <th className="px-4 py-3 font-medium">入库状态</th>
                  <th className="px-4 py-3 font-medium">最近采集</th>
                  <th className="px-4 py-3 font-medium">执行与下一步</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-surface">
                {list.items.map((group) => (
                  <tr key={group.productId} className="align-top hover:bg-admin-surface-subtle">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <AdminProductLogo slug={group.productSlug} name={group.productName} />
                        <div className="font-semibold text-admin-text">{group.productName}</div>
                      </div>
                      <div className="mt-1 font-mono text-xs text-admin-text-muted">{group.productSlug}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {group.hasRunningJob ? <AdminBadge variant="info">运行中</AdminBadge> : null}
                        {group.hasQueuedJob ? <AdminBadge variant="info">已排队</AdminBadge> : null}
                        {group.hasFailedJob ? <AdminBadge variant="danger">有异常</AdminBadge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex max-w-[260px] flex-wrap gap-1.5">
                        {group.sourceLabels.map((label) => (
                          <AdminBadge key={label} variant="neutral">
                            {label}
                          </AdminBadge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-admin-text-faint">
                        共 {group.jobs.length} 个底层任务，启用 {group.activeJobCount} 个
                      </div>
                      <details className="mt-2.5 text-xs text-admin-text-muted">
                        <summary className="cursor-pointer font-medium text-admin-text-body">
                          展开底层任务调度
                        </summary>
                        <div className="mt-2.5 space-y-2 rounded-admin-card bg-admin-surface-subtle p-2.5">
                          {group.jobs.map((job) => (
                            <div
                              key={job.id}
                              className="rounded-md border border-admin-border bg-admin-surface p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-admin-text">
                                    {collectorLabel(job.collector_kind)}
                                  </div>
                                  <div className="mt-0.5 text-admin-text-faint">
                                    {job.source_name || "未绑定来源"} · {sourceTypeLabel(job.source_type)}
                                  </div>
                                </div>
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusClassName(job.status)}`}
                                >
                                  {statusLabel(job.status)}
                                </span>
                              </div>
                              <div className="mt-2 grid gap-1 text-admin-text-muted md:grid-cols-2">
                                <span>下次：{job.status === "active" ? formatNextRun(job.next_run_at) : "未启用自动调度"}</span>
                                <span>上次：{formatDate(job.last_run_at)}</span>
                              </div>
                              <div className="mt-2.5">
                                <CollectorExecutionStatus input={jobExecutionInput(job)} />
                              </div>
                              <div className="mt-2.5 flex flex-wrap gap-2">
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
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${productPublishClassName(group)}`}
                      >
                        {productPublishLabel(group)}
                      </span>
                      <div className="mt-2 text-xs leading-5 tabular-nums text-admin-text-muted">
                        正式价格 {group.publishedPriceCount} 条
                        <br />
                        待审核 {group.pendingObservationCount} 条
                        <br />
                        已通过样本 {group.approvedObservationCount} 条
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {group.latestJob?.latest_run_status ? (
                        <>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusClassName(group.latestJob.latest_run_status)}`}
                          >
                            {statusLabel(group.latestJob.latest_run_status)}
                          </span>
                          <div className="mt-1 text-xs tabular-nums text-admin-text-faint">
                            {formatDate(group.latestJob.latest_run_started_at)}
                          </div>
                          <div className="mt-1.5 text-xs tabular-nums text-admin-text-muted">
                            成功 {group.successCount} / 失败 {group.errorCount}
                          </div>
                          {diagnosisLabel(group.latestJob.latest_run_diagnosis) ? (
                            <div className="mt-1.5">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${diagnosisClassName(group.latestJob.latest_run_diagnosis)}`}
                              >
                                {diagnosisLabel(group.latestJob.latest_run_diagnosis)}
                              </span>
                            </div>
                          ) : null}
                          <div className="mt-1.5 max-w-[300px] text-xs leading-5 text-admin-text-faint">
                            {shortText(
                              collectorRunOutput({
                                status: group.latestJob.latest_run_status,
                                error: group.latestJob.latest_run_error,
                                output: group.latestJob.latest_run_output,
                                processId: group.latestJob.latest_process_id,
                                runnerState: group.latestJob.latest_runner_state,
                              }),
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-admin-text-faint">暂无运行记录</div>
                      )}
                    </td>
                    <td className="min-w-[220px] px-4 py-3.5">
                      {group.latestJob || group.jobs[0] ? (
                        <CollectorExecutionStatus input={jobExecutionInput(group.latestJob || group.jobs[0])} />
                      ) : null}
                      <div className="mt-2 text-xs text-admin-text-faint">
                        下次计划：{group.activeJobCount > 0 ? formatNextRun(group.nextRunAt) : "未启用自动调度"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <AdminLinkButton
                          href={withAdminReturnTo(
                            productWorkflowHref("/admin/pipeline", group.productSlug),
                            adminListLocation(basePath, effectiveParams, "collector-products"),
                          )}
                          variant="secondary"
                          size="sm"
                        >
                          待采队列
                        </AdminLinkButton>
                        <AdminLink
                          href={withAdminReturnTo(
                            `/admin/products/${group.productId}/edit?tab=sources`,
                            adminListLocation(basePath, effectiveParams, "collector-products"),
                          )}
                          className={adminButtonClassName({ variant: "secondary", size: "sm" })}
                        >
                          来源配置
                        </AdminLink>
                      </div>
                    </td>
                  </tr>
                ))}

                {productGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="mx-auto max-w-lg">
                        <h3 className="text-sm font-semibold text-admin-text">还没有可采集任务</h3>
                        <p className="mt-1.5 text-xs leading-5 text-admin-text-muted">
                          先在「线索录入」把候选服务加入服务库，系统会自动生成对应采集任务。
                        </p>
                        <div className="mt-4 flex justify-center">
                          <AdminLinkButton href="/admin/pipeline?tab=discovery" size="sm">
                            去线索录入
                          </AdminLinkButton>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <AdminPagination {...list.pagination} ariaLabel="列表底部分页" className="mt-3" />
        </div>
      </details>

      <details
        id="collector-checks"
        open={Boolean(effectiveParams.checkPage)}
        className="scroll-mt-24 rounded-admin-card border border-admin-border bg-admin-surface"
      >
        <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-admin-text">
          <span>App Store 地区可用性检查</span>
          <span className="text-xs font-medium tabular-nums text-admin-text-muted">最近 {availabilityChecks.length} 条</span>
        </summary>
        <div className="border-t border-admin-border p-4">
          <AdminPagination {...checkList.pagination} id="collector-checks-top" ariaLabel="记录分页" className="mb-3" />
          <div className="overflow-x-auto rounded-admin-card border border-admin-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-admin-border bg-admin-surface-subtle text-xs text-admin-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">时间</th>
                  <th className="px-4 py-3 font-medium">产品</th>
                  <th className="px-4 py-3 font-medium">地区</th>
                  <th className="px-4 py-3 font-medium">可用性</th>
                  <th className="px-4 py-3 font-medium">采集项</th>
                  <th className="px-4 py-3 font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-surface">
                {checkList.items.map((check) => (
                  <tr key={check.id} className="align-top hover:bg-admin-surface-subtle">
                    <td className="px-4 py-3.5 text-xs tabular-nums text-admin-text-muted">
                      {formatDate(check.checked_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <AdminProductLogo slug={check.product_slug} name={check.product_name} />
                        <div className="font-semibold text-admin-text">{check.product_name}</div>
                      </div>
                      <div className="mt-1 font-mono text-xs text-admin-text-faint">{check.product_slug}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-admin-text-body">
                        {check.country_name_zh || check.country_code}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-admin-text-faint">{check.country_code}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${availabilityClassName(check.status)}`}
                      >
                        {availabilityLabel(check.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs leading-5 tabular-nums text-admin-text-muted">
                      总项 {check.item_count} · 订阅 {check.subscription_item_count} · 忽略 {check.ignored_item_count}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-[420px] text-xs leading-5 text-admin-text-muted">
                        {shortText(check.reason, "暂无说明")}
                      </div>
                    </td>
                  </tr>
                ))}

                {availabilityChecks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-admin-text-muted">
                      暂无 App Store 可用性检查记录。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <AdminPagination {...checkList.pagination} ariaLabel="记录底部分页" className="mt-3" />
        </div>
      </details>
    </div>
  );
}
