"use client";

import AdminLink from "@/components/admin/AdminLink";
import { usePathname } from "next/navigation";
import { getActiveAdminHub, isSubNavActive } from "./admin-nav-config";

const roleLabels: Record<string, string> = {
  OWNER: "管理员",
  EDITOR: "编辑",
  VIEWER: "只读",
};

/**
 * 56px Linear / Vercel contextual top bar:
 * active Hub + horizontal secondary sub-navigation tabs + compact role badge (no duplicate Cmd+K).
 */
export default function AdminTopBar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const hub = getActiveAdminHub(pathname);

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center justify-between gap-4 border-b border-admin-border bg-admin-surface/95 px-6 backdrop-blur lg:flex">
      <div className="flex min-w-0 items-center gap-4 overflow-hidden">
        <span className="shrink-0 text-sm font-semibold tracking-tight text-admin-text">
          {hub.label}
        </span>

        {hub.subNav.length > 0 ? (
          <>
            <span aria-hidden="true" className="h-4 w-px shrink-0 bg-admin-border-strong" />
            <nav
              aria-label={`${hub.label}二级导航`}
              className="admin-scrollbar flex items-center gap-1 overflow-x-auto"
            >
              {hub.subNav.map((item) => {
                const active = isSubNavActive(pathname, item);
                return (
                  <AdminLink
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "relative inline-flex h-14 shrink-0 items-center whitespace-nowrap px-3 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
                      active
                        ? "font-medium text-admin-text"
                        : "text-admin-text-muted hover:text-admin-text",
                    ].join(" ")}
                  >
                    {item.label}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-2 bottom-0 h-[2px] bg-admin-text"
                      />
                    ) : null}
                  </AdminLink>
                );
              })}
            </nav>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span className="inline-flex h-7 items-center rounded-full border border-admin-border bg-admin-surface-subtle px-2.5 text-xs font-medium text-admin-text-secondary">
          {roleLabels[role] || "未知"}
        </span>
        <span
          title={name}
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-chip text-xs font-semibold text-admin-text"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      </div>
    </header>
  );
}
