export const ADMIN_ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const LEGACY_ADMIN_CAPABILITIES = [
  "read",
  "draft",
  "manage",
  "account",
] as const;
export type LegacyAdminCapability = (typeof LEGACY_ADMIN_CAPABILITIES)[number];

export const DOMAIN_ADMIN_CAPABILITIES = [
  "pricing.review",
  "collector.trigger",
  "catalog.write",
  "seo.write",
  "settings.manage",
  "audit.read",
  "sessions.manage",
  "users.manage",
] as const;
export type AdminDomainCapability = (typeof DOMAIN_ADMIN_CAPABILITIES)[number];

export type AdminCapability = LegacyAdminCapability | AdminDomainCapability;

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "站点负责人",
  EDITOR: "内容编辑",
  VIEWER: "只读访客",
};

export const ADMIN_CAPABILITY_META: Record<
  AdminDomainCapability,
  { label: string; description: string }
> = {
  "pricing.review": {
    label: "价格审核发布",
    description: "审核价格观测、批准上线或驳回异常价格",
  },
  "collector.trigger": {
    label: "采集任务调度",
    description: "手动触发、暂停或重新排队采集与自动审核任务",
  },
  "catalog.write": {
    label: "目录与内容草稿",
    description: "编辑产品资料、套餐草稿与指南文章内容",
  },
  "seo.write": {
    label: "SEO 与搜索治理",
    description: "维护搜索机会、别名映射与转化修复项",
  },
  "settings.manage": {
    label: "系统配置管理",
    description: "修改统计代码、通知开关等站点级设置",
  },
  "audit.read": {
    label: "审计日志查看",
    description: "只读检索后台审核、配置与导出审计轨迹",
  },
  "sessions.manage": {
    label: "个人会话管理",
    description: "查看当前账号活跃设备并远程注销其他会话",
  },
  "users.manage": {
    label: "管理员账号治理",
    description: "管理后台角色分配与账号生命周期",
  },
};

export const ADMIN_ROLE_CAPABILITIES: Record<AdminRole, readonly AdminCapability[]> = {
  OWNER: [
    "read",
    "draft",
    "manage",
    "account",
    "pricing.review",
    "collector.trigger",
    "catalog.write",
    "seo.write",
    "settings.manage",
    "audit.read",
    "sessions.manage",
    "users.manage",
  ],
  EDITOR: [
    "read",
    "draft",
    "account",
    "catalog.write",
    "seo.write",
    "audit.read",
    "sessions.manage",
  ],
  VIEWER: [
    "read",
    "account",
    "audit.read",
    "sessions.manage",
  ],
};

const ROLE_CAPABILITY_SETS: Record<AdminRole, ReadonlySet<AdminCapability>> = {
  OWNER: new Set(ADMIN_ROLE_CAPABILITIES.OWNER),
  EDITOR: new Set(ADMIN_ROLE_CAPABILITIES.EDITOR),
  VIEWER: new Set(ADMIN_ROLE_CAPABILITIES.VIEWER),
};

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export function getAdminRoleLabel(role: string): string {
  return isAdminRole(role) ? ADMIN_ROLE_LABELS[role] : role;
}

export function listAdminRoleCapabilities(role: string): AdminCapability[] {
  if (!isAdminRole(role)) return [];
  return [...ADMIN_ROLE_CAPABILITIES[role]];
}

export function listAdminRoleDomainCapabilities(
  role: string,
): AdminDomainCapability[] {
  if (!isAdminRole(role)) return [];
  const allowed = ROLE_CAPABILITY_SETS[role];
  return DOMAIN_ADMIN_CAPABILITIES.filter((capability) => allowed.has(capability));
}

export function canAdmin(role: string, capability: AdminCapability): boolean {
  if (!isAdminRole(role)) return false;
  return ROLE_CAPABILITY_SETS[role].has(capability);
}

export function assertAdminCapability(role: string, capability: AdminCapability) {
  if (!canAdmin(role, capability)) {
    throw new Error("当前账号没有此操作权限。请联系站点负责人。");
  }
}
