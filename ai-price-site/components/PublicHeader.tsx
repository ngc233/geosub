"use client";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { resolveCanvasLocale, type CanvasLocale } from "../lib/canvas-ui-copy";
import { getLanguageSwitchHref } from "../lib/language-switch-route";
import { unifiedPublicLocales } from "../lib/public-style-rollout";
import { withSiteLocale, type SiteLocale } from "../lib/site-locale";
import type { NavItem } from "./Header";
import GeoSubLogo from "./GeoSubLogo";
import PublicIcon from "./PublicIcon";
import { PublicDialog } from "./PublicControls";
import PublicSearch from "./PublicSearch";

const publicHeaderCopy: Record<
  CanvasLocale,
  {
    languageName: string;
    homeAria: string;
    mainNavAria: string;
    openMenuAria: string;
    menuLabel: string;
    closeMenuAria?: string;
    mobileNavAria: string;
  }
> = {
  zh: {
    languageName: "简体中文",
    homeAria: "GeoSub 首页",
    mainNavAria: "主导航",
    openMenuAria: "打开菜单",
    menuLabel: "菜单",
    closeMenuAria: undefined,
    mobileNavAria: "手机导航",
  },
  "zh-tw": {
    languageName: "繁體中文",
    homeAria: "GeoSub 首頁",
    mainNavAria: "主導覽",
    openMenuAria: "開啟選單",
    menuLabel: "選單",
    closeMenuAria: "關閉選單",
    mobileNavAria: "行動版導覽",
  },
  en: {
    languageName: "English",
    homeAria: "GeoSub home",
    mainNavAria: "Main navigation",
    openMenuAria: "Open menu",
    menuLabel: "Menu",
    closeMenuAria: "Close menu",
    mobileNavAria: "Mobile navigation",
  },
  ja: {
    languageName: "日本語",
    homeAria: "GeoSub ホーム",
    mainNavAria: "メインナビゲーション",
    openMenuAria: "メニューを開く",
    menuLabel: "メニュー",
    closeMenuAria: "メニューを閉じる",
    mobileNavAria: "モバイルナビゲーション",
  },
  ko: {
    languageName: "한국어",
    homeAria: "GeoSub 홈",
    mainNavAria: "주요 탐색",
    openMenuAria: "메뉴 열기",
    menuLabel: "메뉴",
    closeMenuAria: "메뉴 닫기",
    mobileNavAria: "모바일 탐색",
  },
  es: {
    languageName: "Español",
    homeAria: "Inicio de GeoSub",
    mainNavAria: "Navegación principal",
    openMenuAria: "Abrir menú",
    menuLabel: "Menú",
    closeMenuAria: "Cerrar menú",
    mobileNavAria: "Navegación móvil",
  },
};

