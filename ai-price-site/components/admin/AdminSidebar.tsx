"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  Boxes,
  FileText,
  Globe2,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Radar,
  Search,
  ShieldCheck,
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
    label: "工作台",
    items: [{ label: "总览", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "价格采集",
    items: [
      { label: "线索入口", href: "/admin/discovery", icon: Radar },
      { label: "价格采集审核", href: "/admin/review", icon: ShieldCheck },
      { label: "正式价格", href: "/admin/prices", icon: Globe2 },
      { label: "购买力指数", href: "/admin/affordability", icon: BadgeDollarSign },
    ],
  },
  {
    label: "产品资料",
    items: [
      { label: "产品库", href: "/admin/products", icon: Boxes },
      { label: "套餐库", href: "/admin/plans", icon: Layers },
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
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname.startsWith(href);
}

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white shadow-sm">
            G
          </div>

          <div>
            <p className="text-sm font-bold tracking-tight text-blue-700">
              GeoSub
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
              自建后台
            </h1>
          </div>
        </div>

        <p className="mt-4 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
          {email}
        </p>
      </div>

      <div className="px-4">
        <div className="h-px bg-slate-200" />
      </div>

      <nav className="admin-scrollbar flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {group.label}
              </div>

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                        active
                          ? "bg-blue-50 text-blue-800 ring-1 ring-blue-100"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                      ].join(" ")}
                    >
                      {active ? (
                        <span className="absolute left-0 top-2.5 h-6 w-1 rounded-r-full bg-blue-700" />
                      ) : null}

                      <span
                        className={[
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                          active
                            ? "bg-blue-700 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-900",
                        ].join(" ")}
                      >
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
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={16} strokeWidth={2} />
            退出登录
          </button>
        </form>
      </div>
    </aside>
  );
}
