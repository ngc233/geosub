import {
  parseAdminListParams,
  type AdminListParams,
} from "../../../lib/admin-list-params.ts";

export const AUDIT_LOG_SORTABLE_COLUMNS = [
  "createdAt",
  "action",
  "targetType",
] as const;

export type AuditLogSortColumn = (typeof AUDIT_LOG_SORTABLE_COLUMNS)[number];
export type AuditLogRangeValue = "7" | "30" | "90" | "all";

export const AUDIT_LOG_RANGE_OPTIONS: Array<{
  value: AuditLogRangeValue;
  label: string;
}> = [
  { value: "7", label: "最近 7 天" },
  { value: "30", label: "最近 30 天" },
  { value: "90", label: "最近 90 天" },
  { value: "all", label: "全部时间" },
];

export type AuditLogFilters = AdminListParams & {
  sort: AuditLogSortColumn;
  actor: string;
  action: string;
  targetType: string;
  range: AuditLogRangeValue;
};

type RawParams = Record<string, string | string[] | undefined>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENTIFIER_PATTERN = /^[a-z0-9_.:-]{1,80}$/i;
const SENSITIVE_KEY_PATTERN =
  /password|secret|token|cookie|hash|authorization|credential|private|apikey|api_key/i;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function isUuidValue(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

export function parseAuditLogFilters(raw: RawParams): AuditLogFilters {
  const base = parseAdminListParams(raw, {
    sortable: AUDIT_LOG_SORTABLE_COLUMNS,
    defaultSort: "createdAt",
    defaultDirection: "desc",
  });

  const rawActor = first(raw.actor).trim();
  const actor =
    rawActor === "system" || isUuidValue(rawActor) ? rawActor : "";

  const rawAction = first(raw.action).trim();
  const action = IDENTIFIER_PATTERN.test(rawAction) ? rawAction : "";

  const rawTargetType = first(raw.targetType).trim();
  const targetType = IDENTIFIER_PATTERN.test(rawTargetType)
    ? rawTargetType
    : "";

  const rawRange = first(raw.range).trim();
  const range: AuditLogRangeValue =
    rawRange === "7" || rawRange === "30" || rawRange === "90" || rawRange === "all"
      ? rawRange
      : "30";

  return {
    ...base,
    sort: base.sort as AuditLogSortColumn,
    actor,
    action,
    targetType,
    range,
  };
}

export function getAuditLogRangeStart(
  range: AuditLogRangeValue,
  now = new Date(),
): Date | null {
  if (range === "all") return null;
  const days = Number(range);
  if (!Number.isFinite(days) || days <= 0) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

const ACTION_LABELS: Record<string, string> = {
  approve_price_observation: "审核通过价格",
  reject_price_observation: "驳回价格观测",
  ignore_price_observation: "忽略价格观测",
  run_app_store_auto_review: "触发自动审核",
  queue_app_store_collection: "加入 App Store 采集",
  queue_authority_coverage_collection: "权威覆盖补采",
  run_now: "立即运行采集",
  pause: "暂停采集任务",
  export_events_csv: "导出事件 CSV",
  change_password: "修改账号密码",
  revoke_admin_session: "强制下线会话",
  revoke_other_admin_sessions: "注销其他全部会话",
  settings_analytics_update: "更新统计配置",
  settings_notifications_update: "更新通知配置",
  create: "创建记录",
  update: "更新记录",
  delete: "删除记录",
  archive: "归档记录",
  restore: "恢复记录",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  price_observation: "价格观测",
  collector_job: "采集任务",
  collector_product: "产品采集",
  product: "产品",
  plan: "套餐",
  article: "文章",
  event_log: "访问事件",
  admin_user: "管理员账号",
  admin_session: "登录会话",
  site_settings: "系统设置",
  site_setting: "系统设置",
  discovery_source: "线索来源",
  discovery_candidate: "候选线索",
  search_opportunity: "搜索机会",
  search_alias: "搜索别名",
  search_conversion_repair: "搜索转化修复",
  authority_coverage_task: "权威覆盖任务",
  contact_ticket: "联系工单",
  navigation_item: "导航菜单",
};

export function formatAuditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function formatAuditTargetTypeLabel(targetType: string): string {
  return TARGET_TYPE_LABELS[targetType] ?? targetType;
}

export type AuditBadgeTone =
  | "published"
  | "danger"
  | "review"
  | "neutral";

export function getAuditActionTone(action: string): AuditBadgeTone {
  const lower = action.toLowerCase();
  if (
    lower.includes("reject") ||
    lower.includes("delete") ||
    lower.includes("password") ||
    lower.includes("revoke") ||
    lower.includes("rollback")
  ) {
    return "danger";
  }
  if (
    lower.includes("approve") ||
    lower.includes("publish") ||
    lower.includes("create") ||
    lower.includes("restore")
  ) {
    return "published";
  }
  if (
    lower.includes("pause") ||
    lower.includes("ignore") ||
    lower.includes("archive") ||
    lower.includes("export") ||
    lower.includes("settings")
  ) {
    return "review";
  }
  return "neutral";
}

function truncateValue(text: string, maxLength = 80): string {
  const singleLine = text.replace(/[\r\n\t]+/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 1)}…`;
}

function formatScalarPreview(value: unknown): string {
  if (value === null || value === undefined) return "空";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return truncateValue(value);
  if (Array.isArray(value)) return `[${value.length} 项]`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return `{${keys.length} 字段}`;
  }
  return truncateValue(String(value));
}

export type RedactedAuditField = {
  key: string;
  preview: string;
};

export function redactAuditValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return truncateValue(value, 120);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 2) return formatScalarPreview(value);

  if (Array.isArray(value)) {
    return value.slice(0, 6).map((item) => redactAuditValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = redactAuditValue(entry, depth + 1);
      }
    }
    return output;
  }

  return truncateValue(String(value), 120);
}

export function summarizeAuditPayload(
  oldValue: unknown,
  newValue: unknown,
  maxEntries = 6,
): RedactedAuditField[] {
  const entries: RedactedAuditField[] = [];
  const safeOld =
    oldValue && typeof oldValue === "object" && !Array.isArray(oldValue)
      ? (redactAuditValue(oldValue) as Record<string, unknown>)
      : null;
  const safeNew =
    newValue && typeof newValue === "object" && !Array.isArray(newValue)
      ? (redactAuditValue(newValue) as Record<string, unknown>)
      : null;

  if (safeNew) {
    for (const [key, val] of Object.entries(safeNew)) {
      if (entries.length >= maxEntries) break;
      const before = safeOld && key in safeOld ? safeOld[key] : undefined;
      const preview =
        before !== undefined && JSON.stringify(before) !== JSON.stringify(val)
          ? `${formatScalarPreview(before)} → ${formatScalarPreview(val)}`
          : formatScalarPreview(val);
      entries.push({ key, preview });
    }
  } else if (safeOld) {
    for (const [key, val] of Object.entries(safeOld)) {
      if (entries.length >= maxEntries) break;
      entries.push({ key, preview: formatScalarPreview(val) });
    }
  } else if (newValue !== null && newValue !== undefined) {
    entries.push({ key: "value", preview: formatScalarPreview(redactAuditValue(newValue)) });
  }

  return entries;
}
