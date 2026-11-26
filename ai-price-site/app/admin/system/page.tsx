import { adminButtonClassName } from "@/components/admin/AdminButton";
import AdminLink from "@/components/admin/AdminLink";
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
import type { SystemRuntimeObservability } from "../../../lib/system-runtime-observability";
import SystemHealthAutoRefresh from "./SystemHealthAutoRefresh";
import AdminVersionOverview from "../../../components/admin/AdminVersionOverview";
import { measureAdminWorkload } from "../../../lib/admin-performance";

export const dynamic = "force-dynamic";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getStatusStyle(status: HealthStatus) {
  if (status === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  }
  if (status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
  }
  if (status === "critical") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300";
  }
  return "border-admin-border bg-admin-surface-subtle text-admin-text-muted dark:border-admin-border-strong dark:bg-admin-chip dark:text-admin-text-muted";
}

function getStatusDot(status: HealthStatus) {
  if (status === "ok") return "bg-emerald-500";
  if (status === "warning") return "bg-amber-500";
  if (status === "critical") return "bg-red-500";
  return "bg-admin-border-strong";
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
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
    <div className="min-w-0 rounded-lg bg-admin-surface-subtle/80 p-4 dark:bg-admin-surface/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-admin-text-faint">{metric.label}</p>
          <p className="mt-2 truncate text-lg font-semibold tracking-tight text-admin-text dark:text-admin-text">
            {metric.value}
          </p>
        </div>
        <StatusPill status={metric.status} />
      </div>

      {metric.helper ? (
        <p className="mt-3 line-clamp-3 break-words text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
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
            <h2 className="truncate text-base font-semibold text-admin-text dark:text-admin-text">
              {section.title}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
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
      className="grid gap-4 border-t border-admin-border px-5 py-4 first:border-t-0 xl:grid-cols-[minmax(210px,1.3fr)_130px_140px_minmax(180px,1fr)_104px] xl:items-center dark:border-admin-border"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-admin-text dark:text-admin-text">{task.title}</h3>
          <StatusPill status={task.status} label={task.stateLabel} />
        </div>
        <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">{task.description}</p>
        {task.errorMessage ? (
          <p className="mt-2 line-clamp-2 text-xs font-semibold text-red-700 dark:text-red-300">
            {task.errorMessage}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] font-semibold text-admin-text-faint">最近成功</p>
        <p className="mt-1 text-sm font-semibold text-admin-text dark:text-admin-text-body">
          {formatTaskDate(task.latestSuccessAt)}
        </p>
        {task.durationSeconds !== null ? (
          <p className="mt-1 text-xs text-admin-text-faint">耗时 {durationLabel(task.durationSeconds)}</p>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] font-semibold text-admin-text-faint">执行频率</p>
        <p className="mt-1 text-sm font-semibold text-admin-text dark:text-admin-text-body">{task.cadence}</p>
        <p className="mt-1 text-xs text-admin-text-faint">
          预计 {formatTaskDate(task.nextExpectedAt)}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-admin-text-faint">当前队列</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-admin-text-body dark:text-admin-text-body">{task.backlog}</p>
        <p className="mt-1 text-xs text-admin-text-faint">
          最近触发 {formatTaskDate(task.latestRunAt)}
        </p>
      </div>

      <AdminLink
        href={task.actionHref}
        className={adminButtonClassName({variant:"secondary",size:"sm",className:""})}
      >
        {task.actionLabel}
        <ArrowRight size={14} strokeWidth={2.3} />
      </AdminLink>
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
      <div className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-admin-border-strong">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <RefreshCw size={18} strokeWidth={2.3} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">采集任务自动恢复</h2>
            <p className="mt-0.5 text-xs text-admin-text-muted dark:text-admin-text-muted">
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

      <div className="grid border-b border-admin-border sm:grid-cols-2 xl:grid-cols-4 dark:border-admin-border">
        {[
          ["最近恢复周期", formatTaskDate(recovery.latestCycleAt)],
          ["正在自动重试", `${recovery.retryingJobs} 个任务`],
          ["已停止并隔离", `${recovery.quarantinedJobs} 个任务`],
          ["仍处于超时", `${recovery.staleRunningRuns} 次运行`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 border-t border-admin-border px-5 py-4 first:border-t-0
            sm:[&:nth-child(-n+2)]:border-t-0 xl:border-l xl:border-t-0 xl:first:border-l-0
            dark:border-admin-border">
            <p className="text-[11px] font-semibold text-admin-text-faint">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-admin-text dark:text-admin-text">{value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-admin-border bg-admin-surface-subtle/70 px-5 py-3 text-xs font-semibold
        text-admin-text-secondary dark:border-admin-border dark:text-admin-text-secondary
        dark:bg-admin-surface/70">
        最近一轮自动关闭 {recovery.staleRunsRecovered} 次超时运行，重新排队 {recovery.jobsRequeued} 个任务，新增隔离 {recovery.jobsQuarantined} 个任务。
      </div>

      {recovery.incidents.length > 0 ? (
        <div>
          {recovery.incidents.map((incident) => (
            <div
              key={incident.key}
              className="grid gap-3 border-t border-admin-border px-5 py-4 first:border-t-0 md:grid-cols-[minmax(150px,0.8fr)_minmax(240px,2fr)_104px] md:items-center dark:border-admin-border"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-admin-text dark:text-admin-text">
                    {incident.productName}
                  </p>
                  <StatusPill status={incident.status} label={incident.label} />
                </div>
                <p className="mt-1 text-xs text-admin-text-faint">
                  {incident.jobCount} 个任务停止自动执行
                </p>
              </div>
              <p className="line-clamp-2 break-words text-xs leading-5 text-admin-text-secondary dark:text-admin-text-secondary">
                {incident.detail}
              </p>
              <AdminLink
                href={incident.actionHref}
                className={adminButtonClassName({variant:"secondary",size:"sm",className:""})}
              >
                查看任务
                <ArrowRight size={14} strokeWidth={2.3} />
              </AdminLink>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-5 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          <ShieldAlert size={18} strokeWidth={2.3} />
          没有需要人工介入的采集故障。
        </div>
      )}
    </AdminCard>
  );
}

function formatDurationMs(ms: number) {
  if (ms <= 0) return "0 ms";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function RuntimeObservabilityPanel({
  observability,
}: {
  observability: SystemRuntimeObservability;
}) {
  const { pools, collectorQueue } = observability;
  const dispatchLabel =
    collectorQueue.dispatchMode === "queue"
      ? "队列 Worker（queue）"
      : "进程直启（spawn）";

  return (
    <AdminCard className="mb-6 overflow-hidden !p-0">
      <div className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-admin-border-strong">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Database size={18} strokeWidth={2.3} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">
              运行态连接池与队列观测
            </h2>
            <p className="mt-0.5 text-xs text-admin-text-muted dark:text-admin-text-muted">
              只读查看前后台数据库连接池隔离占用、采集队列分发状态与近 24 小时分阶段失败分布。
            </p>
          </div>
        </div>
        <StatusPill
          status={observability.status}
          label={
            observability.status === "ok"
              ? "隔离正常"
              : observability.status === "warning"
                ? "需关注"
                : observability.status === "critical"
                  ? "连接紧张"
                  : "部分不可读"
          }
        />
      </div>

      <div className="grid border-b border-admin-border sm:grid-cols-2 xl:grid-cols-4 dark:border-admin-border">
        {[
          {
            label: `前台连接池（${pools.web.applicationName}）`,
            value: observability.poolsAvailable
              ? `${pools.web.total} / ${pools.web.max}`
              : "不可读",
            helper: observability.poolsAvailable
              ? `活跃 ${pools.web.active} · 事务空闲 ${pools.web.idleInTransaction} · 最长 ${formatDurationMs(pools.web.longestActiveMs)}`
              : "当前账号无 pg_stat_activity 权限",
          },
          {
            label: `后台连接池（${pools.admin.applicationName}）`,
            value: observability.poolsAvailable
              ? `${pools.admin.total} / ${pools.admin.max}`
              : "不可读",
            helper: observability.poolsAvailable
              ? `活跃 ${pools.admin.active} · 事务空闲 ${pools.admin.idleInTransaction} · 最长 ${formatDurationMs(pools.admin.longestActiveMs)}`
              : "当前账号无 pg_stat_activity 权限",
          },
          {
            label: "采集分发与队列",
            value: dispatchLabel,
            helper: `排队 ${collectorQueue.queuedRuns} · 执行中 ${collectorQueue.activeRuns} · 其他 DB 连接 ${pools.otherConnections}`,
          },
          {
            label: "Worker 最近领单",
            value: formatTaskDate(collectorQueue.latestWorkerClaimAt),
            helper:
              collectorQueue.dispatchMode === "queue"
                ? "队列模式下由常驻 Worker 领取任务"
                : "切换 GEOSUB_COLLECTOR_DISPATCH_MODE=queue 后生效",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="min-w-0 border-t border-admin-border px-5 py-4 first:border-t-0
              sm:[&:nth-child(-n+2)]:border-t-0 xl:border-l xl:border-t-0 xl:first:border-l-0
              dark:border-admin-border"
          >
            <p className="truncate text-[11px] font-semibold text-admin-text-faint">
              {item.label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-admin-text dark:text-admin-text">
              {item.value}
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
              {item.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-admin-surface-subtle/70 px-5 py-3 text-xs text-admin-text-secondary dark:bg-admin-surface/70 dark:text-admin-text-secondary">
        <span className="font-semibold">
          近 24 小时采集失败分阶段统计（共 {collectorQueue.failures24h.total} 次）：
        </span>
        <div className="flex flex-wrap items-center gap-3 font-medium">
          <span>采集阶段 {collectorQueue.failures24h.collector}</span>
          <span>自动审核阶段 {collectorQueue.failures24h.autoReview}</span>
          <span>启动阶段 {collectorQueue.failures24h.spawn}</span>
          <span>未分类 {collectorQueue.failures24h.unclassified}</span>
        </div>
      </div>

      {observability.warnings.length > 0 ? (
        <div className="grid gap-2 border-t border-admin-border px-5 py-3 dark:border-admin-border">
          {observability.warnings.map((warning) => (
            <p
              key={warning}
              className="text-xs font-semibold leading-5 text-amber-800 dark:text-amber-300"
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </AdminCard>
  );
}

export default async function AdminSystemPage() {
  const health = await measureAdminWorkload("system.health", () => getSystemHealth());

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

      <AdminVersionOverview />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AdminCard>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Activity size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">总体状态</p>
              <p className="mt-1 text-2xl font-semibold text-admin-text dark:text-admin-text">{health.summary.label}</p>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Database size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">待处理项</p>
              <p className="mt-1 text-2xl font-semibold text-admin-text dark:text-admin-text">
                {health.summary.issueCount}
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-chip text-admin-text-secondary dark:bg-admin-chip dark:text-admin-text-secondary">
              <Clock3 size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">检查时间</p>
              <p className="mt-1 text-lg font-semibold text-admin-text dark:text-admin-text">
                {formatTaskDate(health.checkedAt)}
              </p>
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminCard className="mb-6 overflow-hidden !p-0">
        <div className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-admin-border-strong">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <ServerCog size={18} strokeWidth={2.3} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">服务器自动任务</h2>
              <p className="mt-0.5 text-xs text-admin-text-muted dark:text-admin-text-muted">七类任务统一记录，页面每分钟自动刷新。</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">
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
            <p className="text-sm font-semibold text-admin-text dark:text-admin-text-body">尚未读取到自动任务记录</p>
            <p className="mt-2 text-xs text-admin-text-muted dark:text-admin-text-muted">执行最新数据库迁移后，任务状态会在这里出现。</p>
          </div>
        )}
      </AdminCard>

      {health.operationalRecovery ? (
        <OperationalRecoveryPanel recovery={health.operationalRecovery} />
      ) : null}

      {health.runtimeObservability ? (
        <RuntimeObservabilityPanel observability={health.runtimeObservability} />
      ) : null}

      {health.issues.length > 0 ? (
        <AdminCard className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle size={18} strokeWidth={2.4} />
            <h2 className="text-base font-semibold text-admin-text">需要先看的问题</h2>
          </div>
          <div className="grid gap-2">
            {health.issues.map((issue) => (
              <div
                key={issue}
                className="rounded-lg border border-amber-200 bg-admin-surface/70 px-4 py-3 text-sm font-semibold
                  leading-6 text-amber-900 dark:border-amber-800 dark:bg-admin-surface/70 dark:text-amber-200"
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
