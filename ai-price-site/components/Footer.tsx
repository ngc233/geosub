"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDefaultNavigationItems } from "../lib/navigation-defaults";
import { shouldHideFromPublicNavigation } from "../lib/public-launch-routes";
import type { SiteNavigationItem } from "../lib/site-navigation";
import {
  getSiteLocaleFromPath,
  stripSiteLocale,
  withSiteLocale,
  type SiteLocale,
} from "../lib/site-locale";

const footerCopy: Record<
  SiteLocale,
  { description: string; rights: string; note: string; tagline: string }
> = {
  zh: {
    description:
      "GeoSub 是全球数字订阅价格数据平台，当前优先整理 AI 订阅和流媒体订阅在不同国家与地区的价格差异。",
    rights: "保留所有权利。",
    note: "价格与可用性可能随地区、汇率、税费和平台政策变化，请以官方结算页为准。",
    tagline: "全球数字订阅价格数据",
  },
  en: {
    description:
      "GeoSub is a global digital subscription pricing platform. The current beta focuses on AI and streaming subscription prices across countries and regions.",
    rights: "All rights reserved.",
    note: "Prices and availability may change by region, exchange rate, tax, and platform policy. Always verify final prices on the official checkout page.",
    tagline: "Global Digital Subscription Pricing",
  },
};

function shouldHideHref(href: string) {
  return shouldHideFromPublicNavigation(stripSiteLocale(href));
}

function toSiteNavigationItems(locale: SiteLocale): SiteNavigationItem[] {
  return getDefaultNavigationItems({
    locale,
    position: "footer",
  }).map((group) => ({
    name: group.label,
    href: group.href,
    children: group.children?.map((child) => ({
      name: child.label,
      href: child.href,
    })),
  }));
}

function filterFooterItems(items: SiteNavigationItem[]) {
  return items
    .filter((group) => !shouldHideHref(group.href))
    .map((group) => ({
      ...group,
      children: group.children?.filter((child) => !shouldHideHref(child.href)),
    }))
    .filter((group) => group.href || (group.children && group.children.length > 0));
}

export default function Footer({
  navItemsByLocale = {},
}: {
  navItemsByLocale?: Partial<Record<SiteLocale, SiteNavigationItem[]>>;
}) {
  const pathname = usePathname();
  const currentLocale = getSiteLocaleFromPath(pathname);
  const localeNavItems = navItemsByLocale[currentLocale] || [];
  const footerItems = filterFooterItems(
    localeNavItems.length > 0
      ? localeNavItems
      : toSiteNavigationItems(currentLocale),
  );
  const currentYear = new Date().getFullYear();
  const copy = footerCopy[currentLocale];

  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white/80 dark:border-zinc-900 dark:bg-zinc-950/90">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <Link
              href={withSiteLocale("/", currentLocale)}
              className="inline-flex items-center gap-2 text-zinc-950 transition hover:text-lime-700 dark:text-white dark:hover:text-lime-300"
              aria-label="GeoSub"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white shadow-sm shadow-zinc-950/20 dark:bg-white dark:text-zinc-950">
                G
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-lime-500 dark:border-zinc-950" />
              </span>
              <span className="text-xl font-black tracking-tight">GeoSub</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              {copy.description}
            </p>

            <p className="mt-6 text-xs font-medium text-zinc-400 dark:text-zinc-500">
              © {currentYear} GeoSub. {copy.rights}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerItems.map((group) => {
              const children = group.children || [];

              return (
                <div key={`${group.name}-${group.href}`}>
                  <Link
                    href={
                      group.external
                        ? group.href
                        : withSiteLocale(group.href, currentLocale)
                    }
                    className="text-sm font-black text-zinc-950 transition hover:text-lime-700 dark:text-white dark:hover:text-lime-300"
                  >
                    {group.name}
                  </Link>

                  {children.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {children.map((item) => (
                        <Link
                          key={`${group.name}-${item.name}-${item.href}`}
                          href={
                            item.external
                              ? item.href
                              : withSiteLocale(item.href, currentLocale)
                          }
                          className="block text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-zinc-100 pt-6 text-xs text-zinc-400 dark:border-zinc-900 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{copy.note}</p>
          <p>{copy.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
