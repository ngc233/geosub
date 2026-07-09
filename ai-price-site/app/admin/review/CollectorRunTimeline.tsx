import {
  buildCollectorRunTimeline,
  type CollectorRunTimelineInput,
  type CollectorRunTimelineStepState,
} from "../collector-jobs/job-state";

type Props = {
  run: CollectorRunTimelineInput;
  compact?: boolean;
};

export type CollectorRunOutcomeInput = CollectorRunTimelineInput & {
  observed_count?: number | null;
  pending_observation_count?: number | null;
  approved_observation_count?: number | null;
  rejected_observation_count?: number | null;
  ignored_observation_count?: number | null;
  anomaly_observation_count?: number | null;
  published_price_count?: number | null;
};

type OutcomeProps = {
  run: CollectorRunOutcomeInput;
  compact?: boolean;
};

function stepClassName(state: CollectorRunTimelineStepState) {
  if (state === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (state === "active") return "border-blue-200 bg-blue-50 text-blue-700";
  if (state === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (state === "skipped") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-slate-200 bg-white text-slate-400";
}

function dotClassName(state: CollectorRunTimelineStepState) {
  if (state === "done") return "bg-emerald-500";
  if (state === "active") return "bg-blue-500";
  if (state === "failed") return "bg-red-500";
  if (state === "skipped") return "bg-slate-400";
  return "bg-slate-200";
}

function numberValue(value: number | null | undefined) {
  return Number(value || 0);
}

function outcomeNote(run: CollectorRunOutcomeInput, total: number) {
  if (total > 0) return null;
  if (run.status === "running") return "等待采集脚本写回价格结果。";
  if (run.status === "failed") return "本轮失败，没有产生可归因的价格结果。";
  if (run.status === "skipped") return "本轮被跳过，没有新增价格结果。";
  return "本轮未匹配到新增结果，可能是无变更或采集器跳过。";
}

function outcomeChipClassName(kind: "neutral" | "pending" | "ok" | "warn" | "bad") {
  if (kind === "ok") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (kind === "pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (kind === "warn") return "bg-orange-50 text-orange-700 ring-orange-200";
  if (kind === "bad") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

export function CollectorRunOutcomeSummary({ run, compact = false }: OutcomeProps) {
  const observed = numberValue(run.observed_count);
  const pending = numberValue(run.pending_observation_count);
  const approved = numberValue(run.approved_observation_count);
  const ignored = numberValue(run.ignored_observation_count);
  const rejected = numberValue(run.rejected_observation_count);
  const anomaly = numberValue(run.anomaly_observation_count);
  const published = numberValue(run.published_price_count);
  const total = observed + published;
  const note = outcomeNote(run, total);
  const chips = [
    { label: "观测", value: observed, kind: "neutral" as const },
    { label: "待审", value: pending, kind: "pending" as const },
    { label: "通过", value: approved, kind: "ok" as const },
    { label: "忽略", value: ignored, kind: "neutral" as const },
    { label: "拒绝", value: rejected, kind: "bad" as const },
    { label: "异常", value: anomaly, kind: "warn" as const },
    { label: "正式价", value: published, kind: "ok" as const },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500">本轮产出</span>
        {note ? <span className="text-[11px] text-slate-400">{note}</span> : null}
      </div>
      <div className={`mt-2 flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${outcomeChipClassName(chip.kind)}`}
          >
            {chip.label} {chip.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CollectorRunTimeline({ run, compact = false }: Props) {
  const timeline = buildCollectorRunTimeline(run);

  return (
    <div
      className={`grid gap-2 ${compact ? "md:grid-cols-2" : "md:grid-cols-4"}`}
      aria-label="采集运行时间线"
    >
      {timeline.map((step) => (
        <div
          key={step.key}
          className={`rounded-lg border px-3 py-2 ${stepClassName(step.state)}`}
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dotClassName(step.state)}`} />
            <span className="text-[11px] font-bold">{step.label}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 opacity-80">{step.detail}</p>
        </div>
      ))}
    </div>
  );
}
