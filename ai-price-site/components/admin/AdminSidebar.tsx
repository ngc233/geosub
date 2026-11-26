"use client";

import AdminLink from "@/components/admin/AdminLink";
import { AdminActionForm } from "./AdminPermissions";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  Boxes,
  FileText,
  Globe2,
  Inbox,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Route,
  Search,
  ShieldCheck,
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
  matchesAdminRoute,
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

const sidebarSections: Array<{ label: string; hubIds: AdminHubId[] }> = [
  { label: "核心工作区", hubIds: ["inbox", "catalog", "pricing"] },
  { label: "增长与内容", hubIds: ["growth", "content"] },
  { label: "基础设施", hubIds: ["system"] },
];

const quickViews = [
  { label: "异常审核", href: "/admin/review", icon: ShieldCheck },
  { label: "正式价格", href: "/admin/prices", icon: Globe2 },
  { label: "数据质量", href: "/admin/data-quality", icon: Activity },
] as const;

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
    // Ignore storage failures in private browsing.
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
      className="flex min-h-11 w-full items-center gap-2.5 rounded-admin-control px-3 py-2 text-sm text-admin-text-secondary transition hover:bg-admin-chip hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent lg:min-h-9"
    >
      {dark ? (
        <Sun size={16} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon size={16} strokeWidth={1.75} aria-hidden="true" />
      )}
      <span className="flex-1 text-left">夜间模式</span>
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          dark ? "bg-admin-primary" : "bg-admin-chip-hover"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-admin-on-primary transition-all ${
            dark ? "left-[18px]" : "left-0.5"
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

  const hubMap = new Map(ADMIN_HUBS.map((hub) => [hub.id, hub]));

  const navigation = (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-admin-border px-4">
        <AdminLink
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-admin-primary text-xs font-semibold tracking-tight text-admin-on-primary">
            G
          </span>
          <span className="text-sm font-semibold tracking-tight text-admin-text">GeoSub</span>
          <span className="rounded border border-admin-border bg-admin-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-admin-text-muted">
            OPS
          </span>
        </AdminLink>
      </div>

      <div className="px-3.5 pt-3.5">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            window.dispatchEvent(new Event(ADMIN_CMDK_EVENT));
          }}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-admin-control border border-admin-border-strong bg-admin-surface px-3 text-[13px] text-admin-text-muted transition hover:border-admin-text/30 hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
        >
          <span className="flex items-center gap-2 truncate">
            <Search size={14} aria-hidden="true" />
            <span>搜索产品或跳转…</span>
          </span>
          <kbd className="rounded border border-admin-border bg-admin-surface-subtle px-1.5 py-0.5 font-mono text-[11px] text-admin-text-faint">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="admin-scrollbar flex-1 overflow-y-auto px-3.5 py-4" aria-label="后台主导航">
        <div className="space-y-5">
          {sidebarSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-wider text-admin-text-faint">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.hubIds.map((hubId) => {
                  const hub = hubMap.get(hubId);
                  if (!hub) return null;
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
                        "flex min-h-11 items-center gap-3 rounded-admin-control px-2.5 py-2 text-sm transition-colors lg:min-h-9",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
                        active
                          ? "bg-admin-chip font-medium text-admin-text"
                          : "text-admin-text-secondary hover:bg-admin-chip/65 hover:text-admin-text",
                      ].join(" ")}
                    >
                      <Icon
                        size={16}
                        strokeWidth={active ? 2 : 1.75}
                        className={active ? "text-admin-text" : "text-admin-text-faint"}
                        aria-hidden="true"
                      />
                      <span className="truncate">{hub.label}</span>
                    </AdminLink>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t border-admin-border pt-4">
            <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-wider text-admin-text-faint">
              高频直达
            </p>
            <div className="space-y-0.5">
              {quickViews.map((item) => {
                const active = matchesAdminRoute(pathname, item.href);
                const Icon = item.icon;
                return (
                  <AdminLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "flex min-h-11 items-center gap-3 rounded-admin-control px-2.5 py-1.5 text-[13px] transition-colors lg:min-h-8",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
                      active
                        ? "bg-admin-chip font-medium text-admin-text"
                        : "text-admin-text-muted hover:bg-admin-chip/65 hover:text-admin-text",
                    ].join(" ")}
                  >
                    <Icon size={15} strokeWidth={1.75} className="text-admin-text-faint" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </AdminLink>
                );
              })}
            </div>
          </div>

          {currentHub.subNav.length > 0 ? (
            <div className="border-t border-admin-border pt-4 lg:hidden">
              <p className="mb-1.5 px-2.5 text-[11px] font-medium text-admin-text-faint">
                {currentHub.label}子页
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
            </div>
          ) : null}
        </div>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-admin-border px-3.5 py-3.5">
        <NightModeSwitch />
        <div className="flex items-center justify-between gap-2 rounded-admin-control bg-admin-surface px-3 py-2 border border-admin-border">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-admin-text" title={email}>
              {email}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-admin-text-faint">
              <span>
                网站版本 <span className="font-mono tabular-nums">v{version}</span>
              </span>
              <span>·</span>
              <AdminLink
                href="/admin/system#versions"
                onClick={() => setMobileOpen(false)}
                className="text-admin-text-muted hover:text-admin-text hover:underline"
              >
                版本总览
              </AdminLink>
            </div>
          </div>
          <AdminActionForm capability="account" action="/admin/logout" method="post">
            <button
              type="submit"
              aria-label="退出登录"
              title="退出登录"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-admin-control text-admin-text-muted transition hover:bg-admin-danger-soft hover:text-admin-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-danger"
            >
              <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </AdminActionForm>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 border-r border-admin-border bg-admin-surface-subtle lg:flex lg:flex-col">
        {navigation}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-admin-border bg-admin-surface/95 px-4 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-admin-primary text-xs font-semibold text-admin-on-primary">
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
            <Menu size={20} strokeWidth={1.8} />
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
          <aside className="relative flex h-full w-[min(86vw,296px)] flex-col border-r border-admin-border bg-admin-surface-subtle shadow-2xl">
            <button
              type="button"
              aria-label="关闭后台导航"
              onClick={closeMobileNavigation}
              className="absolute right-2.5 top-1.5 z-10 flex h-11 w-11 items-center justify-center rounded-admin-control text-admin-text-secondary transition hover:bg-admin-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
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
