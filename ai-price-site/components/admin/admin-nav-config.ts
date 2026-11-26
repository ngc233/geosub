export type AdminHubId = "inbox" | "catalog" | "pricing" | "growth" | "content" | "system";

export type AdminSubNavItem = {
  label: string;
  href: string;
  keywords?: string;
  also?: string[];
};

export type AdminHubConfig = {
  id: AdminHubId;
  label: string;
  shortLabel: string;
  href: string;
  keywords: string;
  also?: string[];
  subNav: AdminSubNavItem[];
};

export const ADMIN_CMDK_EVENT = "geosub-admin-open-cmdk";
export const ADMIN_THEME_EVENT = "geosub-admin-theme";
export const ADMIN_THEME_STORAGE_KEY = "geosub_admin_theme";

/**
 * Single source of truth for the 6-hub Linear/Vercel navigation model.
 * Keeps every operational route reachable in 1–2 clicks without cluttering the sidebar.
 */
export const ADMIN_HUBS: readonly AdminHubConfig[] = [
  {
    id: "inbox",
    label: "收件箱",
    shortLabel: "收件箱",
    href: "/admin",
    keywords: "inbox workspace todo 待办 工作台 首页",
    subNav: [],
  },
  {
    id: "catalog",
    label: "产品目录",
    shortLabel: "产品",
    href: "/admin/products",
    keywords: "products plans catalog 产品 套餐 目录",
    also: ["/admin/plans"],
    subNav: [
      { label: "产品列表", href: "/admin/products", keywords: "products 服务 产品" },
      { label: "跨产品套餐", href: "/admin/plans", keywords: "plans 套餐" },
    ],
  },
  {
    id: "pricing",
    label: "价格运维",
    shortLabel: "价格",
    href: "/admin/pipeline",
    keywords: "pipeline review prices quality affordability collector discovery 采集 审核 价格 质量 购买力",
    also: [
      "/admin/review",
      "/admin/prices",
      "/admin/data-quality",
      "/admin/affordability",
      "/admin/affordability-preview",
      "/admin/collector-jobs",
      "/admin/discovery",
      "/admin/price-observations",
      "/admin/pricing-preview",
    ],
    subNav: [
      { label: "产品队列", href: "/admin/pipeline", keywords: "pipeline 队列 流水线" },
      {
        label: "异常审核",
        href: "/admin/review",
        keywords: "review 审核 异常",
        also: ["/admin/price-observations"],
      },
      { label: "正式价格", href: "/admin/prices", keywords: "prices 正式价格" },
      { label: "数据质量", href: "/admin/data-quality", keywords: "quality 健康 诊断" },
      { label: "购买力", href: "/admin/affordability", keywords: "affordability 购买力" },
      { label: "运行记录", href: "/admin/collector-jobs", keywords: "collector jobs 任务 采集" },
      { label: "线索录入", href: "/admin/discovery", keywords: "discovery 线索 发现" },
    ],
  },
  {
    id: "growth",
    label: "增长分析",
    shortLabel: "增长",
    href: "/admin/analytics",
    keywords: "analytics traffic seo search demand growth events 流量 搜索 增长 周报 事件",
    also: ["/admin/search-demand", "/admin/seo", "/admin/growth", "/admin/events"],
    subNav: [
      { label: "流量与归因", href: "/admin/analytics", keywords: "analytics traffic 流量 漏斗" },
      { label: "搜索需求", href: "/admin/search-demand", keywords: "search demand 搜索词" },
      { label: "SEO 体检", href: "/admin/seo", keywords: "seo 体检 索引" },
      { label: "增长周报", href: "/admin/growth", keywords: "growth 周报 gsc bing" },
      { label: "访问事件", href: "/admin/events", keywords: "events 事件 日志" },
    ],
  },
  {
    id: "content",
    label: "内容管理",
    shortLabel: "内容",
    href: "/admin/articles",
    keywords: "articles content navigation promotions 文章 内容 导航 推广",
    also: ["/admin/content", "/admin/navigation", "/admin/promotions"],
    subNav: [
      { label: "文章", href: "/admin/articles", keywords: "articles 指南 文章" },
      { label: "内容试点", href: "/admin/content", keywords: "content 发布 试点" },
      { label: "导航菜单", href: "/admin/navigation", keywords: "navigation 菜单" },
      { label: "自营推广", href: "/admin/promotions", keywords: "promotions 推广" },
    ],
  },
  {
    id: "system",
    label: "系统运维",
    shortLabel: "系统",
    href: "/admin/system",
    keywords: "system tickets audit logs settings preview 系统 工单 审计 设置",
    also: ["/admin/contact-tickets", "/admin/audit-logs", "/admin/settings"],
    subNav: [
      { label: "任务状态", href: "/admin/system", keywords: "system health 健康 版本" },
      { label: "联系工单", href: "/admin/contact-tickets", keywords: "tickets 工单 反馈" },
      { label: "审计日志", href: "/admin/audit-logs", keywords: "audit logs 审计" },
      { label: "系统设置", href: "/admin/settings", keywords: "settings 密码 安全 设置" },
    ],
  },
];

export function matchesAdminRoute(pathname: string, route: string): boolean {
  if (route === "/admin") return pathname === "/admin";
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isHubActive(pathname: string, hub: AdminHubConfig): boolean {
  if (hub.href === "/admin") return pathname === "/admin";
  return [hub.href, ...(hub.also || [])].some((route) => matchesAdminRoute(pathname, route));
}

export function isSubNavActive(pathname: string, item: AdminSubNavItem): boolean {
  return [item.href, ...(item.also || [])].some((route) => matchesAdminRoute(pathname, route));
}

export function getActiveAdminHub(pathname: string): AdminHubConfig {
  return ADMIN_HUBS.find((hub) => isHubActive(pathname, hub)) || ADMIN_HUBS[0];
}
