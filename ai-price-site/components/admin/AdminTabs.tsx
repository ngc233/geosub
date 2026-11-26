import AdminLink from "@/components/admin/AdminLink";
import type { ReactNode } from "react";

export type AdminTabItem = {
  id: string;
  label: string;
  href: string;
  badge?: number | string;
};

/**
 * Vercel / Linear underline tab strip.
 * Supports flush edge-to-edge placement (`flush={true}`) directly below a header.
 */
export default function AdminTabs({
  ariaLabel,
  items,
  activeId,
  rightSlot,
  flush = false,
}: {
  ariaLabel: string;
  items: readonly AdminTabItem[];
  activeId: string;
  rightSlot?: ReactNode;
  flush?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col gap-2 border-b border-admin-border sm:flex-row sm:items-center sm:justify-between",
        flush ? "bg-admin-surface px-4 sm:px-6" : "mb-6",
      ].join(" ")}
    >
      <nav
        aria-label={ariaLabel}
        className="admin-scrollbar -mb-px flex items-center gap-1 overflow-x-auto"
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <AdminLink
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "relative inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-[13px] transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
                active
                  ? "font-medium text-admin-text"
                  : "text-admin-text-muted hover:text-admin-text",
              ].join(" ")}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== null ? (
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
                    active
                      ? "bg-admin-chip font-medium text-admin-text"
                      : "bg-admin-surface-subtle text-admin-text-faint"
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1 bottom-0 h-[2px] bg-admin-text"
                />
              ) : null}
            </AdminLink>
          );
        })}
      </nav>
      {rightSlot ? <div className="pb-2 sm:pb-0">{rightSlot}</div> : null}
    </div>
  );
}
