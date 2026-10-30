"use client";

import AdminProductLogo from "@/components/admin/AdminProductLogo";

import { adminButtonClassName } from "@/components/admin/AdminButton";

import AdminLink from "@/components/admin/AdminLink";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { withAdminReturnTo } from "@/lib/admin-workflow-context";
import { buildCollectionProgressState, type CollectionProgressState } from "./collection-progress";
import CollectorRunTimeline, { CollectorRunOutcomeSummary } from "./CollectorRunTimeline";
import { formatDate } from "./review-display";
import type { CollectorRunHistoryRow } from "./types";

type Props = {
  pendingCount?:number;
  rows: CollectorRunHistoryRow[];
  collectionRun: string | null;
  collectionScope: string | null;
  productQuery: string;
  runId?:string|null;
  returnTo?: string;
  productSlug?:string;
};

function statusClassName(status: string) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800";
  if (status === "failed") return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800";
  if (status === "skipped") return "bg-admin-surface-subtle text-admin-text-secondary ring-admin-border dark:bg-admin-surface dark:text-admin-text-secondary dark:ring-admin-border-strong";
  return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    running: "运行中",
    succeeded: "成功",
    failed: "失败",
    skipped: "跳过",
  };

  return labels[status] ?? status;
}

function sourceLabel(value: string | null) {
  if (value === "app_store") return "App Store";
  if (value === "official_page") return "官网页面";
  if (value === "official_site") return "官网页面";
  if (value === "google_play") return "Google Play";
  return value || "未知来源";
}

function formatSeconds(seconds: number | null) {
  if (seconds === null || seconds === undefined) return null;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (minutes <= 0) return `${rest} 秒`;
  return `${minutes} 分 ${String(rest).padStart(2, "0")} 秒`;
}

function formatDuration(row: CollectorRunHistoryRow) {
  const value = row.duration_ms;

  if (value !== null && value !== undefined) {
    if (value < 1000) return `${value} ms`;
    return `${Math.round(value / 1000)} 秒`;
  }

  if (row.status === "running") {
    return formatSeconds(row.run_age_seconds) || "运行中";
  }

  return "未记录";
}

function shortText(value: string | null) {
  if (!value) return null;
  return value.length > 120 ? `${value.slice(0, 120)}...` : value;
}

function runnerStateLabel(row: CollectorRunHistoryRow) {
  if (row.status !== "running") return null;
  if (row.process_id) return `脚本进程 ${row.process_id}`;
  if (row.runner_state === "queued_from_admin") return "正在唤起脚本";
  if (row.runner_state === "spawned") return "脚本已启动";
  return "等待脚本写回";
}

function runOutput(row: CollectorRunHistoryRow) {
  if (row.error_message) {
    return {
      text: shortText(row.error_message),
      className: "font-medium text-red-700 dark:text-red-300",
    };
  }

  const output = shortText(row.output_excerpt);
  if (output) {
    return {
      text: output,
      className: "text-admin-text-muted dark:text-admin-text-muted",
    };
  }

  if (row.status === "running") {
    if (row.process_id) {
      return {
        text: `脚本进程 ${row.process_id} 正在运行，完成后会写回成功、失败和输出摘要。`,
        className: "text-blue-700 dark:text-blue-300",
      };
    }

    return {
      text:
        row.runner_state === "queued_from_admin"
          ? "已创建运行记录，正在唤起后台脚本；如果 3 分钟内没有接管，系统会自动标记为失败。"
          : "运行记录已创建，等待脚本接管或写回采集结果。",
      className: "text-blue-700 dark:text-blue-300",
    };
  }

  return {
    text: "暂无摘要",
    className: "text-admin-text-faint",
  };
}

function runSummary(row: CollectorRunHistoryRow) {
  if (row.status === "running") {
    return runnerStateLabel(row) ?? "正在采集价格";
  }

  if (row.status === "succeeded") {
    return "本轮运行已完成；审核和正式入库结果见详情。";
  }

  if (row.status === "failed") {
    return "采集没有完成，可以展开详情查看原因后重试。";
  }

  if (row.status === "skipped") {
    return "本轮没有重复采集。";
  }

  return "等待系统处理。";
}

function progressToneClassName(tone: CollectionProgressState["tone"]) {
  if (tone === "success") {
    return {
      wrapper: "border-emerald-100 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
      bar: "bg-emerald-600",
      pill: "bg-admin-surface text-emerald-700 ring-emerald-200 dark:bg-admin-surface dark:text-emerald-300 dark:ring-emerald-800",
    };
  }

  if (tone === "danger") {
    return {
      wrapper: "border-red-100 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
      bar: "bg-red-600",
      pill: "bg-admin-surface text-red-700 ring-red-200 dark:bg-admin-surface dark:text-red-300 dark:ring-red-800",
    };
  }

  if (tone === "warning") {
    return {
      wrapper: "border-amber-100 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
      bar: "bg-amber-500",
      pill: "bg-admin-surface text-amber-700 ring-amber-200 dark:bg-admin-surface dark:text-amber-300 dark:ring-amber-800",
    };
  }

  if (tone === "neutral") {
    return {
      wrapper: "border-admin-border bg-admin-surface-subtle text-admin-text dark:border-admin-border-strong dark:bg-admin-surface dark:text-admin-text",
      bar: "bg-slate-500",
      pill: "bg-admin-surface text-admin-text-secondary ring-admin-border dark:bg-admin-surface dark:text-admin-text-secondary dark:ring-admin-border-strong",
    };
  }

  return {
    wrapper: "border-blue-100 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    bar: "bg-blue-600",
    pill: "bg-admin-surface text-blue-700 ring-blue-200 dark:bg-admin-surface dark:text-blue-300 dark:ring-blue-800",
  };
}

