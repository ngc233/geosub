"use client";

import AdminLink from "@/components/admin/AdminLink";
import { AdminActionForm } from "./AdminPermissions";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  Boxes,
  FileText,
  Inbox,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Route,
  Search,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  ADMIN_CMDK_EVENT,
  ADMIN_HUBS,
  ADMIN_THEME_EVENT,
  ADMIN_THEME_STORAGE_KEY,
  getActiveAdminHub,
  isHubActive,
  type AdminHubId,
} from "./admin-nav-config";

const hubIcons: Record<AdminHubId, LucideIcon> = {
  inbox: Inbox,
  catalog: Boxes,
  pricing: Route,
  growth: LineChart,
  content: FileText,
  system: Activity,
};

function isDarkShell(shell: HTMLElement) {
  return (
    shell.dataset.adminTheme === "dark" ||
    (shell.dataset.adminTheme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function persistAdminTheme(next: "light" | "dark") {
  document.cookie = `${ADMIN_THEME_STORAGE_KEY}=${next}; path=/admin; max-age=31536000; SameSite=Lax`;
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, next);
  } catch {
    // Ignore private-mode storage failures; cookie still persists.
  }
}

function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(ADMIN_THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(ADMIN_THEME_EVENT, onChange);
  };
}

function readDarkShell() {
  const shell = document.querySelector<HTMLElement>("[data-admin-theme]");
  return shell ? isDarkShell(shell) : false;
}

