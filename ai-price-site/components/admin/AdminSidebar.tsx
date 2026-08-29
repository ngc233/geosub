"use client";

import AdminLink from "@/components/admin/AdminLink";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  MousePointerClick,
  Route,
  Search,
  SearchCheck,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

const navGroups: Array<{
  label: string;
  items: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
  }>;
}> = [
  {
    label: "今日工作",
    items: [
      { label: "总览", href: "/admin", icon: LayoutDashboard },
      { label: "产品流水线", href: "/admin/pipeline", icon: Route },
      { label: "数据质量", href: "/admin/data-quality", icon: Activity },
    ],
  },
  {
    label: "数据生产",
    items: [
      { label: "产品库", href: "/admin/products", icon: Boxes },
      { label: "套餐库", href: "/admin/plans", icon: Layers },
    ],
  },
  {
    label: "数据资产",
    items: [
      { label: "正式价格库", href: "/admin/prices", icon: Globe2 },
      { label: "购买力数据", href: "/admin/affordability", icon: BadgeDollarSign },
    ],
  },
  {
    label: "内容增长",
    items: [
      { label: "文章发布", href: "/admin/articles", icon: FileText },
      { label: "搜索需求", href: "/admin/search-demand", icon: SearchCheck },
      { label: "SEO 体检", href: "/admin/seo", icon: Search },
      { label: "导航菜单", href: "/admin/navigation", icon: Menu },
    ],
  },
  {
    label: "系统",
    items: [
      { label: "联系工单", href: "/admin/contact-tickets", icon: MailOpen },
      { label: "任务状态", href: "/admin/system", icon: Activity },
      { label: "访问事件", href: "/admin/events", icon: MousePointerClick },
      { label: "系统设置", href: "/admin/settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  if (href === "/admin/pipeline") {
    return [
      "/admin/pipeline",
      "/admin/discovery",
      "/admin/review",
      "/admin/collector-jobs",
    ].some((route) => pathname.startsWith(route));
  }

  return pathname.startsWith(href);
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
    .find((item) => isActive(pathname, item.href));

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
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white shadow-sm">
            G
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-blue-700 dark:text-blue-400">GeoSub</p>
            <p className="mt-0.5 text-base font-bold text-slate-950 dark:text-slate-50">管理后台</p>
          </div>
        </div>

        <p className="mt-4 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {email}
        </p>
      </div>

      <div className="px-4"><div className="h-px bg-slate-200 dark:bg-slate-800" /></div>

      <nav className="admin-scrollbar flex-1 overflow-y-auto px-4 py-4" aria-label="后台主导航">
        <div className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 px-3 text-[11px] font-bold text-slate-400 dark:text-slate-400">
                {group.label}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <AdminLink
                      key={item.href}
                      href={item.href}
                      prefetchOnIntent={[
                        "/admin/articles",
                        "/admin/navigation",
                        "/admin/settings",
                      ].includes(item.href)}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400/60",
                        active
                          ? "bg-blue-50 text-blue-800 ring-1 ring-blue-100 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-800"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                      ].join(" ")}
                    >
                      {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-700" /> : null}
                      <span className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                        active
                          ? "bg-blue-700 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-white",
                      ].join(" ")}>
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </AdminLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between px-1 text-xs">
          <span className="font-medium text-slate-400 dark:text-slate-400">当前版本</span>
          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            v{version}
          </span>
        </div>
        <form action="/admin/logout" method="post">
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-800 dark:hover:bg-red-950/60 dark:hover:text-red-300 dark:focus-visible:ring-red-400/60">
            <LogOut size={16} strokeWidth={2} />
            退出登录
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900">
        {navigation}
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="min-w-0">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400">GeoSub 管理后台</p>
          <p className="truncate text-sm font-bold text-slate-950 dark:text-slate-50">{currentItem?.label || "后台"}</p>
        </div>
        <button
          ref={mobileMenuButtonRef}
          type="button"
          aria-label="打开后台导航"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-400/60"
        >
          <Menu size={19} strokeWidth={2} />
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
          <aside className="relative flex h-full w-[min(86vw,320px)] flex-col bg-white shadow-2xl dark:bg-slate-900 dark:shadow-black/40">
            <button
              type="button"
              aria-label="关闭后台导航"
              onClick={closeMobileNavigation}
              className="absolute right-4 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-400/60"
            >
              <X size={18} strokeWidth={2} />
            </button>
            {navigation}
          </aside>
        </div>
      ) : null}
    </>
  );
}
