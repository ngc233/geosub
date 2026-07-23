"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  MousePointerClick,
  Radar,
  Search,
  Settings,
  ShieldCheck,
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
      { label: "采集与审核", href: "/admin/review", icon: ShieldCheck },
      { label: "数据质量", href: "/admin/data-quality", icon: Activity },
    ],
  },
  {
    label: "数据生产",
    items: [
      { label: "新产品接入", href: "/admin/discovery", icon: Radar },
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
      { label: "SEO 体检", href: "/admin/seo", icon: Search },
      { label: "导航菜单", href: "/admin/navigation", icon: Menu },
    ],
  },
  {
    label: "系统",
    items: [
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

  return pathname.startsWith(href);
}

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => isActive(pathname, item.href));

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const navigation = (
    <>
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white shadow-sm">
            G
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-blue-700">GeoSub</p>
            <p className="mt-0.5 text-base font-bold text-slate-950">管理后台</p>
          </div>
        </div>

        <p className="mt-4 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
          {email}
        </p>
      </div>

      <div className="px-4"><div className="h-px bg-slate-200" /></div>

      <nav className="admin-scrollbar flex-1 overflow-y-auto px-4 py-4" aria-label="后台主导航">
        <div className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 px-3 text-[11px] font-bold text-slate-400">
                {group.label}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
                        active
                          ? "bg-blue-50 text-blue-800 ring-1 ring-blue-100"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                      ].join(" ")}
                    >
                      {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-700" /> : null}
                      <span className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                        active
                          ? "bg-blue-700 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-900",
                      ].join(" ")}>
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-4">
        <form action="/admin/logout" method="post">
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
            <LogOut size={16} strokeWidth={2} />
            退出登录
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        {navigation}
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-xs font-bold text-blue-700">GeoSub 管理后台</p>
          <p className="truncate text-sm font-bold text-slate-950">{currentItem?.label || "后台"}</p>
        </div>
        <button
          type="button"
          aria-label="打开后台导航"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm"
        >
          <Menu size={19} strokeWidth={2} />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="关闭后台导航"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
          />
          <aside className="relative flex h-full w-[min(86vw,320px)] flex-col bg-white shadow-2xl">
            <button
              type="button"
              aria-label="关闭后台导航"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
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
