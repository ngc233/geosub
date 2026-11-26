import { AdminBadge } from "../../../components/admin/AdminBadge";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import AdminDataTable, {
  type AdminDataColumn,
  type AdminDataRow,
} from "../../../components/admin/AdminDataTable";
import AdminFilterBar from "../../../components/admin/AdminFilterBar";
import { requireAdmin } from "../../../lib/admin-auth";
import {
  buildAdminListHref,
  nextSortDirection,
} from "../../../lib/admin-list-params";
import {
  AUDIT_LOG_RANGE_OPTIONS,
  formatAuditActionLabel,
  formatAuditTargetTypeLabel,
  getAuditActionTone,
  parseAuditLogFilters,
  summarizeAuditPayload,
} from "./model";
import { getAuditLogsPageData, type AuditLogsPageData } from "./queries";

export const dynamic = "force-dynamic";

const BASE_PATH = "/admin/audit-logs";

const COLUMNS: AdminDataColumn[] = [
  { key: "createdAt", label: "时间（北京时间）", sortable: true },
  { key: "actor", label: "操作人" },
  { key: "action", label: "动作", sortable: true },
  { key: "targetType", label: "对象", sortable: true },
  { key: "details", label: "变更摘要与备注" },
];

function formatShanghaiTime(value: Date): string {
  return value.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("audit.read");
  const rawParams = await searchParams;
  const filters = parseAuditLogFilters(rawParams);

  let data: AuditLogsPageData | null = null;
  let loadFailed = false;

  try {
    data = await getAuditLogsPageData(filters);
  } catch (error) {
    loadFailed = true;
    console.error(
      JSON.stringify({
        event: "admin_audit_logs_load_failed",
        errorName: error instanceof Error ? error.name : typeof error,
      }),
    );
  }

  const currentParams: Record<string, string | number | undefined> = {
    q: filters.q || undefined,
    actor: filters.actor || undefined,
    action: filters.action || undefined,
    targetType: filters.targetType || undefined,
    range: filters.range !== "30" ? filters.range : undefined,
    sort: filters.sort !== "createdAt" ? filters.sort : undefined,
    dir:
      filters.sort !== "createdAt" || filters.direction !== "desc"
        ? filters.direction
        : undefined,
  };

  const pageHref = (page: number) =>
    buildAdminListHref(BASE_PATH, currentParams, { page });

  const sortHref = (column: string) =>
    buildAdminListHref(BASE_PATH, currentParams, {
      sort: column,
      dir: nextSortDirection(filters.sort, filters.direction, column),
    });

  const rows: AdminDataRow[] = (data?.items ?? []).map((item) => {
    const summaryEntries = summarizeAuditPayload(item.oldValue, item.newValue);
    const actorPrimary = item.actorName || item.actorEmail || "系统任务";
    const actorSecondary =
      item.actorName && item.actorEmail
        ? item.actorEmail
        : item.actorRole || (item.actorId ? item.actorId.slice(0, 8) : "无操作人");

    return {
      key: item.id,
      cells: {
        createdAt: (
          <span className="whitespace-nowrap font-mono text-xs tabular-nums text-admin-text-secondary">
            {formatShanghaiTime(item.createdAt)}
          </span>
        ),
        actor: (
          <div className="min-w-[140px] max-w-[220px]">
            <p className="truncate text-sm font-medium text-admin-text">
              {actorPrimary}
            </p>
            <p className="truncate text-xs text-admin-text-muted">
              {actorSecondary}
            </p>
          </div>
        ),
        action: (
          <div className="flex flex-col items-start gap-1">
            <AdminBadge variant={getAuditActionTone(item.action)}>
              {formatAuditActionLabel(item.action)}
            </AdminBadge>
            <span className="font-mono text-xs text-admin-text-faint">
              {item.action}
            </span>
          </div>
        ),
        targetType: (
          <div className="min-w-[120px]">
            <p className="text-sm font-medium text-admin-text">
              {formatAuditTargetTypeLabel(item.targetType)}
            </p>
            <p className="font-mono text-xs text-admin-text-faint">
              {item.targetId ? item.targetId.slice(0, 8) : item.targetType}
            </p>
          </div>
        ),
        details: (
          <div className="min-w-[240px] max-w-[440px] space-y-1.5 break-words">
            {item.note ? (
              <p className="text-sm leading-5 text-admin-text-body">
                {item.note}
              </p>
            ) : null}
            {summaryEntries.length > 0 ? (
              <details className="group">
                <summary className="cursor-pointer select-none text-xs font-medium text-admin-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent">
                  查看脱敏变更字段（{summaryEntries.length} 项）
                </summary>
                <dl className="mt-2 space-y-1 rounded-lg border border-admin-border bg-admin-surface-subtle p-2.5 text-xs">
                  {summaryEntries.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                    >
                      <dt className="font-mono text-admin-text-muted">
                        {entry.key}:
                      </dt>
                      <dd className="break-all text-admin-text">
                        {entry.preview}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : !item.note ? (
              <span className="text-xs text-admin-text-faint">无附加明细</span>
            ) : null}
          </div>
        ),
      },
    };
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="系统治理"
        title="审计日志"
        description="只读查询后台审核、采集、配置与导出操作记录；敏感字段自动脱敏，按数据库真分页读取。"
      />

      {loadFailed ? (
        <AdminCard>
          <p role="alert" className="text-sm font-medium text-admin-danger">
            审计日志暂时无法读取，请稍后刷新页面或检查数据库连接状态。
          </p>
        </AdminCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AdminStatCard
              label="当前筛选记录"
              value={(data?.total ?? 0).toLocaleString("zh-CN")}
              helper={
                AUDIT_LOG_RANGE_OPTIONS.find(
                  (option) => option.value === filters.range,
                )?.label
              }
            />
            <AdminStatCard
              label="近 24 小时操作"
              value={(data?.last24hCount ?? 0).toLocaleString("zh-CN")}
              helper="全站后台写入与导出总计"
            />
            <AdminStatCard
              label="涉及操作人"
              value={(data?.activeActorCount ?? 0).toLocaleString("zh-CN")}
              helper="当前筛选范围内的管理员账号数"
            />
          </div>

          <AdminCard>
            <AdminFilterBar
              action={BASE_PATH}
              q={filters.q}
              searchLabel="关键词 / 对象 ID"
              searchPlaceholder="搜索动作、备注、邮箱或 UUID…"
              clearHref={BASE_PATH}
              preserve={{
                sort: filters.sort !== "createdAt" ? filters.sort : undefined,
                dir:
                  filters.sort !== "createdAt" || filters.direction !== "desc"
                    ? filters.direction
                    : undefined,
              }}
              filters={[
                {
                  name: "range",
                  label: "时间范围",
                  value: filters.range,
                  options: AUDIT_LOG_RANGE_OPTIONS,
                },
                {
                  name: "actor",
                  label: "操作人",
                  value: filters.actor,
                  options: data?.options.actors ?? [],
                },
                {
                  name: "action",
                  label: "动作",
                  value: filters.action,
                  options: data?.options.actions ?? [],
                },
                {
                  name: "targetType",
                  label: "对象类型",
                  value: filters.targetType,
                  options: data?.options.targetTypes ?? [],
                },
              ]}
            />

            <AdminDataTable
              caption="后台审计日志"
              columns={COLUMNS}
              rows={rows}
              sort={filters.sort}
              direction={filters.direction}
              sortHref={sortHref}
              page={data?.page ?? 1}
              totalPages={data?.totalPages ?? 1}
              total={data?.total ?? 0}
              pageSize={data?.pageSize ?? filters.pageSize}
              pageHref={pageHref}
              emptyMessage="当前筛选条件下没有审计记录。"
            />
          </AdminCard>
        </>
      )}
    </div>
  );
}
