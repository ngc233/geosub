"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type NavChild = {
  name: string;
  href: string;
  external?: boolean;
  description?: string;
};

export type NavItem = {
  name: string;
  href: string;
  external?: boolean;
  match?: string[];
  children?: NavChild[];
};

const fallbackNavItems: NavItem[] = [
  {
    name: "首页",
    href: "/",
    match: ["/"],
  },
  {
    name: "AI 定价",
    href: "/ai-pricing/",
    match: ["/ai-pricing"],
  },
  {
    name: "软件订阅",
    href: "/software-subscriptions/",
    match: ["/software-subscriptions"],
  },
  {
    name: "游戏 / Steam",
    href: "/gaming-steam/",
    match: ["/gaming-steam"],
  },
  {
    name: "礼品卡",
    href: "/gift-cards/",
    match: ["/gift-cards"],
  },
  {
    name: "AI 工具",
    href: "/ai-rankings/",
    match: ["/ai-rankings"],
  },
  {
    name: "指南",
    href: "/guides/",
    match: ["/guides", "/articles"],
    children: [
      {
        name: "全部指南",
        href: "/guides/",
        description: "查看所有订阅、支付、账号和工具相关内容",
      },
      {
        name: "价格指南",
        href: "/guides/price-guide/",
        description: "各地区订阅价格、省钱区域和价格变化",
      },
      {
        name: "礼品卡教程",
        href: "/guides/gift-card-guide/",
        description: "礼品卡购买、充值和地区使用教程",
      },
      {
        name: "支付与账号",
        href: "/guides/payment-account/",
        description: "跨区支付、账号注册和订阅注意事项",
      },
      {
        name: "工具测评",
        href: "/guides/tool-review/",
        description: "AI 工具、软件工具与数字服务测评",
      },
    ],
  },
];

const languages = [
  {
    code: "zh",
    short: "CN",
    name: "中文",
  },
  {
    code: "en",
    short: "US",
    name: "English",
  },
  {
    code: "ja",
    short: "JP",
    name: "日本語",
  },
];

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  const withoutQuery = pathname.split("?")[0];
  const normalized = withoutQuery.endsWith("/") && withoutQuery !== "/"
    ? withoutQuery.slice(0, -1)
    : withoutQuery;

  return normalized || "/";
}

function getLocaleFromPath(pathname: string) {
  const segment = pathname.split("/")[1];

  if (languages.some((item) => item.code === segment)) {
    return segment;
  }

  return "zh";
}

function stripLocale(pathname: string) {
  const parts = normalizePath(pathname).split("/");
  const maybeLocale = parts[1];

  if (languages.some((item) => item.code === maybeLocale)) {
    const stripped = `/${parts.slice(2).join("/")}`;
    return normalizePath(stripped);
  }

  return normalizePath(pathname);
}

function withLocale(href: string, locale: string) {
  const cleanHref = href.startsWith("/") ? href : `/${href}`;

  if (cleanHref === "/") {
    return `/${locale}/`;
  }

  return `/${locale}${cleanHref}`;
}

function replaceLocaleInPath(pathname: string, nextLocale: string) {
  const parts = pathname.split("/");
  const currentLocale = parts[1];

  if (languages.some((item) => item.code === currentLocale)) {
    parts[1] = nextLocale;
    return parts.join("/") || `/${nextLocale}/`;
  }

  return `/${nextLocale}${pathname}`;
}

function isNavItemActive(item: NavItem, pathname: string) {
  if (item.external) {
    return false;
  }

  const currentPath = stripLocale(pathname);

  if (item.href === "/") {
    return currentPath === "/";
  }

  const matchList = item.match && item.match.length > 0 ? item.match : [item.href];

  return matchList.some((matchPath) => {
    const cleanMatch = normalizePath(matchPath);
    return currentPath === cleanMatch || currentPath.startsWith(`${cleanMatch}/`);
  });
}

function ChevronIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      className={[
        "h-4 w-4 text-zinc-400 transition-transform duration-200 ease-out",
        open ? "rotate-180" : "",
      ].join(" ")}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5">
      <span
        className={[
          "absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-all duration-200 ease-out",
          open ? "top-1.5 rotate-45" : "",
        ].join(" ")}
      />
      <span
        className={[
          "absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-current transition-all duration-200 ease-out",
          open ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
      <span
        className={[
          "absolute left-0 top-3 h-0.5 w-5 rounded-full bg-current transition-all duration-200 ease-out",
          open ? "top-1.5 -rotate-45" : "",
        ].join(" ")}
      />
    </span>
  );
}

export default function Header({ initialNavItems = [] }: { initialNavItems?: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();

  const languageRef = useRef<HTMLDivElement | null>(null);
  const navDropdownRef = useRef<HTMLDivElement | null>(null);

  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopDropdown, setDesktopDropdown] = useState<string | null>(null);

  const currentLocaleCode = getLocaleFromPath(pathname);
  const currentLocale =
    languages.find((item) => item.code === currentLocaleCode) || languages[0];

  const navItems =
    initialNavItems && initialNavItems.length > 0
      ? initialNavItems
      : fallbackNavItems;

  const activeItemName = useMemo(() => {
    return navItems.find((item) => isNavItemActive(item, pathname))?.name || "";
  }, [navItems, pathname]);

useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (languageRef.current && !languageRef.current.contains(target)) {
        setLanguageOpen(false);
      }

      if (navDropdownRef.current && !navDropdownRef.current.contains(target)) {
        setDesktopDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (nextLocale: string) => {
    setLanguageOpen(false);

    const nextPath = replaceLocaleInPath(pathname, nextLocale);
    router.push(nextPath);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/85 shadow-sm shadow-zinc-950/[0.03] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-6">
        <Link
          href={`/${currentLocaleCode}/`}
          className="group inline-flex items-center gap-2 rounded-full pr-3 text-zinc-950 transition duration-200 ease-out hover:text-lime-700 dark:text-white dark:hover:text-lime-300"
          aria-label="GeoSub 首页"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white shadow-sm shadow-zinc-950/20 transition duration-200 ease-out group-hover:scale-[1.03] dark:bg-white dark:text-zinc-950">
            G
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-lime-500 dark:border-zinc-950" />
          </span>
          <span className="text-xl font-black tracking-tight">GeoSub</span>
        </Link>

        <nav
          ref={navDropdownRef}
          className="hidden items-center gap-1 rounded-xl bg-zinc-100/70 p-1 text-sm font-semibold text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400 md:flex"
          aria-label="主导航"
        >
          {navItems.map((item) => {
            const active = isNavItemActive(item, pathname);
            const href = item.external ? item.href : withLocale(item.href, currentLocaleCode);
            const hasChildren = Boolean(item.children?.length);
            const dropdownOpen = desktopDropdown === item.name;

            return (
              <div key={item.name} className="relative">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDesktopDropdown((value) =>
                        value === item.name ? null : item.name
                      )
                    }
                    className={[
                      "group relative inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 transition-all duration-200 ease-out",
                      active
                        ? "bg-white text-zinc-950 shadow-sm shadow-zinc-900/5 dark:bg-zinc-800 dark:text-white"
                        : "hover:bg-lime-50 hover:text-zinc-950 dark:hover:bg-lime-500/10 dark:hover:text-white",
                    ].join(" ")}
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
                  >
                    <span>{item.name}</span>
                    <ChevronIcon open={dropdownOpen} />
                    <span
                      className={[
                      "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-lime-500 transition-all duration-200 ease-out",
                        active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                      ].join(" ")}
                    />
                  </button>
                ) : (
                  <Link
                    href={href}
                    onClick={() => setDesktopDropdown(null)}
                    className={[
                      "group relative inline-flex h-9 items-center rounded-lg px-3.5 transition-all duration-200 ease-out",
                      active
                        ? "bg-white text-zinc-950 shadow-sm shadow-zinc-900/5 dark:bg-zinc-800 dark:text-white"
                        : "hover:bg-lime-50 hover:text-zinc-950 dark:hover:bg-lime-500/10 dark:hover:text-white",
                    ].join(" ")}
                  >
                    {item.name}
                    <span
                      className={[
                        "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-lime-500 transition-all duration-200 ease-out",
                        active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                      ].join(" ")}
                    />
                  </Link>
                )}

                {hasChildren && dropdownOpen ? (
                  <div className="absolute left-1/2 top-12 w-[360px] -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 shadow-2xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40">
                    <div className="px-3 pb-2 pt-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                        {item.name}
                      </p>
                    </div>

                    <div className="space-y-1">
                      {item.children?.map((child) => (
                        <Link
                          key={child.href}
                          href={child.external ? child.href : withLocale(child.href, currentLocaleCode)}
                          onClick={() => setDesktopDropdown(null)}
                          className="block rounded-lg px-3 py-3 transition duration-200 ease-out hover:bg-lime-50 dark:hover:bg-lime-500/10"
                        >
                          <p className="text-sm font-bold text-zinc-950 dark:text-white">
                            {child.name}
                          </p>
                          {child.description ? (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                              {child.description}
                            </p>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div ref={languageRef} className="relative">
            <button
              type="button"
              onClick={() => setLanguageOpen((value) => !value)}
              className={[
                "hidden h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold shadow-sm transition-all duration-200 ease-out sm:inline-flex",
                languageOpen
                  ? "border-lime-300 bg-lime-50 text-zinc-950 ring-4 ring-lime-500/10 dark:border-lime-500/40 dark:bg-lime-500/10 dark:text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
              aria-haspopup="menu"
              aria-expanded={languageOpen}
            >
              <span className="inline-flex h-5 min-w-7 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[10px] font-black text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {currentLocale.short}
              </span>
              <span>{currentLocale.name}</span>
              <ChevronIcon open={languageOpen} />
            </button>

            {languageOpen ? (
              <div className="absolute right-0 mt-3 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30">
                {languages.map((language) => {
                  const active = language.code === currentLocaleCode;

                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => handleLanguageChange(language.code)}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-200 ease-out",
                        active
                          ? "bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-5 min-w-7 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[10px] font-black text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                          {language.short}
                        </span>
                        <span className="font-semibold">{language.name}</span>
                      </span>

                      {active ? (
                        <span className="h-2 w-2 rounded-full bg-lime-500" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className={[
              "inline-flex h-10 w-10 items-center justify-center rounded-xl border text-zinc-700 transition-all duration-200 ease-out md:hidden",
              mobileOpen
                ? "border-lime-300 bg-lime-50 text-lime-700 ring-4 ring-lime-500/10"
                : "border-zinc-200 bg-white hover:bg-zinc-50",
            ].join(" ")}
            aria-label="打开菜单"
            aria-expanded={mobileOpen}
          >
            <MenuIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-zinc-200 bg-white px-5 py-4 shadow-xl shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <div className="mb-3 text-xs font-bold text-zinc-400">
            当前栏目：{activeItemName || "首页"}
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const active = isNavItemActive(item, pathname);

              return (
                <div key={item.name}>
                  <Link
                    href={item.external ? item.href : withLocale(item.href, currentLocaleCode)}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "flex items-center justify-between rounded-lg px-4 py-3 text-sm font-bold transition-all duration-200 ease-out",
                      active
                        ? "bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900",
                    ].join(" ")}
                  >
                    <span>{item.name}</span>
                    {active ? <span className="h-2 w-2 rounded-full bg-lime-500" /> : null}
                  </Link>

                  {item.children?.length && active ? (
                    <div className="ml-4 mt-1 space-y-1 border-l border-zinc-200 pl-3 dark:border-zinc-800">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.external ? child.href : withLocale(child.href, currentLocaleCode)}
                          onClick={() => setMobileOpen(false)}
                          className="block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-500 transition duration-200 ease-out hover:bg-lime-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-lime-500/10 dark:hover:text-white"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {languages.map((language) => {
              const active = language.code === currentLocaleCode;

              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => handleLanguageChange(language.code)}
                  className={[
                    "rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 ease-out",
                    active
                      ? "bg-lime-50 text-lime-700 ring-1 ring-lime-200 dark:bg-lime-500/10 dark:text-lime-300 dark:ring-lime-500/30"
                      : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                  ].join(" ")}
                >
                  {language.short}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}


