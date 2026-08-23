"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type LucideIcon,
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import BrandIcon from "./BrandIcon";
import HomeHeroMap, { type HomeMapRegion } from "./HomeHeroMap";
import { getHomepageCopy } from "../lib/homepage-copy";
import { siteLocaleDefinitions, type SiteLocale } from "../lib/site-locale";

export type HomepageProduct = {
  slug: string;
  name: string;
  category: "ai" | "streaming";
  planName: string;
  href: string;
  updatedAt: string;
  logoUrl?: string;
  regions: HomeMapRegion[];
};

export type HomepageEvidence = {
  products: number;
  regions: number;
  prices: number;
  updatedAt: string;
};

type CategoryCard = {
  title: string;
  description: string;
  href: string;
  products: HomepageProduct[];
  spread: number | null;
  icon?: LucideIcon;
};

function getSpread(product: HomepageProduct) {
  const values = product.regions.map((item) => item.priceUsd).filter((value) => value > 0);
  if (values.length < 2) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min > 0 ? Math.round(((max - min) / min) * 100) : 0;
}

function formatDate(value: string, locale: SiteLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat(siteLocaleDefinitions[locale].intlLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function spreadTone() {
  return "text-zinc-700";
}

function ProductLogoStack({ products }: { products: HomepageProduct[] }) {
  return (
    <div className="flex items-center ps-1" aria-hidden="true">
      {products.slice(0, 3).map((product, index) => (
        <BrandIcon
          key={product.slug}
          product={product}
          size="sm"
          className={index === 0 ? "" : "-ms-2"}
        />
      ))}
    </div>
  );
}

function CategoryPanel({ card, spreadPrefix }: { card: CategoryCard; spreadPrefix: string }) {
  return (
    <Link
      href={card.href}
      className="group flex min-h-[168px] flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-zinc-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        {card.products.length ? (
          <ProductLogoStack products={card.products} />
        ) : card.icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <card.icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700 rtl:rotate-180" />
      </div>
      <div>
        <h3 className="text-[17px] font-semibold text-zinc-950">{card.title}</h3>
        <p className="mt-1.5 text-[13px] leading-6 text-zinc-500">{card.description}</p>
        {card.spread !== null ? (
          <p className="mt-2 text-xs font-bold text-zinc-500">
            {spreadPrefix} <span className={spreadTone()}>{card.spread}%</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export default function HomepageExperience({
  products,
  evidence,
  locale = "zh",
}: {
  products: HomepageProduct[];
  evidence: HomepageEvidence;
  locale?: SiteLocale;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const copy = getHomepageCopy(locale);
  const localeRoot = `/${locale}`;

  const safeActiveIndex = products.length ? activeIndex % products.length : 0;
  const active = products[safeActiveIndex] || products[0];

  const categoryCards = useMemo<CategoryCard[]>(() => {
    const ai = products.filter((product) => product.category === "ai");
    const streaming = products.filter((product) => product.category === "streaming");
    const maxSpread = (items: HomepageProduct[]) => items.length ? Math.max(...items.map(getSpread)) : null;
    return [
      {
        title: copy.categories.ai[0],
        description: copy.categories.ai[1],
        href: `${localeRoot}/ai-pricing/`,
        products: ai,
        spread: maxSpread(ai),
      },
      {
        title: copy.categories.streaming[0],
        description: copy.categories.streaming[1],
        href: `${localeRoot}/streaming-pricing/`,
        products: streaming,
        spread: maxSpread(streaming),
      },
      {
        title: copy.categories.converter[0],
        description: copy.categories.converter[1],
        href: `${localeRoot}/tools/currency-converter/`,
        products: [],
        spread: null,
        icon: WalletCards,
      },
      {
        title: copy.categories.guides[0],
        description: copy.categories.guides[1],
        href: `${localeRoot}/guides/`,
        products: [],
        spread: null,
        icon: ShieldCheck,
      },
    ];
  }, [copy, localeRoot, products]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-zinc-950">
      <section className="border-b border-zinc-200/80 bg-[var(--background)]">
        <div className="mx-auto max-w-[1380px] px-4 pb-7 pt-8 sm:px-6 md:pt-10 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 text-[34px] font-semibold leading-[1.12] tracking-[-0.025em] text-[#182230] sm:text-[40px] lg:text-[46px]">
              {locale === "zh" ? (
                <>
                  <span className="block sm:inline">别只看标价，</span>
                  <span className="block text-zinc-950 sm:inline">看清数字订阅的</span>
                  <span className="block text-zinc-950 sm:inline">真实地区成本</span>
                </>
              ) : copy.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-600 md:text-[15px]">
              {copy.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`${localeRoot}/ai-pricing/`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2"
              >
                {copy.start} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link
                href={`${localeRoot}/data-sources/`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-200 hover:text-zinc-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2"
              >
                <Database className="h-4 w-4 text-lime-700" aria-hidden="true" /> {copy.verify}
              </Link>
            </div>
          </div>

          {active ? (
            <div className="mx-auto mt-6 max-w-[1280px]">
              <div
                className="gs-home-product-nav flex max-w-full items-center justify-start gap-1.5 overflow-x-auto px-1 pb-3 sm:justify-center"
                role="tablist"
                aria-label={copy.productTabs}
              >
                {products.map((product, index) => {
                  const selected = index === safeActiveIndex;
                  const spread = getSpread(product);
                  return (
                    <button
                      type="button"
                      key={product.slug}
                      role="tab"
                      id={`home-product-tab-${product.slug}`}
                      aria-selected={selected}
                      aria-controls="home-pricing-map-panel"
                      aria-label={`${copy.switchProduct} ${product.name}, ${copy.maxSpread} ${spread}%`}
                      data-selected={selected ? "true" : "false"}
                      onClick={(event) => {
                        const tab = event.currentTarget;
                        setActiveIndex(index);
                        window.requestAnimationFrame(() => {
                          tab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                        });
                      }}
                      onKeyDown={(event) => {
                        const lastIndex = products.length - 1;
                        const nextIndex = event.key === "ArrowRight"
                          ? (index + 1) % products.length
                          : event.key === "ArrowLeft"
                            ? (index - 1 + products.length) % products.length
                            : event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? lastIndex
                                : null;
                        if (nextIndex === null) return;
                        event.preventDefault();
                        setActiveIndex(nextIndex);
                        const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                        tabs?.[nextIndex]?.focus();
                      }}
                      className={`gs-home-product-link group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-white px-2.5 text-[13px] font-semibold transition-[border-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 ${
                        selected
                          ? "border-zinc-300 text-zinc-950 shadow-md"
                          : "border-zinc-200 text-zinc-500 shadow-sm hover:border-zinc-300 hover:text-zinc-950 hover:shadow-md"
                      }`}
                    >
                      <BrandIcon product={product} size="xs" className="border-0 shadow-none" />
                      <span>{product.name}</span>
                      <span
                        className={`gs-home-product-spread overflow-hidden whitespace-nowrap ${spreadTone()}`}
                        aria-hidden="true"
                      >
                        <span className="hidden sm:inline">{copy.maxSpread} {spread}%</span>
                        <span className="sm:hidden">{spread}%</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                id="home-pricing-map-panel"
                role="tabpanel"
                aria-labelledby={`home-product-tab-${active.slug}`}
                key={active.slug}
                className="animate-[home-map-enter_180ms_ease-out]"
              >
                <HomeHeroMap
                  locale={locale}
                  regions={active.regions}
                  productName={active.name}
                  planName={active.planName}
                  href={active.href}
                />
              </div>

              <div className="mx-auto mt-4 flex max-w-[1260px] flex-wrap items-center justify-center gap-x-2.5 gap-y-1 border-y border-zinc-200 py-2.5 text-[11px] font-semibold text-zinc-500 sm:text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-lime-600" />
                <span><strong className="text-zinc-950">{evidence.prices}</strong> {copy.pricesVerified}</span>
                <span aria-hidden="true">·</span>
                <span>{copy.source} App Store</span>
                <span aria-hidden="true">·</span>
                <span>{copy.updated} {formatDate(evidence.updatedAt, locale)}</span>
              </div>

            </div>
          ) : (
            <div className="mx-auto mt-12 max-w-2xl rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
              {copy.unavailable}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-zinc-200/80 bg-[var(--background)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.14em] text-lime-700">{copy.categoryEyebrow}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#182230] md:text-4xl">
              {copy.categoryTitle}
            </h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoryCards.map((card) => (
              <CategoryPanel key={card.href} card={card} spreadPrefix={copy.categories.spreadPrefix} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-[var(--background)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.02em] text-[#182230] md:text-4xl">
            {copy.proofTitle}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: Database, title: copy.proof.sources[0], text: copy.proof.sources[1], cta: copy.proof.sources[2], href: `${localeRoot}/data-sources/` },
              { icon: Gauge, title: copy.proof.affordability[0], text: copy.proof.affordability[1], cta: copy.proof.affordability[2], href: `${localeRoot}/ai-pricing/chatgpt/plus/` },
              { icon: WalletCards, title: copy.proof.exchange[0], text: copy.proof.exchange[1], cta: copy.proof.exchange[2], href: `${localeRoot}/tools/currency-converter/` },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="group flex min-h-[184px] flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-zinc-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-[17px] font-semibold text-zinc-950">{item.title}</h3>
                  </div>
                  <p className="mt-4 text-[13px] leading-6 text-zinc-500">{item.text}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-6 text-xs font-semibold text-zinc-800 group-hover:underline">
                    {item.cta} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-zinc-200 pt-5 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4" />
            {copy.disclaimer}
          </div>
        </div>
      </section>
    </main>
  );
}
