import Link from "next/link";
import type { SiteNavigationItem } from "../lib/site-navigation";

const fallbackFooterItems: SiteNavigationItem[] = [
  {
    name: "产品",
    href: "/",
    children: [
      {
        name: "AI 定价",
        href: "/ai-pricing/",
      },
      {
        name: "软件订阅",
        href: "/software-subscriptions/",
      },
      {
        name: "游戏 / Steam",
        href: "/gaming-steam/",
      },
      {
        name: "礼品卡",
        href: "/gift-cards/",
      },
      {
        name: "AI 工具",
        href: "/ai-rankings/",
      },
    ],
  },
  {
    name: "指南",
    href: "/guides/",
    children: [
      {
        name: "价格指南",
        href: "/guides/price-guide/",
      },
      {
        name: "礼品卡教程",
        href: "/guides/gift-card-guide/",
      },
      {
        name: "支付与账号",
        href: "/guides/payment-account/",
      },
      {
        name: "工具测评",
        href: "/guides/tool-review/",
      },
    ],
  },
];

const footerCopy = {
  zh: {
    description:
      "GeoSub 是全球数字订阅与虚拟服务价格数据平台，帮助用户比较 AI 订阅、软件订阅、游戏服务、礼品卡和数字工具在不同国家与地区的价格差异。",
    rights: "保留所有权利。",
    note: "价格与可用性可能随地区、汇率和平台政策变化，请以官方页面为准。",
    tagline: "全球数字订阅价格数据",
  },
  en: {
    description:
      "GeoSub is a global digital subscription pricing platform for comparing AI subscriptions, software subscriptions, gaming services, gift cards, and digital tools across countries and regions.",
    rights: "All rights reserved.",
    note: "Prices and availability may change by region, exchange rate, tax, and platform policy. Always verify final prices on the official page.",
    tagline: "Global Digital Subscription Pricing",
  },
};

function withLocale(href: string, locale: string) {
  if (href.startsWith("https://") || href.startsWith("http://")) {
    return href;
  }

  const cleanHref = href.startsWith("/") ? href : `/${href}`;

  if (cleanHref === "/") {
    return `/${locale}/`;
  }

  return `/${locale}${cleanHref}`;
}

export default function Footer({
  navItems = [],
  locale = "zh",
}: {
  navItems?: SiteNavigationItem[];
  locale?: string;
}) {
  const footerItems = navItems.length > 0 ? navItems : fallbackFooterItems;
  const currentYear = new Date().getFullYear();
  const copy = locale === "en" ? footerCopy.en : footerCopy.zh;

  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white/80 dark:border-zinc-900 dark:bg-zinc-950/90">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <Link
              href={`/${locale}/`}
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
                        : withLocale(group.href, locale)
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
                              : withLocale(item.href, locale)
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