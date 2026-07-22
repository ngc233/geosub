import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Database,
  RefreshCw,
  ServerCog,
  ShieldAlert,
} from "lucide-react";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import {
  getSystemHealth,
  type HealthMetric,
  type HealthSection,
  type HealthStatus,
} from "../../../lib/system-health";
import type { AutomationTask } from "../../../lib/system-task-monitor";
import type { OperationalRecoveryOverview } from "../../../lib/system-task-monitor";
import SystemHealthAutoRefresh from "./SystemHealthAutoRefresh";

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
    <div className="min-w-0 rounded-lg bg-slate-50/80 p-4">
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
        <p className="mt-3 line-clamp-3 break-words text-xs leading-5 text-slate-500">
          {metric.helper}
        </p>
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
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
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

function formatTaskDate(value: Date | string | null) {
  if (!value) return "尚无记录";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "尚无记录";

  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(seconds: number | null) {
  if (seconds === null) return "";
  if (seconds < 60) return `${Math.max(1, seconds)} 秒`;
  return `${Math.round(seconds / 60)} 分钟`;
}

function AutomationTaskRow({ task }: { task: AutomationTask }) {
  return (
    <div
      id={task.key.replaceAll("_", "-")}
      className="grid gap-4 border-t border-slate-100 px-5 py-4 first:border-t-0 xl:grid-cols-[minmax(210px,1.3fr)_130px_140px_minmax(180px,1fr)_104px] xl:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-slate-950">{task.title}</h3>
          <StatusPill status={task.status} label={task.stateLabel} />
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{task.description}</p>
        {task.errorMessage ? (
          <p className="mt-2 line-clamp-2 text-xs font-bold text-red-700">
            {task.errorMessage}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400">最近成功</p>
        <p className="mt-1 text-sm font-black text-slate-800">
          {formatTaskDate(task.latestSuccessAt)}
        </p>
        {task.durationSeconds !== null ? (
          <p className="mt-1 text-xs text-slate-400">耗时 {durationLabel(task.durationSeconds)}</p>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400">执行频率</p>
        <p className="mt-1 text-sm font-black text-slate-800">{task.cadence}</p>
        <p className="mt-1 text-xs text-slate-400">
          预计 {formatTaskDate(task.nextExpectedAt)}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400">当前队列</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">{task.backlog}</p>
        <p className="mt-1 text-xs text-slate-400">
          最近触发 {formatTaskDate(task.latestRunAt)}
        </p>
      </div>

      <Link
        href={task.actionHref}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        {task.actionLabel}
        <ArrowRight size={14} strokeWidth={2.3} />
      </Link>
    </div>
  );
}

function OperationalRecoveryPanel({
  recovery,
}: {
  recovery: OperationalRecoveryOverview;
}) {
  return (
    <AdminCard className="mb-6 overflow-hidden !p-0">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <RefreshCw size={18} strokeWidth={2.3} />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-950">采集任务自动恢复</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              卡死任务会自动关闭，临时故障有限重试，配置错误和重试耗尽会停止并汇总。
            </p>
          </div>
        </div>
        <StatusPill
          status={recovery.status}
          label={
            recovery.status === "ok"
              ? "无需处理"
              : recovery.status === "warning"
                ? "正在自动重试"
                : "存在已隔离任务"
          }
        />
      </div>

      <div className="grid border-b border-slate-100 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["最近恢复周期", formatTaskDate(recovery.latestCycleAt)],
          ["正在自动重试", `${recovery.retryingJobs} 个任务`],
          ["已停止并隔离", `${recovery.quarantinedJobs} 个任务`],
          ["仍处于超时", `${recovery.staleRunningRuns} 次运行`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 border-t border-slate-100 px-5 py-4 first:border-t-0 sm:[&:nth-child(-n+2)]:border-t-0 xl:border-l xl:border-t-0 xl:first:border-l-0">
            <p className="text-[11px] font-bold text-slate-400">{label}</p>
            <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-xs font-semibold text-slate-600">
        最近一轮自动关闭 {recovery.staleRunsRecovered} 次超时运行，重新排队 {recovery.jobsRequeued} 个任务，新增隔离 {recovery.jobsQuarantined} 个任务。
      </div>

      {recovery.incidents.length > 0 ? (
        <div>
          {recovery.incidents.map((incident) => (
            <div
              key={incident.key}
              className="grid gap-3 border-t border-slate-100 px-5 py-4 first:border-t-0 md:grid-cols-[minmax(150px,0.8fr)_minmax(240px,2fr)_104px] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-950">
                    {incident.productName}
                  </p>
                  <StatusPill status={incident.status} label={incident.label} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {incident.jobCount} 个任务停止自动执行
                </p>
              </div>
              <p className="line-clamp-2 break-words text-xs leading-5 text-slate-600">
                {incident.detail}
              </p>
              <Link
                href={incident.actionHref}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                查看任务
                <ArrowRight size={14} strokeWidth={2.3} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-5 text-sm font-semibold text-emerald-800">
          <ShieldAlert size={18} strokeWidth={2.3} />
          没有需要人工介入的采集故障。
        </div>
      )}
    </AdminCard>
  );
}

export default async function AdminSystemPage() {
  const health = await getSystemHealth();

  return (
    <div>
      <AdminPageHeader
        eyebrow="系统状态"
        title="自动任务监控中心"
        description="统一查看服务器任务是否按时运行、最近成功时间、积压与失败原因。"
        action={
          <div className="flex items-center gap-2">
            <StatusPill status={health.summary.status} label={health.summary.label} />
            <SystemHealthAutoRefresh />
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AdminCard className="!bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-lime-300">
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
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
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
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Clock3 size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">检查时间</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {formatTaskDate(health.checkedAt)}
              </p>
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminCard className="mb-6 overflow-hidden !p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <ServerCog size={18} strokeWidth={2.3} />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950">服务器自动任务</h2>
              <p className="mt-0.5 text-xs text-slate-500">七类任务统一记录，页面每分钟自动刷新。</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <CalendarClock size={15} strokeWidth={2.2} />
            最近检查 {formatTaskDate(health.checkedAt)}
          </div>
        </div>

        {health.automationTasks.length > 0 ? (
          <div>
            {health.automationTasks.map((task) => (
              <AutomationTaskRow key={task.key} task={task} />
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-black text-slate-800">尚未读取到自动任务记录</p>
            <p className="mt-2 text-xs text-slate-500">执行最新数据库迁移后，任务状态会在这里出现。</p>
          </div>
        )}
      </AdminCard>

      {health.operationalRecovery ? (
        <OperationalRecoveryPanel recovery={health.operationalRecovery} />
      ) : null}

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
                className="rounded-lg border border-amber-200 bg-white/70 px-4 py-3 text-sm font-semibold leading-6 text-amber-900"
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
