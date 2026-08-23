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
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";
import { pauseCollectorJob, runCollectorJobNow } from "./actions";
import {
  autoReviewSummary,
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
  productActionLabel,
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

export default function CollectorJobsView({
  jobs,
  runs,
  availabilityChecks,
}: {
  jobs: JobRow[];
  runs: RunRow[];
  availabilityChecks: AvailabilityRow[];
}) {
  const productGroups = groupCollectorJobs(jobs);
  const activeCount = jobs.filter((job) => job.status === "active").length;
  const runningProductCount = productGroups.filter((group) => group.hasRunningJob).length;
  const queuedProductCount = productGroups.filter((group) => group.hasQueuedJob).length;
  const failedProductCount = productGroups.filter((group) => group.hasFailedJob).length;
  return (
    <div>
      <AdminPageHeader
        eyebrow="采集系统"
        title="产品采集状态中心"
        description="这里按产品展示采集、自动审核和正式入库状态。日常只需要点某个产品的采集按钮；底层任务留在展开详情里排查。"
      />

      <AdminPipelineSteps currentStep="collector" />

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
        主流程是：线索入库 → 生成产品采集任务 → 按产品触发采集 → 自动审核稳定价格 → 写入正式价格库。
        价格审核入口仍在{" "}
        <AdminLink href="/admin/review" className="font-bold underline underline-offset-4">
          审核中心
        </AdminLink>
        ，这里负责看后台到底有没有排队、运行和产出。
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

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">产品采集列表</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              一个产品只保留一个主要按钮。系统会汇总它下面的 App Store、官网或定价页任务，不再把几十页底层记录直接摊开。
            </p>
          </div>
          <p className="text-xs text-slate-400">
            当前启用底层任务 {activeCount} 个，列表最多展示最近和高优先级的 160 个任务。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">任务来源</th>
                <th className="px-4 py-3 font-medium">入库状态</th>
                <th className="px-4 py-3 font-medium">最近采集</th>
                <th className="px-4 py-3 font-medium">自动审核</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {productGroups.map((group) => (
                <tr key={group.productId} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{group.productName}</div>
                    <div className="mt-1 text-xs text-slate-500">{group.productSlug}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.hasRunningJob ? (
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                          运行中
                        </span>
                      ) : null}
                      {group.hasQueuedJob ? (
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                          已排队
                        </span>
                      ) : null}
                      {group.hasFailedJob ? (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
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
                          className="inline-flex rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      共 {group.jobs.length} 个底层任务，启用 {group.activeJobCount} 个
                    </div>
                    <details className="mt-3 text-xs text-slate-500">
                      <summary className="cursor-pointer font-semibold text-slate-700">
                        查看底层任务
                      </summary>
                      <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                        {group.jobs.map((job) => (
                          <div
                            key={job.id}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {collectorLabel(job.collector_kind)}
                                </div>
                                <div className="mt-1 text-slate-400">
                                  {job.source_name || "未绑定来源"} · {sourceTypeLabel(job.source_type)}
                                </div>
                              </div>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusClassName(job.status)}`}
                              >
                                {statusLabel(job.status)}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-1 text-slate-500 md:grid-cols-2">
                              <span>下次：{formatDate(job.next_run_at)}</span>
                              <span>上次：{formatDate(job.last_run_at)}</span>
                            </div>
                            {job.last_error ? (
                              <p className="mt-2 leading-5 text-red-600">{job.last_error}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <form action={runCollectorJobNow}>
                                <input type="hidden" name="id" value={job.id} />
                                <AdminButton
                                  type="submit"
                                  size="sm"
                                  disabled={isManuallyQueued(job) || job.latest_run_status === "running"}
                                >
                                  {isManuallyQueued(job) ? "已排队" : "加入下一轮"}
                                </AdminButton>
                              </form>
                              {job.status !== "paused" ? (
                                <form action={pauseCollectorJob}>
                                  <input type="hidden" name="id" value={job.id} />
                                  <AdminButton type="submit" size="sm" variant="secondary">
                                    暂停
                                  </AdminButton>
                                </form>
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
                    <div className="mt-2 text-xs leading-5 text-slate-500">
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
                        <div className="mt-1 text-xs text-slate-400">
                          {formatDate(group.latestJob.latest_run_started_at)}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
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
                        <div className="mt-2 max-w-[320px] text-xs leading-5 text-slate-400">
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
                        <div className="mt-3">
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
                        </div>
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
                            <p className="mt-2 text-[11px] leading-5 text-slate-400">
                              本轮检查 {group.latestJob.latest_storefront_count} 个地区；下次计划：
                              {formatNextRun(group.nextRunAt)}
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="text-xs text-slate-400">暂无运行记录</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[300px] text-xs leading-5 text-slate-600">
                      {autoReviewSummary(group)}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      下次计划：{formatNextRun(group.nextRunAt)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ManualCollectionProgressForm
                        productSlug={group.productSlug}
                        buttonLabel={productActionLabel(group)}
                        pendingLabel="正在采集"
                        disabled={group.hasQueuedJob || group.hasAppStoreRunningJob}
                      />
                      <AdminLink
                        href={`/admin/data-quality/${encodeURIComponent(group.productSlug)}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        数据诊断
                      </AdminLink>
                      <AdminLink
                        href={`/admin/products/${group.productId}/edit`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
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
                      <h3 className="text-base font-bold text-slate-950">
                        还没有可采集任务
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
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
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">最近采集运行</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              这里显示脚本是否真的跑过。运行中的任务会先出现，完成后会补上耗时和输出摘要。
            </p>
          </div>
          <AdminLink
            href="/admin/review"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            去审核中心
          </AdminLink>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">开始时间</th>
                <th className="px-4 py-3 font-medium">耗时</th>
                <th className="px-4 py-3 font-medium">输出</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {runs.map((run) => (
                <tr key={run.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">
                      {run.product_name || "未知产品"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{run.product_slug || run.job_id}</div>
                    {run.product_slug ? (
                      <AdminLink
                        href={`/admin/data-quality/${encodeURIComponent(run.product_slug)}`}
                        className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        数据诊断
                      </AdminLink>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {collectorLabel(run.collector_kind)}
                    </span>
                    {run.source_name ? (
                      <div className="mt-2 text-xs text-slate-400">{run.source_name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClassName(run.status)}`}
                    >
                      {statusLabel(run.status)}
                    </span>
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
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {formatDate(run.started_at)}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {formatRunDuration(run)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[520px] text-xs leading-5 text-slate-500">
                      {collectorRunOutput({
                        status: run.status,
                        error: run.error_message,
                        output: run.output_excerpt,
                        processId: run.process_id,
                        runnerState: run.runner_state,
                      })}
                    </div>
                    <div className="mt-3">
                      <CollectorRunTimeline compact run={run} />
                    </div>
                    <div className="mt-3">
                      <CollectorRunOutcomeSummary compact run={run} />
                    </div>
                  </td>
                </tr>
              ))}

              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    暂无采集运行记录。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">App Store 地区可用性</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            这里不是价格审核，而是解释每个国家为什么有价格、无价格或采集失败。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">产品</th>
                <th className="px-4 py-3 font-medium">地区</th>
                <th className="px-4 py-3 font-medium">可用性</th>
                <th className="px-4 py-3 font-medium">采集项</th>
                <th className="px-4 py-3 font-medium">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {availabilityChecks.map((check) => (
                <tr key={check.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {formatDate(check.checked_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{check.product_name}</div>
                    <div className="mt-1 text-xs text-slate-400">{check.product_slug}</div>
                    <AdminLink
                      href={`/admin/data-quality/${encodeURIComponent(check.product_slug)}`}
                      className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      数据诊断
                    </AdminLink>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-700">
                      {check.country_name_zh || check.country_code}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{check.country_code}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${availabilityClassName(check.status)}`}
                    >
                      {availabilityLabel(check.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs leading-5 text-slate-500">
                    总项 {check.item_count}
                    <br />
                    订阅 {check.subscription_item_count}
                    <br />
                    忽略 {check.ignored_item_count}
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[420px] text-xs leading-5 text-slate-500">
                      {shortText(check.reason, "暂无说明")}
                    </div>
                  </td>
                </tr>
              ))}

              {availabilityChecks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    暂无 App Store 可用性检查记录。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <div className="mt-6">
        <AdminLink href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-blue-700">
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.8} />
          返回运营驾驶舱
        </AdminLink>
      </div>
    </div>
  );
}
