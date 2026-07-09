"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CollectorRunTimeline, { CollectorRunOutcomeSummary } from "./CollectorRunTimeline";
import { formatDate } from "./review-display";
import type { CollectorRunHistoryRow } from "./types";

type Props = {
  rows: CollectorRunHistoryRow[];
  collectionRun: string | null;
  collectionScope: string | null;
  productQuery: string;
};

function statusClassName(status: string) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "failed") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "skipped") return "bg-slate-50 text-slate-600 ring-slate-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
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
      className: "font-medium text-red-700",
    };
  }

  const output = shortText(row.output_excerpt);
  if (output) {
    return {
      text: output,
      className: "text-slate-500",
    };
  }

  if (row.status === "running") {
    if (row.process_id) {
      return {
        text: `脚本进程 ${row.process_id} 正在运行，完成后会写回成功、失败和输出摘要。`,
        className: "text-blue-700",
      };
    }

    return {
      text:
        row.runner_state === "queued_from_admin"
          ? "已创建运行记录，正在唤起后台脚本；如果 3 分钟内没有接管，系统会自动标记为失败。"
          : "后台脚本已启动，正在等待采集结果写回。",
      className: "text-blue-700",
    };
  }

  return {
    text: "暂无摘要",
    className: "text-slate-400",
  };
}

export default function CollectionRunHistorySection({
  rows,
  collectionRun,
  collectionScope,
  productQuery,
}: Props) {
  const [visibleRows, setVisibleRows] = useState(rows);
  const queued = collectionRun === "queued";
  const runningRows = useMemo(
    () => visibleRows.filter((row) => row.status === "running"),
    [visibleRows],
  );
  const hasRunning = runningRows.length > 0;
  const autoRefreshActive = queued || hasRunning;

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
          params.set("q", productQuery);
        }

        const response = await fetch(`/admin/review/collection-runs?${params.toString()}`, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { rows?: CollectorRunHistoryRow[] };
        if (Array.isArray(payload.rows)) {
          setVisibleRows(payload.rows);
        }
      } catch {
        // Keep the last visible state; the next tick can recover.
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
        }
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
  }, [autoRefreshActive, productQuery]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">最近采集运行</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            这里显示采集脚本是否真的被唤起、是否仍在运行，以及完成后的输出摘要。下面的“最近审核历史”只显示价格观察被通过、忽略或拒绝后的结果。
          </p>
        </div>
        <Link
          href="/admin/collector-jobs"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          查看采集任务
        </Link>
      </div>

      {queued || hasRunning ? (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
          {queued ? (
            <>
              已唤起后台采集器{collectionScope ? `：${collectionScope}` : ""}。
            </>
          ) : null}
          {hasRunning ? (
            <>
              当前有 {runningRows.length} 条运行记录未完成，本区块会自动刷新。
            </>
          ) : (
            "脚本开始或结束后会出现在下方运行记录里。"
          )}
        </div>
      ) : null}

      {visibleRows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-500">
          暂无采集运行记录。点击补采或产品采集按钮后，运行状态会显示在这里。
        </div>
      ) : (
        <div className="overflow-x-auto">
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
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row) => {
                const output = runOutput(row);
                const runnerState = runnerStateLabel(row);

                return (
                  <tr key={row.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">
                        {row.product_name || row.product_slug || "未知产品"}
                      </div>
                      <div className="text-xs text-slate-500">{row.product_slug || "unknown"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {sourceLabel(row.source_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusClassName(row.status)}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                      {runnerState ? (
                        <div className="mt-1 text-xs font-medium text-blue-700">{runnerState}</div>
                      ) : null}
                      {row.diagnosis ? (
                        <div className="mt-1 text-xs text-slate-500">{row.diagnosis}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.started_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDuration(row)}</td>
                    <td className={`min-w-[420px] max-w-xl px-4 py-3 text-xs leading-5 ${output.className}`}>
                      <div>{output.text}</div>
                      <div className="mt-3">
                        <CollectorRunTimeline run={row} />
                      </div>
                      <div className="mt-3">
                        <CollectorRunOutcomeSummary run={row} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
