import Link from "next/link";
import { CheckCircle2, Radar, RefreshCw, ShieldCheck } from "lucide-react";

type PipelineStep = "discovery" | "collector" | "review";

const steps: Array<{
  id: PipelineStep;
  number: string;
  title: string;
  href: string;
  description: string;
  icon: typeof Radar;
}> = [
  {
    id: "discovery",
    number: "1",
    title: "线索入口",
    href: "/admin/discovery",
    description: "新产品、新模型、官网或定价页先进入候选池，不直接发布。",
    icon: Radar,
  },
  {
    id: "collector",
    number: "2",
    title: "采集执行",
    href: "/admin/collector-jobs",
    description: "已确认产品生成采集任务，执行器负责抓取 App Store 价格。",
    icon: RefreshCw,
  },
  {
    id: "review",
    number: "3",
    title: "价格审核",
    href: "/admin/review",
    description: "稳定价格自动通过；异常、缺样本或冲突价格留给人工确认。",
    icon: ShieldCheck,
  },
];

export default function AdminPipelineSteps({
  currentStep,
}: {
  currentStep: PipelineStep;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">价格采集流水线</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            后台只保留一条主流程：发现线索 → 采集价格 → 审核入库。你当前所在步骤会高亮。
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircle2 size={14} strokeWidth={2} />
          V1 主线：App Store 优先
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {steps.map((step) => {
          const active = step.id === currentStep;
          const Icon = step.icon;

          return (
            <Link
              key={step.id}
              href={step.href}
              className={[
                "group rounded-xl border p-4 transition",
                active
                  ? "border-blue-200 bg-blue-50 ring-1 ring-blue-100"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    active
                      ? "bg-blue-700 text-white"
                      : "bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-slate-900",
                  ].join(" ")}
                >
                  {step.number}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      size={16}
                      strokeWidth={2}
                      className={active ? "text-blue-700" : "text-slate-400"}
                    />
                    <h3 className="text-sm font-bold text-slate-950">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
