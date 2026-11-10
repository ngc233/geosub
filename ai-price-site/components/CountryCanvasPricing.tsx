"use client";
import Link from "next/link";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import type { countryCanvasRows } from "../lib/country-canvas";
import { formatPublicPrice } from "../lib/public-price-format";
import { savingsLabel, savingsPercent } from "../lib/homepage-display";
import BrandIcon from "./BrandIcon";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import CountryDataDisclosure from "./CountryDataDisclosure";
import { PublicComparisonBar, PublicSegments } from "./PublicControls";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";

export default function CountryCanvasPricing({ name, rows, rates, method, support }: {
  name: string; rows: ReturnType<typeof countryCanvasRows>; rates: Record<string, number>; method: ReactNode; support: ReactNode;
}) {
  usePageDisplayRates(rates);
  const [preferred] = usePublicCurrency(), currency = rates[preferred] > 0 ? preferred : "USD", rate = rates[currency] ?? 1;
  const [filter, setFilter] = useState("all");
  const inner = useRef<HTMLDivElement>(null), outer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!inner.current || !outer.current) return;
    const observer = new ResizeObserver(() => outer.current?.style.setProperty("--gs-country-list-height", `${inner.current!.getBoundingClientRect().height}px`));
    observer.observe(inner.current);return () => observer.disconnect();
  }, []);
  const price = (usd: number) => <PublicPriceNumber value={usd * rate} currency={currency} cycle="monthly" changeKey={currency}/>;
  return <><section className="gs-country-pricing" aria-labelledby="country-prices-title">
    <div className="gs-country-table-tools"><div><h2 id="country-prices-title">{name}的订阅价格</h2><p>按比美国低多少排序 · 每月 · App Store</p></div>
      <div><PublicCurrencySelect displayCurrency={currency}/><PublicSegments label="订阅分类" value={filter} onChange={setFilter} options={[{ value: "all", label: "全部" }, { value: "ai", label: "AI 订阅" }, { value: "streaming", label: "流媒体" }]}/></div>
    </div>
    {currency !== preferred && <p role="status">{preferred} 汇率不可用，当前显示 USD；可选择其他币种。</p>}
    <div className="gs-country-table"><div className="gs-country-columns" aria-hidden="true"><span>订阅</span><span>本地标价</span><span>折合</span><span>美国</span><span>和美国比</span></div>
      <div ref={outer} className="gs-country-list-viewport"><div ref={inner}>
        {rows.map((row, index) => {
          const path = `/zh/${row.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${row.productSlug}/${row.planSlug}`;
          const tone = row.saving === null || row.saving === 0 ? "baseline" : row.saving > 0 ? "low" : "high";
          return <article id={rows.find(item => item.category === row.category) === row ? `${row.category}-plans` : undefined} key={`${row.productSlug}:${row.planSlug}`} className="gs-country-item" hidden={filter !== "all" && filter !== row.category} data-category={row.category}>
            <Link href={path} prefetch={false} className="gs-country-row" data-gs-enter={filter === "ai" ? "b" : "a"} style={{ "--gs-stagger": `calc(${index} * var(--gs-motion-stagger))` } as CSSProperties}>
              <span className="gs-country-product"><BrandIcon product={{ slug: row.productSlug, name: row.productName }} size="sm" decorative defer={index > 1} fetchPriority="low"/><span><strong>{row.productName} {row.planName.replace(row.productName, "").trim()}</strong><small>{row.category === "ai" ? "AI 订阅" : "流媒体"}</small></span></span>
              <span className="gs-country-local">{formatPublicPrice(row.amount, row.currency)}</span>
              <span className="gs-country-price" data-tone={tone}>{row.usd !== null ? price(row.usd) : <small>汇率待更新</small>}</span>
              <span className="gs-country-us">{row.usPrice !== null ? price(row.usPrice) : <small>美国基准缺失</small>}</span>
              <div className="gs-country-saving">{row.saving !== null ? <><PublicComparisonBar label={savingsLabel(row.saving)} value={Math.abs(row.saving)} maximum={1} tone={tone} hideValue/><span data-tone={tone} aria-label={savingsLabel(row.saving)}>{row.saving === 0 ? "相同" : `${row.saving > 0 ? "−" : "+"}${savingsPercent(row.saving)}%`}</span></> : <small>暂无有效美国同套餐比较</small>}</div>
            </Link>

          </article>;
        })}
        {!rows.some(row => filter === "all" || row.category === filter) && <p className="gs-country-empty" role="status">当前分类没有符合条件的套餐</p>}
      </div></div>
    </div>
    </section>
    {support}
    <CountryDataDisclosure>
      {method}
      <h3 className="gs-country-source-title">价格来源与记录</h3>
      {rows.map(row => <div className="gs-country-source-row" key={`${row.productSlug}:${row.planSlug}`}>
        <strong>{row.productName} {row.planName.replace(row.productName, "").trim()}</strong><span>价格采集 {row.checkedAtText}{row.fxText !== null && <> · 汇率基准 {row.fxText}</>}</span>
        <Link href={`/zh/${row.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${row.productSlug}/${row.planSlug}`}>比较所有地区<PublicIcon name="ArrowRight" size={16}/></Link>
        {row.observationId ? <Link href={`/zh/price-records/${row.observationId}`}>原始快照</Link> : <a href={row.sourceUrl} rel="noreferrer" target="_blank">官方来源<PublicIcon name="ExternalLink" size={16}/></a>}
        <Link href={`/zh/price-history/${row.productSlug}`}>价格历史</Link>
      </div>)}
    <nav className="gs-country-category-links" aria-label="套餐分类">{(["ai", "streaming"] as const).filter(category => rows.some(row => row.category === category)).map(category => <a key={category} href={`#${category}-plans`} onClick={() => setFilter(category)}>{category === "ai" ? "AI 订阅" : "流媒体订阅"} {rows.filter(row => row.category === category).length}</a>)}</nav>
    </CountryDataDisclosure>
  </>;
}
