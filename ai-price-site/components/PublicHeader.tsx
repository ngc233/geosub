"use client";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { getLanguageSwitchHref } from "../lib/language-switch-route";
import { withSiteLocale, type SiteLocale } from "../lib/site-locale";
import type { NavItem } from "./Header";
import PublicIcon from "./PublicIcon";
import { PublicDialog } from "./PublicControls";
import PublicSearch from "./PublicSearch";

export default function PublicHeader({ items, active, pathname, languages }: {
  items: NavItem[]; active: string; pathname: string; languages: {code: SiteLocale; name: string}[];
}) {
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageId = useId();
  const [pendingActive, setPendingActive] = useState<{pathname:string; active:string; name:string} | null>(null);
  // Discard a completed navigation, including before a later browser Back.
  if (pendingActive && (pendingActive.pathname !== pathname || pendingActive.active !== active)) setPendingActive(null);
  const selected = pendingActive?.pathname === pathname && pendingActive.active === active ? pendingActive.name : active;
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{left:number; width:number} | null>(null);
  useLayoutEffect(() => {
    const update = () => { const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]'); if (el) setIndicator({left:el.getBoundingClientRect().left-nav.current!.getBoundingClientRect().left,width:el.getBoundingClientRect().width}); else setIndicator(null); };
    update(); const observer = new ResizeObserver(update); if (nav.current) observer.observe(nav.current);
    return () => observer.disconnect();
  }, [selected, pathname]);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8); update();
    window.addEventListener("scroll",update,{passive:true}); return () => window.removeEventListener("scroll",update);
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-gs-nav-dropdown]")) setDropdown(null);
      if (!event.target.closest(".gs-language")) setLanguageOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" || (event.key === "/" && !event.metaKey && !event.ctrlKey)) { setDropdown(null); setLanguageOpen(false); }
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest('dialog[data-variant="search"]')) { setDropdown(null); setLanguageOpen(false); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    document.addEventListener("focusin", focus);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keyboard); document.removeEventListener("focusin", focus); };
  }, []);
  const href = (item: {href:string; external?:boolean}) => item.external ? item.href : withSiteLocale(item.href,"zh");
  const links = (mobile = false) => items.map(item => {
    const hasChildren = Boolean(item.children?.length);
    const id = `${mobile ? "mobile" : "desktop"}-${item.href.replace(/[^a-z0-9]/gi,"-")}`;
    const open = dropdown === id;
    return <div className="gs-nav-item" data-gs-nav-dropdown={hasChildren || undefined} key={item.href}>
      <Link href={href(item)} role={hasChildren ? "button" : undefined}
        aria-current={selected === item.name ? "page" : undefined}
        aria-expanded={hasChildren ? open : undefined} aria-controls={hasChildren ? id : undefined}
        onNavigate={() => { if (!hasChildren) setPendingActive({pathname,active,name:item.name}); }}
        onClick={event => {
          setLanguageOpen(false);
          if (hasChildren && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            event.preventDefault(); setDropdown(open ? null : id);
          } else setDrawer(false);
        }}
        onKeyDown={event => {
          if (hasChildren && event.key === " ") { event.preventDefault(); setLanguageOpen(false); setDropdown(open ? null : id); }
          if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setDropdown(null); }
        }}>{item.name}{hasChildren && <PublicIcon name="ChevronDown" className="gs-nav-chevron" size={16}/>}</Link>
      {hasChildren && <div id={id} className="gs-popover" data-open={open} inert={!open} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setDropdown(null); event.currentTarget.parentElement?.querySelector<HTMLAnchorElement>("a")?.focus(); }
      }}>{item.children!.map(child => <Link key={child.href} href={href(child)} onClick={() => { setDrawer(false); setDropdown(null); }}>{child.name}</Link>)}</div>}
    </div>;
  });
  const language = (mobile = false) => <div className="gs-language" onKeyDown={event => {
    if(event.key === "Escape" && languageOpen) { event.preventDefault(); event.stopPropagation(); setLanguageOpen(false); event.currentTarget.querySelector("button")?.focus(); }
  }}>
    <button type="button" className="gs-language-trigger" aria-expanded={languageOpen} aria-controls={`${languageId}-${mobile}`} onClick={() => {setDropdown(null); setLanguageOpen(!languageOpen);}}><PublicIcon name="Globe" size={16} />简体中文<PublicIcon name="ChevronDown" className="gs-nav-chevron" size={16}/></button>
    <div id={`${languageId}-${mobile}`} className="gs-popover" data-open={languageOpen} inert={!languageOpen}>{languages.map(lang => <Link key={lang.code} href={getLanguageSwitchHref(pathname,lang.code)} hrefLang={lang.code} rel={lang.code === "zh" || lang.code === "en" ? undefined : "nofollow"} aria-current={lang.code === "zh" ? "true" : undefined} onClick={() => {setLanguageOpen(false); setDrawer(false);}}>{lang.name}{lang.code === "zh" && <PublicIcon name="Check" size={16}/>}</Link>)}</div>
  </div>;
  return <header className="gs-public-unified gs-header" data-scrolled={scrolled}>
    <div className="gs-header-inner">
      <Link href="/zh/" aria-label="GeoSub 首页" className="gs-brand"><svg className="gs-brand-globe" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12"/><path d="M2 14h24M14 2c4 4 4 20 0 24M14 2c-4 4-4 20 0 24"/><circle className="gs-brand-globe-accent" cx="21" cy="8" r="4"/></svg><strong>GeoSub</strong></Link>
      <nav ref={nav} aria-label="主导航" className="gs-desktop-nav" data-measured={Boolean(indicator)}>
        {links()}{indicator && <span aria-hidden="true" className="gs-nav-indicator" style={{"--gs-indicator-left":`${indicator.left}px`,"--gs-indicator-width":`${indicator.width}px`} as CSSProperties} />}
      </nav>
      <PublicSearch key={pathname} />
      <div className="gs-desktop-language">{language()}</div>
      <button type="button" className="gs-mobile-menu" data-gs-ui="icon-button" aria-label="打开菜单" aria-expanded={drawer} onClick={() => {setDropdown(null); setLanguageOpen(false); setDrawer(true);}}><PublicIcon name="Menu" /></button>
    </div>
    {drawer && <PublicDialog label="菜单" onClose={() => setDrawer(false)}><nav aria-label="手机导航" className="gs-drawer-nav">{links(true)}</nav><div className="gs-drawer-language">{language(true)}</div></PublicDialog>}
  </header>;
}