export default function PublicHeader({
  items,
  active,
  pathname,
  languages,
  locale = "zh",
}: {
  items: NavItem[];
  active: string;
  pathname: string;
  languages: { code: SiteLocale; name: string }[];
  locale?: CanvasLocale;
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const copy = publicHeaderCopy[resolvedLocale];
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageId = useId();
  const [pendingActive, setPendingActive] = useState<{ pathname: string; active: string; name: string } | null>(null);
  // Discard a completed navigation, including before a later browser Back.
  if (pendingActive && (pendingActive.pathname !== pathname || pendingActive.active !== active)) setPendingActive(null);
  const selected = pendingActive?.pathname === pathname && pendingActive.active === active ? pendingActive.name : active;
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cleanPath = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  const isHomepage = unifiedPublicLocales.some((loc) => cleanPath === `/${loc}`);
  const [prevIsHome, setPrevIsHome] = useState(isHomepage);
  const [heroSearchInView, setHeroSearchInView] = useState(isHomepage);
  if (isHomepage !== prevIsHome) {
    setPrevIsHome(isHomepage);
    setHeroSearchInView(isHomepage);
  }
  const nav = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
      if (el) {
        setIndicator({
          left: el.getBoundingClientRect().left - nav.current!.getBoundingClientRect().left,
          width: el.getBoundingClientRect().width,
        });
      } else {
        setIndicator(null);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    if (nav.current) observer.observe(nav.current);
    return () => observer.disconnect();
  }, [selected, pathname]);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!isHomepage) return;
    const target = document.querySelector(".gs-home-intro .gs-home-search");
    if (!target) {
      const checkScroll = () => setHeroSearchInView(window.scrollY < 240);
      checkScroll();
      window.addEventListener("scroll", checkScroll, { passive: true });
      return () => window.removeEventListener("scroll", checkScroll);
    }
    const observer = new IntersectionObserver(
      ([entry]) => setHeroSearchInView(entry.isIntersecting),
      { threshold: 0.05, rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isHomepage, pathname]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-gs-nav-dropdown]")) setDropdown(null);
      if (!event.target.closest(".gs-language")) setLanguageOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" || (event.key === "/" && !event.metaKey && !event.ctrlKey)) {
        setDropdown(null);
        setLanguageOpen(false);
      }
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest('dialog[data-variant="search"]')) {
        setDropdown(null);
        setLanguageOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("focusin", focus);
    };
  }, []);
  const href = (item: { href: string; external?: boolean }) =>
    item.external ? item.href : withSiteLocale(item.href, resolvedLocale);
  const links = (mobile = false) =>
    items.map((item) => {
      const hasChildren = Boolean(item.children?.length);
      const id = `${mobile ? "mobile" : "desktop"}-${item.href.replace(/[^a-z0-9]/gi, "-")}`;
      const open = dropdown === id;
      return (
        <div className="gs-nav-item" data-gs-nav-dropdown={hasChildren || undefined} key={item.href}>
          <Link
            href={href(item)}
            role={hasChildren ? "button" : undefined}
            aria-current={selected === item.name ? "page" : undefined}
            aria-expanded={hasChildren ? open : undefined}
            aria-controls={hasChildren ? id : undefined}
            onNavigate={() => {
              if (!hasChildren) setPendingActive({ pathname, active, name: item.name });
            }}
            onClick={(event) => {
              setLanguageOpen(false);
              if (hasChildren && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                setDropdown(open ? null : id);
              } else setDrawer(false);
            }}
            onKeyDown={(event) => {
              if (hasChildren && event.key === " ") {
                event.preventDefault();
                setLanguageOpen(false);
                setDropdown(open ? null : id);
              }
              if (event.key === "Escape" && open) {
                event.preventDefault();
                event.stopPropagation();
                setDropdown(null);
              }
            }}
          >
            {item.name}
            {hasChildren && <PublicIcon name="ChevronDown" className="gs-nav-chevron" size={16} />}
          </Link>
          {hasChildren && (
            <div
              id={id}
              className="gs-popover"
              data-open={open}
              inert={!open}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setDropdown(null);
                  event.currentTarget.parentElement?.querySelector<HTMLAnchorElement>("a")?.focus();
                }
              }}
            >
              {item.children!.map((child) => (
                <Link
                  key={child.href}
                  href={href(child)}
                  onClick={() => {
                    setDrawer(false);
                    setDropdown(null);
                  }}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    });
  const language = (mobile = false) => (
    <div
      className="gs-language"
      onKeyDown={(event) => {
        if (event.key === "Escape" && languageOpen) {
          event.preventDefault();
          event.stopPropagation();
          setLanguageOpen(false);
          event.currentTarget.querySelector("button")?.focus();
        }
      }}
    >
      <button
        type="button"
        className="gs-language-trigger"
        aria-expanded={languageOpen}
        aria-controls={`${languageId}-${mobile}`}
        onClick={() => {
          setDropdown(null);
          setLanguageOpen(!languageOpen);
        }}
      >
        <PublicIcon name="Globe" size={16} />
        {copy.languageName}
        <PublicIcon name="ChevronDown" className="gs-nav-chevron" size={16} />
      </button>
      <div id={`${languageId}-${mobile}`} className="gs-popover" data-open={languageOpen} inert={!languageOpen}>
        {languages.map((lang) => (
          <Link
            key={lang.code}
            href={getLanguageSwitchHref(pathname, lang.code)}
            hrefLang={lang.code}
            rel={lang.code === "zh" || lang.code === "en" ? undefined : "nofollow"}
            aria-current={lang.code === resolvedLocale ? "true" : undefined}
            onClick={() => {
              setLanguageOpen(false);
              setDrawer(false);
            }}
          >
            {lang.name}
            {lang.code === resolvedLocale && <PublicIcon name="Check" size={16} />}
          </Link>
        ))}
      </div>
    </div>
  );
  return (
    <header
      className="gs-public-unified gs-header"
      data-scrolled={scrolled}
      data-hide-header-search={isHomepage && heroSearchInView ? "true" : undefined}
    >
      <div className="gs-header-inner">
        <Link
          href={resolvedLocale === "zh" ? "/zh/" : withSiteLocale("/", resolvedLocale)}
          aria-label={copy.homeAria}
          className="gs-brand"
        >
          <GeoSubLogo size={28} />
        </Link>
        <nav
          ref={nav}
          aria-label={copy.mainNavAria}
          className="gs-desktop-nav"
          data-measured={Boolean(indicator)}
        >
          {links()}
          {indicator && (
            <span
              aria-hidden="true"
              className="gs-nav-indicator"
              style={
                {
                  "--gs-indicator-left": `${indicator.left}px`,
                  "--gs-indicator-width": `${indicator.width}px`,
                } as CSSProperties
              }
            />
          )}
        </nav>
        <PublicSearch key={pathname} locale={resolvedLocale} />
        <div className="gs-desktop-language">{language()}</div>
        <button
          type="button"
          className="gs-mobile-menu"
          data-gs-ui="icon-button"
          aria-label={copy.openMenuAria}
          aria-expanded={drawer}
          onClick={() => {
            setDropdown(null);
            setLanguageOpen(false);
            setDrawer(true);
          }}
        >
          <PublicIcon name="Menu" />
        </button>
      </div>
      {drawer && (
        <PublicDialog label={copy.menuLabel} closeLabel={copy.closeMenuAria} onClose={() => setDrawer(false)}>
          <nav aria-label={copy.mobileNavAria} className="gs-drawer-nav">
            {links(true)}
          </nav>
          <div className="gs-drawer-language">{language(true)}</div>
        </PublicDialog>
      )}
    </header>
  );
}