function NightModeSwitch() {
  const dark = useSyncExternalStore(subscribeTheme, readDarkShell, () => false);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-admin-theme]");
    if (!shell || shell.dataset.adminTheme !== "system") return;
    try {
      const saved = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        shell.dataset.adminTheme = saved;
        document.cookie = `${ADMIN_THEME_STORAGE_KEY}=${saved}; path=/admin; max-age=31536000; SameSite=Lax`;
        window.dispatchEvent(new Event(ADMIN_THEME_EVENT));
      }
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => {
        const shell = document.querySelector<HTMLElement>("[data-admin-theme]");
        if (!shell) return;
        const next = isDarkShell(shell) ? "light" : "dark";
        shell.dataset.adminTheme = next;
        persistAdminTheme(next);
        window.dispatchEvent(new Event(ADMIN_THEME_EVENT));
      }}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-admin-control px-2.5 py-1.5 text-[13px] text-admin-text-secondary transition hover:bg-admin-chip hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent lg:min-h-8"
    >
      {dark ? (
        <Sun size={15} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon size={15} strokeWidth={1.75} aria-hidden="true" />
      )}
      <span className="flex-1 text-left">夜间模式</span>
      <span
        className={`relative h-4 w-7 rounded-full transition ${
          dark ? "bg-admin-primary" : "bg-admin-chip-hover"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-admin-on-primary transition-all ${
            dark ? "left-3.5" : "left-0.5"
          }`}
        />
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
  const currentHub = getActiveAdminHub(pathname);

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
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-admin-border px-4">
        <AdminLink
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded bg-admin-primary text-[11px] font-semibold tracking-tight text-admin-on-primary">
            G
          </span>
          <span className="text-[13px] font-semibold tracking-tight text-admin-text">GeoSub</span>
          <span className="rounded border border-admin-border bg-admin-surface px-1.5 py-0.5 font-mono text-[10px] text-admin-text-faint">
            OPS
          </span>
        </AdminLink>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            window.dispatchEvent(new Event(ADMIN_CMDK_EVENT));
          }}
          className="flex h-8 w-full items-center justify-between gap-2 rounded-admin-control border border-admin-border bg-admin-surface px-2.5 text-xs text-admin-text-faint transition hover:border-admin-border-strong hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
        >
          <span className="flex items-center gap-2 truncate">
            <Search size={13} aria-hidden="true" />
            <span>搜索或跳转…</span>
          </span>
          <kbd className="rounded border border-admin-border bg-admin-surface-subtle px-1 font-mono text-[10px] text-admin-text-faint">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="admin-scrollbar flex-1 overflow-y-auto px-3 py-3" aria-label="后台主导航">
        <div className="space-y-0.5">
          {ADMIN_HUBS.map((hub) => {
            const active = isHubActive(pathname, hub);
            const Icon = hubIcons[hub.id];

            return (
              <AdminLink
                key={hub.id}
                href={hub.href}
                prefetch="auto"
                showPending
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex min-h-11 items-center gap-2.5 rounded-admin-control px-2.5 py-1.5 text-[13px] transition-colors lg:min-h-8",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
                  active
                    ? "bg-admin-chip font-medium text-admin-text"
                    : "text-admin-text-secondary hover:bg-admin-chip/60 hover:text-admin-text",
                ].join(" ")}
              >
                <Icon
                  size={15}
                  strokeWidth={active ? 2 : 1.75}
                  className={active ? "text-admin-text" : "text-admin-text-faint"}
                  aria-hidden="true"
                />
                <span className="truncate">{hub.label}</span>
              </AdminLink>
            );
          })}
        </div>

        <div className="mt-5 border-t border-admin-border pt-3 lg:hidden">
          {currentHub.subNav.length > 0 ? (
            <>
              <p className="mb-1.5 px-2.5 text-[11px] font-medium text-admin-text-faint">
                {currentHub.label}
              </p>
              <div className="space-y-0.5">
                {currentHub.subNav.map((sub) => (
                  <AdminLink
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-11 items-center rounded-admin-control px-2.5 text-sm text-admin-text-secondary hover:bg-admin-chip hover:text-admin-text"
                  >
                    {sub.label}
                  </AdminLink>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </nav>

      <div className="space-y-1 border-t border-admin-border px-3 py-3">
        <NightModeSwitch />
        <div className="flex items-center justify-between gap-2 px-2.5 pt-1">
          <p className="truncate text-[11px] text-admin-text-muted" title={email}>
            {email}
          </p>
          <AdminActionForm capability="account" action="/admin/logout" method="post">
            <button
              type="submit"
              aria-label="退出登录"
              title="退出登录"
              className="flex h-7 w-7 items-center justify-center rounded-admin-control text-admin-text-faint transition hover:bg-admin-danger-soft hover:text-admin-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-danger"
            >
              <LogOut size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </AdminActionForm>
        </div>
        <div className="flex items-center justify-between px-2.5 pt-1 text-[11px] text-admin-text-faint">
          <span>
            网站版本 <span className="font-mono tabular-nums">v{version}</span>
          </span>
          <AdminLink
            href="/admin/system#versions"
            onClick={() => setMobileOpen(false)}
            className="text-admin-text-muted hover:text-admin-text hover:underline"
          >
            版本总览
          </AdminLink>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 border-r border-admin-border bg-admin-surface-subtle lg:flex lg:flex-col">
        {navigation}
      </aside>

      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-admin-border bg-admin-surface/95 px-4 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-admin-primary text-[11px] font-semibold text-admin-on-primary">
            G
          </span>
          <p className="truncate text-sm font-semibold text-admin-text">{currentHub.label}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="打开命令面板"
            onClick={() => window.dispatchEvent(new Event(ADMIN_CMDK_EVENT))}
            className="flex h-11 w-11 items-center justify-center rounded-admin-control text-admin-text-secondary hover:bg-admin-surface-subtle"
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button
            ref={mobileMenuButtonRef}
            type="button"
            aria-label="打开后台导航"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-admin-control text-admin-text-secondary transition hover:bg-admin-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
          >
            <Menu size={19} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="关闭后台导航"
            onClick={closeMobileNavigation}
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
          />
          <aside className="relative flex h-full w-[min(86vw,280px)] flex-col border-r border-admin-border bg-admin-surface-subtle shadow-2xl">
            <button
              type="button"
              aria-label="关闭后台导航"
              onClick={closeMobileNavigation}
              className="absolute right-2 top-0.5 z-10 flex h-11 w-11 items-center justify-center rounded-admin-control text-admin-text-secondary transition hover:bg-admin-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
            >
              <X size={17} strokeWidth={1.8} />
            </button>
            {navigation}
          </aside>
        </div>
      ) : null}
    </>
  );
}
