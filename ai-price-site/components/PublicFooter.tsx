"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { openAnalyticsConsentPreferences } from "../lib/analytics-consent";
import { resolveCanvasLocale, type CanvasLocale } from "../lib/canvas-ui-copy";
import type { SiteNavigationItem } from "../lib/site-navigation";
import { withSiteLocale } from "../lib/site-locale";
import GeoSubLogo from "./GeoSubLogo";
import PublicIcon from "./PublicIcon";

const subscribe = (notify: () => void) => {
  const media = matchMedia("(min-width:768px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const expandAriaByLocale: Record<CanvasLocale, (name: string) => string> = {
  zh: (name) => `展开${name}`,
  "zh-tw": (name) => `展開${name}`,
  en: (name) => `Expand ${name}`,
  ja: (name) => `${name}を展開`,
  ko: (name) => `${name} 펼치기`,
  es: (name) => `Expandir ${name}`,
};

export default function PublicFooter({
  items,
  copy,
  settings,
  locale = "zh",
}: {
  items: SiteNavigationItem[];
  copy: {
    description: string;
    independence: string;
    rights: string;
    note: string;
    tagline: string;
    converterLabel: string;
  };
  settings: string;
  locale?: CanvasLocale;
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const desktop = useSyncExternalStore(
    subscribe,
    () => matchMedia("(min-width:768px)").matches,
    () => false,
  );
  const [expanded, setExpanded] = useState<string[]>([]);
  const href = (item: { href: string; external?: boolean }) =>
    item.external ? item.href : withSiteLocale(item.href, resolvedLocale);
  const about = (
    <div className="gs-footer-about">
      <Link
        href={resolvedLocale === "zh" ? "/zh" : withSiteLocale("/", resolvedLocale)}
        aria-label="GeoSub"
      >
        <GeoSubLogo size={24} />
      </Link>
      <p>{copy.description}</p>
      <p>{copy.independence}</p>
      <Link href={withSiteLocale("/tools/currency-converter", resolvedLocale)}>
        {copy.converterLabel}
      </Link>
    </div>
  );
  return (
    <footer className="gs-public-unified gs-footer">
      <div className="gs-frame-container">
        <div className="gs-footer-groups">
          {items.map((group, index) => {
            const open = desktop || expanded.includes(group.href);
            return (
              <section key={group.href} data-gs-disclosure data-open={open}>
                <div className="gs-disclosure-header">
                  <Link href={href(group)}>{group.name}</Link>
                  <button
                    type="button"
                    data-gs-ui="icon-button"
                    aria-label={expandAriaByLocale[resolvedLocale](group.name)}
                    aria-expanded={open}
                    aria-controls={`gs-footer-${index}`}
                    onClick={() =>
                      setExpanded((old) =>
                        old.includes(group.href)
                          ? old.filter((x) => x !== group.href)
                          : [...old, group.href],
                      )
                    }
                  >
                    <PublicIcon name="ChevronDown" className="gs-disclosure-chevron" size={16} />
                  </button>
                </div>
                <div className="gs-disclosure-grid">
                  <div id={`gs-footer-${index}`} inert={!open}>
                    {group.children?.map((item) => (
                      <Link key={`${item.name}-${item.href}`} href={href(item)}>
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        {about}
        <div className="gs-footer-bottom">
          <span>
            © {new Date().getFullYear()} GeoSub. {copy.rights}
          </span>
          <button type="button" onClick={openAnalyticsConsentPreferences}>
            {settings}
          </button>
        </div>
        <p className="gs-footer-note">{copy.note}</p>
        <p className="gs-footer-note">{copy.tagline}</p>
      </div>
    </footer>
  );
}
