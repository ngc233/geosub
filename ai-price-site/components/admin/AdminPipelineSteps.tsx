import Link from "next/link";
import { CheckCircle2, Radar, ShieldCheck, Workflow } from "lucide-react";

type PipelineStep = "pipeline" | "discovery" | "collector" | "review";

const steps: Array<{
  id: PipelineStep;
  number: string;
  title: string;
  href: string;
  description: string;
  icon: typeof Radar;
}> = [
  {
    id: "pipeline",
    number: "1",
    title: "产品流水线",
    href: "/admin/pipeline",
    description: "按产品查看线索、采集任务、异常审核和正式价格，先判断卡在哪一步。",
    icon: Workflow,
  },
  {
    id: "discovery",
    number: "2",
    title: "线索入口",
    href: "/admin/discovery",
    description: "添加新产品、官网或 App Store 线索，入库后自动准备采集任务。",
    icon: Radar,
  },
  {
    id: "review",
    number: "3",
    title: "价格采集审核",
    href: "/admin/review",
    description: "按产品启动 App Store 采集，稳定价格自动入库，异常价格集中解释。",
    icon: ShieldCheck,
  },
];

export default function AdminPipelineSteps({
  currentStep,
}: {
  currentStep: PipelineStep;
}) {
  const activeStep = currentStep === "collector" ? "review" : currentStep;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">价格采集流水线</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            后台主流程简化为三步：先定位产品状态，再补充线索，最后在同一个工作台完成采集、自动审核和异常处理。
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircle2 size={14} strokeWidth={2} />
          V1 主线：App Store 优先
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {steps.map((step) => {
          const active = step.id === activeStep;
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
                    <h3 className="text-sm font-bold text-slate-950">{step.title}</h3>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
