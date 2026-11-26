"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Moon, Search, Terminal, X } from "lucide-react";
import {
  ADMIN_CMDK_EVENT,
  ADMIN_HUBS,
  ADMIN_THEME_EVENT,
  ADMIN_THEME_STORAGE_KEY,
} from "./admin-nav-config";

type CommandOption = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords: string;
  run: () => void;
};

function toggleThemeGlobal() {
  const shell = document.querySelector<HTMLElement>("[data-admin-theme]");
  if (!shell) return;
  const dark =
    shell.dataset.adminTheme === "dark" ||
    (shell.dataset.adminTheme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "light" : "dark";
  shell.dataset.adminTheme = next;
  document.cookie = `${ADMIN_THEME_STORAGE_KEY}=${next}; path=/admin; max-age=31536000; SameSite=Lax`;
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, next);
  } catch {
    // Ignore storage errors.
  }
  window.dispatchEvent(new Event(ADMIN_THEME_EVENT));
}

export default function AdminCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setQuery("");
            setActiveIndex(0);
          }
          return !prev;
        });
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const onCustomOpen = () => openPalette();
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(ADMIN_CMDK_EVENT, onCustomOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(ADMIN_CMDK_EVENT, onCustomOpen);
    };
  }, [openPalette]);

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      closePalette();
      router.push(href);
    },
    [closePalette, router],
  );

  const trimmed = query.trim();

  const options = useMemo<CommandOption[]>(() => {
    const list: CommandOption[] = [];

    if (trimmed) {
      list.push(
        {
          id: "search-products",
          group: "搜索产品",
          label: `在产品目录中搜索 “${trimmed}”`,
          hint: "/admin/products",
          keywords: trimmed,
          run: () => navigate(`/admin/products?q=${encodeURIComponent(trimmed)}`),
        },
        {
          id: "search-pipeline",
          group: "搜索产品",
          label: `在采集队列中搜索 “${trimmed}”`,
          hint: "/admin/pipeline",
          keywords: trimmed,
          run: () => navigate(`/admin/pipeline?q=${encodeURIComponent(trimmed)}`),
        },
        {
          id: "search-review",
          group: "搜索产品",
          label: `在异常审核中搜索 “${trimmed}”`,
          hint: "/admin/review",
          keywords: trimmed,
          run: () => navigate(`/admin/review?q=${encodeURIComponent(trimmed)}`),
        },
      );
    }

    for (const hub of ADMIN_HUBS) {
      list.push({
        id: `hub-${hub.id}`,
        group: "工作中心",
        label: hub.label,
        hint: hub.href,
        keywords: `${hub.label} ${hub.keywords} ${hub.href}`,
        run: () => navigate(hub.href),
      });
      for (const sub of hub.subNav) {
        if (sub.href === hub.href) continue;
        list.push({
          id: `sub-${sub.href}`,
          group: hub.label,
          label: sub.label,
          hint: sub.href,
          keywords: `${hub.label} ${sub.label} ${sub.keywords || ""} ${sub.href}`,
          run: () => navigate(sub.href),
        });
      }
    }

    list.push(
      {
        id: "diag-pricing-preview",
        group: "诊断工具",
        label: "数据库价格结构预览",
        hint: "/admin/pricing-preview",
        keywords: "pricing preview 价格 预览 诊断",
        run: () => navigate("/admin/pricing-preview"),
      },
      {
        id: "action-toggle-theme",
        group: "快捷操作",
        label: "切换明暗外观主题",
        hint: "Light / Dark",
        keywords: "theme dark light 夜间 浅色 深色 主题",
        run: () => {
          toggleThemeGlobal();
          closePalette();
        },
      },
    );

    if (!trimmed) return list;
    const needle = trimmed.toLowerCase();
    return list.filter(
      (item) =>
        item.id.startsWith("search-") ||
        item.label.toLowerCase().includes(needle) ||
        item.keywords.toLowerCase().includes(needle),
    );
  }, [closePalette, navigate, trimmed]);

  const safeIndex = Math.min(activeIndex, Math.max(0, options.length - 1));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
    >
      <button
        type="button"
        aria-label="关闭命令面板"
        onClick={closePalette}
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-admin-card border border-admin-border-strong bg-admin-surface shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-admin-border px-3.5 py-3">
          <Search size={15} className="shrink-0 text-admin-text-faint" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => (options.length ? (prev + 1) % options.length : 0));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((prev) =>
                  options.length ? (prev - 1 + options.length) % options.length : 0,
                );
              } else if (event.key === "Enter" && options[safeIndex]) {
                event.preventDefault();
                options[safeIndex].run();
              }
            }}
            placeholder="输入产品名、模块或命令…"
            aria-label="搜索命令或产品"
            className="w-full bg-transparent text-sm text-admin-text outline-none placeholder:text-admin-text-faint"
          />
          <button
            type="button"
            onClick={closePalette}
            aria-label="关闭命令面板"
            className="flex h-7 w-7 items-center justify-center rounded-admin-control text-admin-text-faint hover:bg-admin-chip hover:text-admin-text"
          >
            <X size={14} />
          </button>
        </div>

        <div className="admin-scrollbar max-h-[360px] overflow-y-auto p-1.5">
          {options.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-admin-text-muted">没有匹配的页面或命令。</p>
          ) : (
            options.map((option, idx) => {
              const active = idx === safeIndex;
              return (
                <button
                  key={option.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={option.run}
                  className={[
                    "flex w-full items-center justify-between gap-3 rounded-admin-control px-3 py-2 text-left text-[13px] transition-colors",
                    active
                      ? "bg-admin-chip text-admin-text"
                      : "text-admin-text-secondary hover:bg-admin-surface-subtle hover:text-admin-text",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {option.id === "action-toggle-theme" ? (
                      <Moon size={14} className="shrink-0 text-admin-text-faint" aria-hidden="true" />
                    ) : (
                      <Terminal size={14} className="shrink-0 text-admin-text-faint" aria-hidden="true" />
                    )}
                    <span className="truncate font-medium">{option.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-admin-text-faint">
                    <span>{option.group}</span>
                    {active ? <ArrowRight size={12} aria-hidden="true" /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-admin-border bg-admin-surface-subtle px-3.5 py-2 text-[11px] text-admin-text-faint">
          <span>↑↓ 移动 · Enter 执行 · Esc 关闭</span>
          <span className="font-mono">⌘K</span>
        </div>
      </div>
    </div>
  );
}