function CollectionProgressPanel({ progress }: { progress: CollectionProgressState }) {
  if (!progress.visible) return null;

  const classes = progressToneClassName(progress.tone);

  return (
    <div className={`border-b px-4 py-4 ${classes.wrapper}`} aria-live="polite">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${classes.pill}`}>
              {progress.active ? "采集中" : "本轮结果"}
            </span>
            {progress.elapsedLabel ? (
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${classes.pill}`}>
                已用 {progress.elapsedLabel}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-sm font-semibold">{progress.label}</h3>
          <p className="mt-1 text-xs leading-5 opacity-80">{progress.detail}</p>
        </div>

        <p className="max-w-xs text-xs leading-5 opacity-80">状态来自后台运行记录；没有可靠的总工作量时不显示百分比。</p>
      </div>
    </div>
  );
}

export default function CollectionRunHistorySection({
  rows,
  collectionRun,
  collectionScope,
  productQuery,
  runId: requestedRunId,
  productSlug,
  returnTo,
  pendingCount=0,
}: Props) {
  const router = useRouter();
  const scope = productSlug || collectionScope;
  const [runId] = useState(() => requestedRunId || rows.find(row =>
    row.status === "running" && (!scope || row.product_slug === scope)
  )?.id || null);
  const [refreshingResult, startResultRefresh] = useTransition();
  const refreshedRun = useRef<string | null>(null);
  const [visibleRows, setVisibleRows] = useState(rows);
  const [unavailable,setUnavailable] = useState(false);
  const queued = collectionRun === "queued";
  const runningRows = useMemo(
    () => visibleRows.filter((row) => row.status === "running"),
    [visibleRows],
  );
  const hasRunning = runningRows.length > 0;
  const autoRefreshActive = hasRunning || (queued && (!runId || !visibleRows.some(row=>row.id===runId && ["succeeded","failed","skipped"].includes(row.status))));
  const progressState = useMemo(
    () =>
      buildCollectionProgressState({
        rows: visibleRows,
        collectionRun,
        collectionScope,
        collectionRunId:runId,
      }),
    [visibleRows, collectionRun, collectionScope,runId],
  );
  const recentRows = visibleRows.slice(0, 6);
  const needsDiagnosis = !["succeeded", "skipped"].includes(progressState.runStatus || "");
  const contextHref = (href: string) => returnTo ? withAdminReturnTo(href, returnTo) : href;
  const sourceHref = contextHref(productSlug
    ? `/admin/collector-jobs?product=${encodeURIComponent(productSlug)}` : "/admin/collector-jobs");
  const priceHref = contextHref(productSlug
    ? `/admin/prices?product=${encodeURIComponent(productSlug)}` : "/admin/prices");

  useEffect(() => {
    if (!autoRefreshActive) {
      return;
    }

    let tick = 0;
    let stopped = false;
    let timer: number | null = null;

    const loadRows = async () => {
      try {
        const params = new URLSearchParams();
        if (productQuery) {
          params.set(productSlug ? "product" : "q", productSlug || productQuery);
        }

        if(runId)params.set("runId",runId);
        const response = await fetch(`/admin/review/collection-runs?${params.toString()}`, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });

        if (!response.ok) {
          setUnavailable(true);
          return;
        }

        const payload = (await response.json()) as { rows?: CollectorRunHistoryRow[] };
        if (!stopped && Array.isArray(payload.rows)) {
          setVisibleRows(payload.rows);
          setUnavailable(false);
          const nextProgress = buildCollectionProgressState({
            rows: payload.rows, collectionRun, collectionScope, collectionRunId: runId,
          });
          if (nextProgress.visible && !nextProgress.active && nextProgress.runId &&
            refreshedRun.current !== nextProgress.runId) {
            refreshedRun.current = nextProgress.runId;
            startResultRefresh(() => {
              if (requestedRunId) {
                router.refresh();
              } else {
                const nextParams = new URLSearchParams(window.location.search);
                nextParams.set("runId", nextProgress.runId!);
                router.replace(`${window.location.pathname}?${nextParams}${window.location.hash}`, { scroll: false });
              }
            });
          }
        }
      } catch {
        setUnavailable(true);
      }
    };

    const schedule = () => {
      const delay = tick < 24 ? 5000 : 15000;
      timer = window.setTimeout(async () => {
        if (stopped) {
          return;
        }

        tick += 1;
        await loadRows();

        if (!stopped && tick < 60) {
          schedule();
        } else if(!stopped) { setUnavailable(true); }
      }, delay);
    };

    void loadRows();
    schedule();

    return () => {
      stopped = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [autoRefreshActive, productQuery, runId, productSlug, collectionRun, collectionScope, requestedRunId, router, startResultRefresh]);

  return (
    <section id="collection-runs" className="scroll-mt-24 rounded-admin-card border border-admin-border bg-admin-surface shadow-sm dark:border-admin-border-strong dark:bg-admin-surface">
      <div className="flex flex-col gap-3 border-b border-admin-border px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-admin-border-strong">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">运行记录</p>
          <h2 className="mt-1 text-base font-semibold text-admin-text dark:text-admin-text">本次采集进度</h2>
          <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
            点击采集后在这里看进度和结果。页面会自动更新，不需要重复点击。
          </p>
        </div>
        <AdminLink
          href={sourceHref}
          className={adminButtonClassName({variant:"secondary",size:"sm",className:""})}
        >
          全部采集记录
        </AdminLink>
      </div>

      <CollectionProgressPanel progress={progressState} />
      {refreshingResult ? <p role="status" className="px-4 py-3 text-sm text-admin-text-muted">
        正在更新本轮审核结果…
      </p> : null}
      {progressState.visible && !progressState.active && !refreshingResult ?
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-4 py-3">
          <p className="text-sm text-admin-text-secondary">{needsDiagnosis
            ? "本轮未确认成功，请先核对来源与运行记录。" : pendingCount>0
            ? `当前有 ${pendingCount} 条待审记录，请继续处理异常。`
            : "本页无待审异常；可直接查看正式价格，无需重复发布。"}</p>
          <AdminLink href={needsDiagnosis
            ? sourceHref
            : pendingCount>0 ? "#review-pending"
              : priceHref}
            className={adminButtonClassName({variant:"primary",size:"sm"})}>
            {needsDiagnosis ? "查看运行原因" : pendingCount>0 ? "继续处理异常" : "查看正式价格"}
          </AdminLink>
        </div> : null}
      {unavailable ? <p role="status" className="px-4 py-3 text-sm text-admin-warning">状态暂时无法刷新，以下为上次读取的记录。请刷新核对，勿据此重复提交。</p> : null}

      {visibleRows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-admin-text-muted dark:text-admin-text-muted">
          还没有采集记录。请在产品队列中配置来源并开始采集。
        </div>
      ) : (
        <div className="divide-y divide-admin-border">
          {recentRows.map((row) => {
            const output = runOutput(row);

            return (
              <details key={row.id} className="group px-4 py-3 open:bg-admin-surface-subtle/70">
                <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.product_slug ? <AdminProductLogo slug={row.product_slug} name={row.product_name}/> : null}
                      <span className="font-semibold text-admin-text dark:text-admin-text">
                        {row.product_name || row.product_slug || "未知产品"}
                      </span>
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusClassName(row.status)}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">{runSummary(row)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-admin-text-muted dark:text-admin-text-muted">
                    <span>{formatDate(row.started_at)}</span>
                    <span>{formatDuration(row)}</span>
                    <span className="rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5
                      font-medium text-admin-text-secondary group-open:bg-admin-chip
                      dark:border-admin-border-strong dark:bg-admin-surface dark:text-admin-text-secondary">
                      技术详情
                    </span>
                  </div>
                </summary>

                <div className="mt-3 rounded-admin-card border border-admin-border bg-admin-surface p-3 text-xs leading-5 dark:border-admin-border-strong dark:bg-admin-surface">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-admin-text-muted dark:text-admin-text-muted">
                    <span>来源：{sourceLabel(row.source_type)}</span>
                    <span>产品标识：{row.product_slug || "未知"}</span>
                    {row.diagnosis ? <span>系统诊断：{row.diagnosis}</span> : null}
                  </div>
                  <div className={`mt-2 ${output.className}`}>{output.text}</div>
                  <div className="mt-3">
                    <CollectorRunTimeline run={row} />
                  </div>
                  <div className="mt-3">
                    <CollectorRunOutcomeSummary run={row} />
                  </div>
                  {row.product_slug ? (
                    <AdminLink
                      href={`/admin/data-quality/${encodeURIComponent(row.product_slug)}`}
                      className={adminButtonClassName({variant:"secondary",size:"sm",className:"mt-3"})}
                    >
                      打开数据诊断
                    </AdminLink>
                  ) : null}
                </div>
              </details>
            );
          })}
          {visibleRows.length > recentRows.length ? (
            <div className="px-4 py-3 text-center text-xs text-admin-text-muted dark:text-admin-text-muted">
              这里只显示最近 {recentRows.length} 次，更多记录请打开“全部采集记录”。
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
