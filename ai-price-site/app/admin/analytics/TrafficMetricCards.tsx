import { Eye, Layers, Users } from "lucide-react";
import {
  formatTrafficCount,
  trafficDelta,
  trafficPvCoverage,
  trafficPvExclusions,
  type TrafficMetric,
  type TrafficSnapshot,
} from "../../../lib/admin-traffic-model";

export default function TrafficMetricCards({
  data,
  range,
  metric,
  onSelect,
}: {
  data: TrafficSnapshot | null;
  range: number;
  metric: TrafficMetric;
  onSelect: (metric: TrafficMetric) => void;
}) {
  const current = data?.totals.find((t) => t.range === range && t.side === 0);
  const previous = data?.totals.find((t) => t.range === range && t.side === 1);
  const coverage = trafficPvCoverage(current, data?.days ?? []);
  const previousCoverage = trafficPvCoverage(previous, data?.days ?? []);
  const labels = {
    pv: "浏览量 PV",
    uv: "访客 UV · 同意统计的样本",
    sessions: "会话 Sessions · 同意统计的样本",
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(["pv", "uv", "sessions"] as const).map((key) => {
        const value = current?.[key] ?? null;
        const old = previous?.[key] ?? null;
        const incomplete =
          key !== "pv" && Boolean(current?.missing_identity ?? current?.missing_session);
        const previousIncomplete =
          key !== "pv" && Boolean(previous?.missing_identity ?? previous?.missing_session);
        const pvPartial = key === "pv" && (!coverage.complete || !previousCoverage.complete);
        const delta =
          range === 1 || incomplete || previousIncomplete || pvPartial
            ? null
            : trafficDelta(value, old);
        const Icon = key === "pv" ? Eye : key === "uv" ? Users : Layers;
        const active = metric === key;

        return (
          <button
            key={key}
            type="button"
            data-traffic-metric={key}
            aria-pressed={active}
            onClick={() => onSelect(key)}
            className={[
              "flex items-start gap-4 rounded-admin-card border bg-admin-surface p-5 text-left transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
              active
                ? "border-admin-accent ring-1 ring-admin-accent/25"
                : "border-admin-border hover:border-admin-border-strong",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-admin-control",
                active
                  ? "bg-admin-accent-soft text-admin-accent"
                  : "bg-admin-surface-subtle text-admin-text-secondary",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-admin-text-muted">{labels[key]}</span>
              <span className="mt-1.5 flex items-baseline gap-1.5 text-2xl font-semibold tabular-nums text-admin-text">
                <strong>{formatTrafficCount(value)}<small><span className="ml-1.5 text-xs font-normal text-admin-text-muted">{key === "uv" ? "位样本访客" : key === "pv" ? "次浏览" : "次样本会话"}</span></small></strong>
              </span>
              <em className="mt-1 block text-xs not-italic text-admin-text-faint">
                {delta !== null
                  ? `较上期 ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
                  : value === null
                    ? "数据不可用"
                    : range === 1
                      ? "当日累计，尚未结束"
                      : pvPartial
                        ? "覆盖不完整，不计算环比"
                        : incomplete || previousIncomplete
                          ? "样本标识不完整，不计算环比"
                          : "上期不可比较"}
              </em>

              {key === "pv" ? (
                <>
                  <span className="mt-1.5 block break-words text-xs leading-5 text-admin-text-faint">
                    {coverage.text}
                    {value !== null && !coverage.complete ? " · 可用日期合计" : ""}
                  </span>
                  {coverage.reason ? (
                    <span className="mt-1 block break-words text-xs leading-5 text-admin-text-faint">
                      {coverage.reason}
                    </span>
                  ) : null}
                  {trafficPvExclusions(current) ? (
                    <span className="mt-1 block break-words text-xs leading-5 text-admin-text-faint">
                      {trafficPvExclusions(current)}
                    </span>
                  ) : null}
                </>
              ) : incomplete ? (
                <span className="mt-1.5 block break-words text-xs leading-5 text-admin-text-faint">
                  仅含标识完整的样本；
                  {formatTrafficCount(current?.missing_identity ?? current?.missing_session)} 条浏览缺少访客或会话标识
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
