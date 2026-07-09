import {
  buildCollectorRunTimeline,
  type CollectorRunTimelineInput,
  type CollectorRunTimelineStepState,
} from "../collector-jobs/job-state";

type Props = {
  run: CollectorRunTimelineInput;
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
