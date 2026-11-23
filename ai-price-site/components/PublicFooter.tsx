"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { openAnalyticsConsentPreferences } from "../lib/analytics-consent";
import type { SiteNavigationItem } from "../lib/site-navigation";
import { withSiteLocale } from "../lib/site-locale";
import PublicIcon from "./PublicIcon";
const subscribe = (notify: () => void) => { const media=matchMedia("(min-width:768px)"); media.addEventListener("change",notify); return () => media.removeEventListener("change",notify); };
export default function PublicFooter({ items, copy, settings, locale = "zh" }: {
  items: SiteNavigationItem[]; copy: {description:string; independence:string; rights:string; note:string; tagline:string; converterLabel:string}; settings:string; locale?: "en" | "zh";
}) {
  const desktop = useSyncExternalStore(subscribe,()=>matchMedia("(min-width:768px)").matches,()=>false);
  const [expanded,setExpanded] = useState<string[]>([]);
  const english = locale === "en";
  const href = (item: {href:string;external?:boolean}) => item.external ? item.href : withSiteLocale(item.href,locale);
  const about = <div className="gs-footer-about"><Link href={english ? withSiteLocale("/",locale) : "/zh"} aria-label="GeoSub">GeoSub</Link><p>{copy.description}</p><p>{copy.independence}</p><Link href={withSiteLocale("/tools/currency-converter",locale)}>{copy.converterLabel}</Link></div>;
  return <footer className="gs-public-unified gs-footer"><div className="gs-frame-container">
    {english && about}
    <div className="gs-footer-groups">{items.map((group,index) => {
      const open = desktop || expanded.includes(group.href);
      return <section key={group.href} data-gs-disclosure data-open={open}>
        <div className="gs-disclosure-header"><Link href={href(group)}>{group.name}</Link><button type="button" data-gs-ui="icon-button" aria-label={english ? `Expand ${group.name}` : `展开${group.name}`} aria-expanded={open} aria-controls={`gs-footer-${index}`} onClick={() => setExpanded(old=>old.includes(group.href)?old.filter(x=>x!==group.href):[...old,group.href])}><PublicIcon name="ChevronDown" className="gs-disclosure-chevron" size={16}/></button></div>
        <div className="gs-disclosure-grid"><div id={`gs-footer-${index}`} inert={!open}>{group.children?.map(item => <Link key={`${item.name}-${item.href}`} href={href(item)}>{item.name}</Link>)}</div></div>
      </section>;
    })}</div>
    {!english && about}
    <div className="gs-footer-bottom"><span>© {new Date().getFullYear()} GeoSub. {copy.rights}</span><button type="button" onClick={openAnalyticsConsentPreferences}>{settings}</button></div>
    <p className="gs-footer-note">{copy.note}</p><p className="gs-footer-note">{copy.tagline}</p>
  </div></footer>;
}
