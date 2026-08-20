"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import BrandIcon from "./BrandIcon";
import HomeHeroMap, { type HomeMapRegion } from "./HomeHeroMap";

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
};

const ROTATION_INTERVAL = 4400;

function getSpread(product: HomepageProduct) {
  const values = product.regions.map((item) => item.priceUsd).filter((value) => value > 0);
  if (values.length < 2) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min > 0 ? Math.round(((max - min) / min) * 100) : 0;
}

function getExtremes(product: HomepageProduct) {
  const sorted = [...product.regions].filter((item) => item.priceUsd > 0).sort((a, b) => a.priceUsd - b.priceUsd);
  return { lowest: sorted[0], highest: sorted.at(-1) };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function spreadTone(spread: number) {
  if (spread >= 100) return "text-rose-600";
  if (spread >= 50) return "text-orange-600";
  return "text-emerald-700";
}

function ProductLogoStack({ products }: { products: HomepageProduct[] }) {
  return (
    <div className="flex items-center pl-1" aria-hidden="true">
      {products.slice(0, 3).map((product, index) => (
        <BrandIcon
          key={product.slug}
          product={product}
          size="sm"
          className={index === 0 ? "" : "-ml-2"}
        />
      ))}
    </div>
  );
}

function CategoryPanel({ card }: { card: CategoryCard }) {
  return (
    <Link
      href={card.href}
      className="group flex min-h-[142px] flex-col justify-between rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400"
    >
      <div className="flex items-start justify-between gap-4">
        <ProductLogoStack products={card.products} />
        <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-900" />
      </div>
      <div>
        <h3 className="text-lg font-black text-zinc-950">{card.title}</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{card.description}</p>
        {card.spread !== null ? (
          <p className="mt-2 text-xs font-bold text-zinc-500">
            已核验地区价差最高 <span className={spreadTone(card.spread)}>{card.spread}%</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export default function HomepageExperience({
  products,
  evidence,
}: {
  products: HomepageProduct[];
  evidence: HomepageEvidence;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion || products.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % products.length);
    }, ROTATION_INTERVAL);
    return () => window.clearInterval(timer);
  }, [paused, products.length, reduceMotion]);

  const safeActiveIndex = products.length ? activeIndex % products.length : 0;
  const active = products[safeActiveIndex] || products[0];
  const extremes = active ? getExtremes(active) : { lowest: undefined, highest: undefined };
  const activeSpread = active ? getSpread(active) : 0;

  const categoryCards = useMemo<CategoryCard[]>(() => {
    const ai = products.filter((product) => product.category === "ai");
    const streaming = products.filter((product) => product.category === "streaming");
    const maxSpread = (items: HomepageProduct[]) => items.length ? Math.max(...items.map(getSpread)) : null;
    return [
      {
        title: "AI 订阅",
        description: "查看常用 AI 订阅的月费、地区价差与购买力负担。",
        href: "/zh/ai-pricing/",
        products: ai,
        spread: maxSpread(ai),
      },
      {
        title: "流媒体",
        description: "比较视频与音乐订阅在不同商店地区的真实月费。",
        href: "/zh/streaming-pricing/",
        products: streaming,
        spread: maxSpread(streaming),
      },
      {
        title: "订阅汇率工具",
        description: "用持续同步的汇率估算订阅支出，不依赖固定汇率。",
        href: "/zh/tools/currency-converter/",
        products: [],
        spread: null,
      },
      {
        title: "订阅指南",
        description: "理解税费、账号地区、付款条件和跨区限制。",
        href: "/zh/guides/",
        products: [],
        spread: null,
      },
    ];
  }, [products]);

  return (
    <main className="min-h-screen bg-[#faf8f3] text-zinc-950">
      <section className="border-b border-zinc-200 bg-[#faf8f3]">
        <div className="mx-auto max-w-[1380px] px-4 pb-7 pt-7 sm:px-6 md:pt-8 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
              GeoSub · 数字订阅成本情报
            </p>
            <h1 className="mt-2 text-[36px] font-bold leading-[1.08] text-[#182230] sm:text-[44px] lg:text-[50px]">
              别只看标价，
              <span className="block text-[#bd4f32]">看清订阅在你所在地的真实成本。</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-600 md:text-base">
              GeoSub 整理经过核验的 App Store 地区价格，并结合汇率、税费、更新时间与本地购买力，
              帮你判断价格差在哪里、结论是否仍然可信。
            </p>
          </div>

          {active ? (
            <div
              className="mx-auto mt-2 max-w-[1280px]"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocusCapture={() => setPaused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
              }}
            >
              <div key={active.slug} className="animate-[home-map-enter_380ms_ease-out]">
                <HomeHeroMap regions={active.regions} />
              </div>

              <nav
                className="-mt-2 flex max-w-full items-center justify-start gap-2 overflow-x-auto px-1 pb-2 sm:justify-center"
                aria-label="热门订阅产品"
              >
                {products.map((product, index) => {
                  const selected = index === safeActiveIndex;
                  const spread = getSpread(product);
                  return (
                    <Link
                      key={product.slug}
                      href={product.href}
                      aria-label={`查看 ${product.name} 完整地区价格，地区价差 ${spread}%`}
                      data-selected={selected ? "true" : "false"}
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      className={`gs-home-product-link group inline-flex h-10 shrink-0 items-center gap-2 rounded-full border bg-white px-3 text-sm font-bold shadow-sm transition-[border-color,box-shadow,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${
                        selected
                          ? "border-zinc-500 text-zinc-950 shadow-md"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900"
                      }`}
                    >
                      <BrandIcon product={product} size="sm" className="h-7 w-7 border-0 shadow-none" />
                      <span>{product.name}</span>
                      <span
                        className={`gs-home-product-spread overflow-hidden whitespace-nowrap ${spreadTone(spread)}`}
                        aria-hidden="true"
                      >
                        价差 {spread}%
                      </span>
                      <ArrowRight className="gs-home-product-arrow h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-2 flex items-center justify-center text-sm">
                <Link href="/zh/ai-pricing/" className="inline-flex items-center gap-1 font-semibold text-zinc-500 hover:text-zinc-950 hover:underline">
                  <Search className="h-4 w-4" /> 浏览全部产品
                </Link>
              </div>

              <div className="mx-auto mt-5 flex max-w-[1260px] flex-wrap items-center justify-center gap-x-3 gap-y-1 border-y border-zinc-200 py-3 text-xs font-semibold text-zinc-500 sm:text-sm">
                <CheckCircle2 className="h-4 w-4 text-lime-600" />
                <span><strong className="text-zinc-950">{evidence.products}</strong> 项产品</span>
                <span aria-hidden="true">·</span>
                <span><strong className="text-zinc-950">{evidence.regions}</strong> 个地区</span>
                <span aria-hidden="true">·</span>
                <span><strong className="text-zinc-950">{evidence.prices}</strong> 条核验价格</span>
                <span aria-hidden="true">·</span>
                <span>价格来源 App Store</span>
                <span aria-hidden="true">·</span>
                <span>更新 {formatDate(evidence.updatedAt)}</span>
              </div>

              <div className="mt-3 flex justify-center gap-8 text-xs text-zinc-500 sm:hidden">
                <span>最低 ${extremes.lowest?.priceUsd.toFixed(2)}</span>
                <span>最高 ${extremes.highest?.priceUsd.toFixed(2)}</span>
                <span>价差 {activeSpread}%</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto mt-12 max-w-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              价格数据库暂时不可用，请稍后重试。
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f6f2ea] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.14em] text-zinc-500">按需求浏览</p>
            <h2 className="mt-2 text-3xl font-bold text-[#182230] md:text-4xl">
              先找到你需要的服务，再比较各地成本
            </h2>
          </div>
          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoryCards.map((card) => (
              <CategoryPanel key={card.href} card={card} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-[#faf8f3] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <h2 className="text-center text-3xl font-bold text-[#182230] md:text-4xl">
            每个价格结论，都应该有证据可追溯
          </h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {[
              { icon: Database, title: "数据来源", text: "价格来自哪里、何时采集、是否复核，一页看清。", href: "/zh/data-sources/" },
              { icon: Gauge, title: "本地购买力", text: "把月费放进当地收入水平，判断便宜是否真的便宜。", href: active?.href || "/zh/ai-pricing/" },
              { icon: WalletCards, title: "汇率换算", text: "用最新同步汇率换算订阅金额，区分价格变化与汇率波动。", href: "/zh/tools/currency-converter/" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="group rounded-lg border border-zinc-200 bg-white p-7 transition-colors hover:border-zinc-400 hover:bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-zinc-500" />
                    <h3 className="text-xl font-black text-zinc-950">{item.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-zinc-500">{item.text}</p>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-black text-zinc-950 group-hover:underline">
                    查看详情 <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4" />
            GeoSub 提供独立的价格与成本比较，最终结算金额以平台页面为准。
          </div>
        </div>
      </section>
    </main>
  );
}
