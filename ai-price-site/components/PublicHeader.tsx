"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{left:number; width:number} | null>(null);
  useLayoutEffect(() => {
    const update = () => { const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]'); if (el) setIndicator({left:el.getBoundingClientRect().left-nav.current!.getBoundingClientRect().left,width:el.getBoundingClientRect().width}); else setIndicator(null); };
    update(); const observer = new ResizeObserver(update); if (nav.current) observer.observe(nav.current);
    return () => observer.disconnect();
  }, [active]);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8); update();
    window.addEventListener("scroll",update,{passive:true}); return () => window.removeEventListener("scroll",update);
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest("[data-gs-nav-dropdown]")) setDropdown(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const href = (item: {href:string; external?:boolean}) => item.external ? item.href : withSiteLocale(item.href,"zh");
  const links = (mobile = false) => items.map(item => {
    const hasChildren = Boolean(item.children?.length);
    const id = `${mobile ? "mobile" : "desktop"}-${item.href.replace(/[^a-z0-9]/gi,"-")}`;
    const open = dropdown === id;
    return <div className="gs-nav-item" data-gs-nav-dropdown={hasChildren || undefined} key={item.href}>
      <Link href={href(item)} role={hasChildren ? "button" : undefined}
        aria-current={active === item.name ? "page" : undefined}
        aria-expanded={hasChildren ? open : undefined} aria-controls={hasChildren ? id : undefined}
        onClick={event => {
          if (hasChildren && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            event.preventDefault(); setDropdown(open ? null : id);
          } else setDrawer(false);
        }}
        onKeyDown={event => {
          if (hasChildren && event.key === " ") { event.preventDefault(); setDropdown(open ? null : id); }
          if (event.key === "Escape") setDropdown(null);
        }}>{item.name}{hasChildren && <PublicIcon name="ChevronDown" size={16}/>}</Link>
      {hasChildren && <div id={id} className="gs-popover" hidden={!open} onKeyDown={event => {
        if (event.key === "Escape") { event.stopPropagation(); setDropdown(null); event.currentTarget.parentElement?.querySelector<HTMLAnchorElement>("a")?.focus(); }
      }}>{item.children!.map(child => <Link key={child.href} href={href(child)} onClick={() => { setDrawer(false); setDropdown(null); }}>{child.name}</Link>)}</div>}
    </div>;
  });
  const language = <details className="gs-language" onKeyDown={e => { if(e.key === "Escape") { e.currentTarget.open=false; e.currentTarget.querySelector("summary")?.focus(); } }}>
    <summary><PublicIcon name="Globe" size={16} />简体中文<PublicIcon name="ChevronDown" size={16}/></summary>
    <div className="gs-popover">{languages.map(lang => <Link key={lang.code} href={getLanguageSwitchHref(pathname,lang.code)} hrefLang={lang.code} rel={lang.code === "zh" || lang.code === "en" ? undefined : "nofollow"} aria-current={lang.code === "zh" ? "true" : undefined}>{lang.name}</Link>)}</div>
  </details>;
  return <header className="gs-public-unified gs-header" data-scrolled={scrolled}>
    <div className="gs-header-inner">
      <Link href="/zh/" aria-label="GeoSub 首页" className="gs-brand"><span data-gs-ui="tag" className="gs-brand-mark">G<i /></span><strong>GeoSub</strong></Link>
      <nav ref={nav} aria-label="主导航" className="gs-desktop-nav" data-measured={Boolean(indicator)}>
        {links()}{indicator && <span aria-hidden="true" className="gs-nav-indicator" style={{"--gs-indicator-left":`${indicator.left}px`,"--gs-indicator-width":`${indicator.width}px`} as CSSProperties} />}
      </nav>
      <PublicSearch key={pathname} />
      <div className="gs-desktop-language">{language}</div>
      <button type="button" className="gs-mobile-menu" data-gs-ui="icon-button" aria-label="打开菜单" aria-expanded={drawer} onClick={() => {setDropdown(null); setDrawer(true);}}><PublicIcon name="Menu" /></button>
    </div>
    {drawer && <PublicDialog label="菜单" onClose={() => setDrawer(false)}><nav aria-label="手机导航" className="gs-drawer-nav">{links(true)}</nav><div className="gs-drawer-language">{language}</div></PublicDialog>}
  </header>;
}
