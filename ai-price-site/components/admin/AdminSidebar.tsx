"use client";

import AdminLink from "@/components/admin/AdminLink";
import { AdminActionForm } from "./AdminPermissions";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  BadgeDollarSign,
  Boxes,
  FileText,
  Globe2,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MailOpen,
  Moon,
  MousePointerClick,
  Route,
  Search,
  SearchCheck,
  LineChart,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Other routes that belong to this entry (reached from its own page, not the sidebar). */
  also?: string[];
};

// Groups follow the six business modules (docs/rfc-admin-information-architecture-2026-10-28.md).
// The collection pipeline stays the single lifecycle entry: discovery, review and
// collector jobs are reached from its step bar and highlight it.
const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "工作台",
    items: [{ label: "今日待办", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "产品目录",
    items: [
      { label: "产品", href: "/admin/products", icon: Boxes },
      { label: "套餐", href: "/admin/plans", icon: Layers },
    ],
  },
  {
    label: "价格数据",
    items: [
      {
        label: "采集与审核",
        href: "/admin/pipeline",
        icon: Route,
        also: ["/admin/discovery", "/admin/review", "/admin/collector-jobs", "/admin/price-observations"],
      },
      { label: "正式价格", href: "/admin/prices", icon: Globe2 },
      { label: "数据质量", href: "/admin/data-quality", icon: Activity },
      { label: "购买力", href: "/admin/affordability", icon: BadgeDollarSign },
    ],
  },
  {
    label: "内容与增长",
    items: [
      { label: "内容发布试点", href: "/admin/content", icon: FileText },
      { label: "文章", href: "/admin/articles", icon: FileText },
      { label: "搜索需求", href: "/admin/search-demand", icon: SearchCheck },
      { label: "SEO 体检", href: "/admin/seo", icon: Search },
      { label: "增长周报", href: "/admin/growth", icon: LineChart },
      { label: "流量", href: "/admin/analytics", icon: LineChart },
      { label: "访问事件", href: "/admin/events", icon: MousePointerClick },
      { label: "自营推广", href: "/admin/promotions", icon: BadgeDollarSign },
    ],
  },
  {
    label: "运营",
    items: [
      { label: "联系工单", href: "/admin/contact-tickets", icon: MailOpen },
      { label: "导航菜单", href: "/admin/navigation", icon: Menu },
    ],
  },
  {
    label: "系统",
    items: [
      { label: "任务状态", href: "/admin/system", icon: Activity },
      { label: "设置", href: "/admin/settings", icon: Settings },
    ],
  },
];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/admin") {
    return pathname === "/admin";
  }

  return [item.href, ...(item.also || [])].some((route) => matchesRoute(pathname, route));
}

function isDarkShell(shell: HTMLElement) {
  return shell.dataset.adminTheme === "dark" ||
    (shell.dataset.adminTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

const THEME_EVENT = "geosub-admin-theme";

function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function readDarkShell() {
  const shell = document.querySelector<HTMLElement>("[data-admin-theme]");
  return shell ? isDarkShell(shell) : false;
}

function NightModeSwitch() {
  const dark = useSyncExternalStore(subscribeTheme, readDarkShell, () => false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => {
        const shell = document.querySelector<HTMLElement>("[data-admin-theme]");
        if (!shell) return;
        shell.dataset.adminTheme = isDarkShell(shell) ? "light" : "dark";
        window.dispatchEvent(new Event(THEME_EVENT));
      }}
      className="flex min-h-11 w-full items-center gap-3 rounded-admin-control px-3 py-2.5 lg:min-h-0
        text-sm text-admin-text-secondary transition hover:bg-admin-surface-subtle
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
    >
      <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span className="flex-1 text-left">夜间模式</span>
      <span className={`relative h-5 w-9 rounded-full transition ${dark ? "bg-admin-accent" : "bg-admin-chip-hover"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-admin-surface shadow-sm transition-all dark:bg-admin-text ${dark ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export default function AdminSidebar({
  email,
  version,
}: {
  email: string;
  version: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const currentItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => isActive(pathname, item));

  const closeMobileNavigation = useCallback(() => {
    setMobileOpen(false);
    window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileNavigation();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeMobileNavigation, mobileOpen]);

  const navigation = (
    <>
      <div className="flex h-[72px] shrink-0 items-center gap-3 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-admin-control bg-admin-accent text-sm font-semibold text-white">
          G
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-admin-text">GeoSub</p>
          <p className="truncate text-xs text-admin-text-muted">{email}</p>
        </div>
      </div>

      <nav className="admin-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-2" aria-label="后台主导航">
        <div className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-3 text-xs text-admin-text-muted">
                {group.label}
              </div>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;

                  return (
                    <AdminLink
                      key={item.href}
                      href={item.href}
                      prefetch="auto"
                      showPending
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={[
                        [
                          "flex min-h-11 items-center gap-3 rounded-admin-control px-3 py-2.5 lg:min-h-0 text-sm transition",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
                        ].join(" "),
                        active
                          ? "bg-admin-accent-soft font-medium text-admin-accent"
                          : "text-admin-text-secondary hover:bg-admin-surface-subtle hover:text-admin-text",
                      ].join(" ")}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </AdminLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="space-y-0.5 border-t border-admin-border px-4 py-4">
        <NightModeSwitch />
        <AdminActionForm capability="account" action="/admin/logout" method="post">
          <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-admin-control
            px-3 py-2.5 lg:min-h-0 text-sm text-admin-text-secondary transition hover:bg-admin-danger-soft
            hover:text-admin-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-danger">
            <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
            退出登录
          </button>
        </AdminActionForm>
        <p className="flex items-center justify-between px-3 pt-2 text-xs text-admin-text-faint">
          <span>当前版本</span>
          <span className="tabular-nums">v{version}</span>
        </p>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-admin-surface lg:flex lg:flex-col">
        {navigation}
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-admin-border bg-admin-surface/95 px-4 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-xs text-admin-text-muted">GeoSub 管理后台</p>
          <p className="truncate text-sm font-semibold text-admin-text">{currentItem?.label || "后台"}</p>
        </div>
        <button
          ref={mobileMenuButtonRef}
          type="button"
          aria-label="打开后台导航"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-admin-control text-admin-text-secondary
            transition hover:bg-admin-surface-subtle focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-admin-accent"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="关闭后台导航"
            onClick={closeMobileNavigation}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
          />
          <aside className="relative flex h-full w-[min(86vw,300px)] flex-col bg-admin-surface shadow-2xl">
            <button
              type="button"
              aria-label="关闭后台导航"
              onClick={closeMobileNavigation}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-admin-control
                text-admin-text-secondary transition hover:bg-admin-surface-subtle focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-admin-accent"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
            {navigation}
          </aside>
        </div>
      ) : null}
    </>
  );
}
