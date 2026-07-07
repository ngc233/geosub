import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Database,
} from "lucide-react";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import {
  getSystemHealth,
  type HealthMetric,
  type HealthSection,
  type HealthStatus,
} from "../../../lib/system-health";

export const dynamic = "force-dynamic";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getStatusStyle(status: HealthStatus) {
  if (status === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "critical") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function getStatusDot(status: HealthStatus) {
  if (status === "ok") return "bg-emerald-500";
  if (status === "warning") return "bg-amber-500";
  if (status === "critical") return "bg-red-500";
  return "bg-slate-300";
}

function statusText(status: HealthStatus) {
  if (status === "ok") return "正常";
  if (status === "warning") return "需关注";
  if (status === "critical") return "需处理";
  return "未知";
}

function SectionIcon({ status }: { status: HealthStatus }) {
  if (status === "ok") return <CheckCircle2 size={18} strokeWidth={2.4} />;
  if (status === "critical") return <AlertTriangle size={18} strokeWidth={2.4} />;
  if (status === "warning") return <Clock3 size={18} strokeWidth={2.4} />;
  return <CircleHelp size={18} strokeWidth={2.4} />;
}

function StatusPill({ status, label }: { status: HealthStatus; label?: string }) {
  return (
    <span
      className={joinClasses(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
        getStatusStyle(status)
      )}
    >
      <span className={joinClasses("h-2 w-2 rounded-full", getStatusDot(status))} />
      {label || statusText(status)}
    </span>
  );
}

function MetricTile({ metric }: { metric: HealthMetric }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">{metric.label}</p>
          <p className="mt-2 truncate text-lg font-black tracking-tight text-slate-950">
            {metric.value}
          </p>
        </div>
        <StatusPill status={metric.status} />
      </div>

      {metric.helper ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">{metric.helper}</p>
      ) : null}
    </div>
  );
}

function HealthSectionCard({ section }: { section: HealthSection }) {
  return (
    <AdminCard>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={joinClasses(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
                getStatusStyle(section.status)
              )}
            >
              <SectionIcon status={section.status} />
            </span>
            <h2 className="truncate text-base font-black text-slate-950">
              {section.title}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {section.description}
          </p>
        </div>
        <StatusPill status={section.status} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {section.metrics.map((metric) => (
          <MetricTile key={`${section.title}-${metric.label}`} metric={metric} />
        ))}
      </div>
    </AdminCard>
  );
}

export default async function AdminSystemPage() {
  const health = await getSystemHealth();

  return (
    <div>
      <AdminPageHeader
        eyebrow="系统状态"
        title="运行健康检查"
        description="集中查看数据库、汇率、采集、价格审核和内容发布状态。这里先帮你判断是哪一环没跑，再决定要不要重启脚本或重新采集。"
        action={<StatusPill status={health.summary.status} label={health.summary.label} />}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AdminCard className="bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lime-300">
              <Activity size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-300">总体状态</p>
              <p className="mt-1 text-2xl font-black">{health.summary.label}</p>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Database size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">待处理项</p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {health.summary.issueCount}
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Clock3 size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">检查时间</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {health.checkedAt}
              </p>
            </div>
          </div>
        </AdminCard>
      </div>

      {health.issues.length > 0 ? (
        <AdminCard className="mb-6 border-amber-200 bg-amber-50">
          <div className="mb-3 flex items-center gap-2 text-amber-800">
            <AlertTriangle size={18} strokeWidth={2.4} />
            <h2 className="text-base font-black">需要先看的问题</h2>
          </div>
          <div className="grid gap-2">
            {health.issues.map((issue) => (
              <div
                key={issue}
                className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-sm font-semibold leading-6 text-amber-900"
              >
                {issue}
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {health.sections.map((section) => (
          <HealthSectionCard key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}
