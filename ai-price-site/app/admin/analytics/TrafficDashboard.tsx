"use client";

import { adminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import AdminAlert from "@/components/admin/AdminAlert";
import AdminLink from "@/components/admin/AdminLink";
import AdminSegmentedControl from "@/components/admin/AdminSegmentedControl";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUpRight, Download, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  formatTrafficCount,
  trafficCsv,
  trafficPaths,
  trafficPvCoverage,
  trafficPvReason,
  type TrafficMetric,
  type TrafficSnapshot,
} from "../../../lib/admin-traffic-model";
import { getNiceAxisScale } from "../dashboard-trend";
import TrafficMetricCards from "./TrafficMetricCards";

const labels = { pv: "浏览量", uv: "访客样本", sessions: "会话样本" };
const definitions = {
  pv: "已分类浏览量 · 排除已标记的内部、自动化和未知访问",
  uv: "已同意统计的访客样本 · 所选周期内按匿名标识去重，仅含访客和会话标识完整的事件",
  sessions: "已同意统计的会话样本 · 所选周期内按访客与会话标识组合去重",
};
const fmt = formatTrafficCount;

export default function TrafficDashboard({ data }: { data: TrafficSnapshot | null }) {
  const [range, setRange] = useState(7);
  const [metric, setMetric] = useState<TrafficMetric>("pv");
  const [compare, setCompare] = useState(true);
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const chartContainer = useRef<HTMLElement>(null);
  const [chartWidth, setChartWidth] = useState(880);

  useEffect(() => {
    const element = chartContainer.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setChartWidth(Math.max(280, entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const current = data?.totals.find((t) => t.range === range && t.side === 0);
  const previous = data?.totals.find((t) => t.range === range && t.side === 1);
  const pvCoverage = trafficPvCoverage(current, data?.days ?? []);
  const rows =
    data?.days.filter((d) => current && d.date >= current.start && d.date <= current.end) || [];
  const before =
    data?.days.filter((d) => previous && d.date >= previous.start && d.date <= previous.end) || [];
  const index = Math.min(selected, Math.max(0, rows.length - 1));
  const point = rows[index];
  const max = Math.max(
    1,
    ...rows.map((d) => d[metric] || 0),
    ...(compare && range !== 1 ? before.map((d) => d[metric] || 0) : []),
  );
  const top = getNiceAxisScale(max).axisMax;
  const plotWidth = chartWidth - 88;
  const x = (i: number) =>
    54 + (rows.length < 2 ? plotWidth / 2 : (i * plotWidth) / (rows.length - 1));
  const y = (v: number) => 220 - (v / top) * 180;
  const paths = (values: typeof rows) =>
    trafficPaths(values.map((d, i) => ({ x: x(i), y: d[metric] === null ? null : y(d[metric]!) })));

  function changeRange(n: number) {
    setRange(n);
    setSelected(0);
  }

  function download() {
    const csv = trafficCsv(rows, data?.capturedAt ?? "", data?.source);
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `geosub-traffic-${current?.start}-${current?.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <AdminSegmentedControl
            ariaLabel="流量日期范围"
            size="sm"
            value={String(range)}
            onChange={(value) => changeRange(Number(value))}
            items={[
              { value: "1", label: "今天" },
              { value: "7", label: "近 7 天" },
              { value: "30", label: "近 30 天" },
              { value: "90", label: "近 90 天" },
            ]}
          />
          <span className="text-xs tabular-nums text-admin-text-muted">
            {current ? `${current.start} — ${current.end} · UTC` : "日期不可用"}
          </span>
        </div>

        <button
          type="button"
          className={adminButtonClassName({ variant: "secondary", size: "sm" })}
          disabled={refreshing}
          aria-busy={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw size={14} aria-hidden="true" />
          {refreshing ? "正在读取…" : "重新读取"}
        </button>
      </div>

      {!data ? (
        <AdminAlert variant="warning" title="流量数据暂时无法读取">
          请重试；当前未显示零值或演示数据。
        </AdminAlert>
      ) : (
        <p className="text-xs leading-6 text-admin-text-muted">
          {data.source} · 截至{" "}
          {new Date(data.capturedAt).toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
            hour12: false,
          })}{" "}
          北京时间。{range === 1 ? "今天尚未结束，不与完整昨日比较。" : "不含今天，比较前一个等长完整周期。"}
          {data.source?.includes("快照") ? " 重新读取只刷新本地文件，不会自动重新采集生产数据。" : ""}
        </p>
      )}

      <TrafficMetricCards
        data={data}
        range={range}
        metric={metric}
        onSelect={(key) => {
          setMetric(key);
          setSelected(0);
        }}
      />

      <section
        ref={chartContainer}
        className="overflow-hidden rounded-admin-card border border-admin-border bg-admin-surface shadow-admin-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-admin-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-admin-text">{labels[metric]}趋势</h2>
            <p className="mt-1 text-xs text-admin-text-muted">{definitions[metric]}</p>
          </div>
          <button
            type="button"
            className={adminButtonClassName({ variant: "secondary", size: "sm" })}
            disabled={!rows.length}
            onClick={download}
          >
            <Download size={14} aria-hidden="true" />
            导出明细
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-5 pt-4 text-xs text-admin-text-muted sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-admin-accent" />
            本期
          </span>
          {range !== 1 ? (
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="h-4 w-4 accent-[var(--admin-accent)]"
              />
              显示上期对比（虚线）
            </label>
          ) : (
            <span>当日未结束</span>
          )}
          <span>缺失日期断开，不补零</span>
        </div>

        {!data ? (
          <div className="px-6 py-12 text-center text-sm text-admin-text-muted">数据不可用</div>
        ) : rows.every((r) => r[metric] === null) ? (
          <div className="px-6 py-12 text-center text-sm text-admin-text-muted">
            这个周期尚无可用的{labels[metric]}数据。
          </div>
        ) : (
          <>
            <svg
              className="my-3 block h-auto min-h-[180px] w-full overflow-hidden sm:min-h-[220px]"
              viewBox={`0 0 ${chartWidth} 265`}
              role="img"
              aria-label={`${labels[metric]}按日趋势，精确值见下方日期控件和明细表`}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line
                    x1="54"
                    x2={chartWidth - 34}
                    y1={40 + i * 45}
                    y2={40 + i * 45}
                    stroke="var(--admin-border)"
                    strokeWidth="1"
                  />
                  <text
                    x="43"
                    y={44 + i * 45}
                    textAnchor="end"
                    fill="var(--admin-text-muted)"
                    fontSize="11"
                    className="tabular-nums"
                  >
                    {fmt((top * (4 - i)) / 4)}
                  </text>
                </g>
              ))}
              {range !== 1 && compare
                ? paths(before).map((d, i) => (
                    <path
                      key={`p${i}`}
                      d={d}
                      fill="none"
                      stroke="var(--admin-text-muted)"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.55"
                    />
                  ))
                : null}
              {paths(rows).map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="var(--admin-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {rows.map((r, i) =>
                r[metric] !== null &&
                (i === 0 || rows[i - 1][metric] === null) &&
                (i === rows.length - 1 || rows[i + 1][metric] === null) ? (
                  <circle
                    key={r.date}
                    cx={x(i)}
                    cy={y(r[metric]!)}
                    r="4"
                    fill="var(--admin-accent)"
                    stroke="var(--admin-surface)"
                    strokeWidth="2"
                  />
                ) : null,
              )}
              {[...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])]
                .filter((i) => rows[i])
                .map((i) => (
                  <text
                    key={i}
                    x={x(i)}
                    y="250"
                    textAnchor="middle"
                    fill="var(--admin-text-muted)"
                    fontSize="11"
                    className="tabular-nums"
                  >
                    {rows[i].date.slice(5)}
                  </text>
                ))}
              {point?.[metric] != null ? (
                <>
                  <line
                    x1={x(index)}
                    x2={x(index)}
                    y1="35"
                    y2="225"
                    stroke="var(--admin-accent)"
                    strokeDasharray="3 5"
                    opacity="0.5"
                  />
                  <circle
                    cx={x(index)}
                    cy={y(point[metric]!)}
                    r="5"
                    fill="var(--admin-accent)"
                    stroke="var(--admin-surface)"
                    strokeWidth="2"
                  />
                </>
              ) : null}
              {rows.map((r, i) => (
                <rect
                  key={r.date}
                  x={x(i) - Math.max(4, plotWidth / 2 / Math.max(1, rows.length - 1))}
                  width={Math.max(8, plotWidth / Math.max(1, rows.length - 1))}
                  y="30"
                  height="200"
                  fill="transparent"
                  className="cursor-crosshair"
                  onPointerMove={() => setSelected(i)}
                  onClick={() => setSelected(i)}
                />
              ))}
            </svg>

            <div
              className="flex flex-wrap gap-4 bg-admin-surface-subtle px-5 py-3 text-xs sm:px-6"
              aria-live="polite"
            >
              <b className="font-semibold text-admin-text">{point?.date} · UTC</b>
              <span className="tabular-nums text-admin-text-secondary">
                {labels[metric]}：{fmt(point?.[metric])}
              </span>
              {compare && range !== 1 ? (
                <span className="tabular-nums text-admin-text-muted">
                  上期对应日 {before[index]?.date}：{fmt(before[index]?.[metric])}
                </span>
              ) : null}
            </div>

            <label className="flex flex-col gap-2 px-5 py-4 text-xs text-admin-text-muted sm:flex-row sm:items-center sm:gap-4 sm:px-6">
              <span className="shrink-0">选择日期（支持触摸及方向键）</span>
              <input
                aria-label="选择趋势日期"
                type="range"
                min="0"
                max={Math.max(0, rows.length - 1)}
                value={index}
                onChange={(e) => setSelected(Number(e.target.value))}
                className="h-6 w-full flex-1 accent-[var(--admin-accent)]"
              />
            </label>
          </>
        )}

        <div className="border-t border-admin-border px-5 py-3.5 text-xs leading-6 text-admin-text-faint sm:px-6">
          每日访客与会话可能跨日重复；上方周期人数和会话数按整个周期去重，不能用每日数相加。
          {current?.missing_identity
            ? ` 本期 ${current.missing_identity} 条样本浏览缺少访客或会话标识，不参与样本 PV、访客和会话的可比统计。`
            : ""}
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminCard>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-admin-text">统计口径</h2>
            <ArrowUpRight size={16} className="text-admin-text-muted" aria-hidden="true" />
          </div>
          <dl className="mt-4 grid gap-3 text-xs leading-6 sm:grid-cols-[88px_1fr]">
            <dt className="font-semibold text-admin-text">浏览量</dt>
            <dd className="text-admin-text-muted">
              第一方无 Cookie 日计数的已分类访问，排除已标记的内部、自动化与未知访问。周期只合计可用日期并注明覆盖率，不补零。
            </dd>
            <dt className="font-semibold text-admin-text">访客人数</dt>
            <dd className="text-admin-text-muted">
              仅统计已同意分析且访客与会话标识完整的公开页面访问，按匿名浏览器标识去重。
            </dd>
            <dt className="font-semibold text-admin-text">会话数</dt>
            <dd className="text-admin-text-muted">
              按（匿名访客标识、会话标识）组合去重；缺少标识的事件不推算成新会话。
            </dd>
            <dt className="font-semibold text-admin-text">数据边界</dt>
            <dd className="text-admin-text-muted">
              UTC 日界线；样本排除测试页面及测试事件。记录数量不能替代监控告警。
            </dd>
          </dl>
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-semibold text-admin-text">数据完整性</h2>
          <dl className="mt-4 divide-y divide-admin-border text-xs">
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-admin-text-muted">浏览量有效日期</dt>
              <dd className="tabular-nums font-medium text-admin-text">
                {pvCoverage.covered} / {pvCoverage.expected}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-admin-text-muted">标识完整的样本 PV</dt>
              <dd className="tabular-nums text-admin-text-secondary">
                {fmt(current?.sample_views)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-admin-text-muted">已同意样本浏览</dt>
              <dd className="tabular-nums text-admin-text-secondary">
                {fmt(current?.consented_views)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-admin-text-muted">缺少标识浏览</dt>
              <dd className="tabular-nums text-admin-text-secondary">
                {fmt(current?.missing_identity)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-admin-text-muted">本期性质</dt>
              <dd className="text-admin-text-secondary">
                {range === 1 ? "进行中" : "完整自然日区间"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-admin-text-faint">
            “—”表示不可用；0 表示零计数。无 Cookie PV 与样本覆盖范围不同，不直接比较。
          </p>
        </AdminCard>
      </div>

      <details className="rounded-admin-card border border-admin-border bg-admin-surface shadow-admin-card">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent sm:px-6">
          查看每日精确值与缺失记录
        </summary>
        <div className="overflow-x-auto border-t border-admin-border px-5 py-4 sm:px-6">
          <table className="min-w-full divide-y divide-admin-border text-xs tabular-nums">
            <thead>
              <tr className="text-right text-admin-text-muted">
                <th className="py-2.5 pr-4 text-left font-medium">日期 UTC</th>
                <th className="px-3 py-2.5 font-medium">浏览量</th>
                <th className="px-3 py-2.5 font-medium">访客样本</th>
                <th className="px-3 py-2.5 font-medium">会话样本</th>
                <th className="px-3 py-2.5 font-medium">样本 PV</th>
                <th className="px-3 py-2.5 font-medium">缺标识</th>
                <th className="pl-3 py-2.5 font-medium">PV 缺失原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border text-right text-admin-text-body">
              {rows.map((r) => (
                <tr key={r.date} className="hover:bg-admin-row-hover">
                  <td className="py-2.5 pr-4 text-left font-mono">{r.date}</td>
                  <td className="px-3 py-2.5">{fmt(r.pv)}</td>
                  <td className="px-3 py-2.5">{fmt(r.uv)}</td>
                  <td className="px-3 py-2.5">{fmt(r.sessions)}</td>
                  <td className="px-3 py-2.5">{fmt(r.sample_views)}</td>
                  <td className="px-3 py-2.5">{fmt(r.missing_identity)}</td>
                  <td className="pl-3 py-2.5 text-admin-text-muted">{trafficPvReason(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="text-xs text-admin-text-muted">
        需要查看来源、漏斗、服务热度与商业归因？切换到上方{" "}
        <AdminLink href="/admin/analytics?tab=details" className="text-admin-accent hover:underline">
          深度归因与漏斗
        </AdminLink>{" "}
        页签。
      </p>
    </div>
  );
}
