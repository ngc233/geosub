"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ProductPlan, RegionPrice } from "../lib/public-pricing-model";
import { getPlanStats } from "../lib/public-pricing-model";
import { planDistribution, planSaving, filterPlanRegions, groupPlanPricePoints, type planWorkHours } from "../lib/plan-canvas";
import { formatPublicPrice } from "../lib/public-price-format";
import { formatPublicDate } from "../lib/public-date";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";
import { PublicDisclosure, PublicExpandButton, PublicSegments, PublicTutorialCard } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import PublicIcon from "./PublicIcon";
import HomepageCountryFlag from "./HomepageCountryFlag";
import SharePriceModal, { type SharePriceProduct } from "./SharePriceModal";

function Country({ row }: { row: Pick<RegionPrice, "code" | "country"> }) {
  return <span className="gs-plan-country"><HomepageCountryFlag code={row.code} defer/>{row.country}</span>;
}
function Saving({ usd, usPrice }: { usd: number; usPrice?: number }) {
  const saving = planSaving(usd, usPrice);
  return saving === null ? <span>美国基准缺失</span> : <span data-tone={saving < 0 ? "high" : "low"}>{saving === 0 ? "与美国相同" : `比美国${saving < 0 ? "高" : "低"} ${Math.round(Math.abs(saving) * 100)}%`}</span>;
}
const date = (value?: string) => formatPublicDate(value)?.text ?? "未提供";

function PlanPriceDistribution({ rows, max, us, currency, rate, onSelect }: {
  rows: RegionPrice[]; max: number; us?: RegionPrice;
  currency: Parameters<typeof formatPublicPrice>[1]; rate: number; onSelect: (code: string) => void;
}) {
  const chart = useRef<HTMLDivElement>(null);
  const choices = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const choicesId = useId();
  const [slots, setSlots] = useState(1);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  useEffect(() => {
    const element = chart.current;
    if (!element) return;
    let widthSlots = 1;
    const measure = () => {
      const target = Number.parseFloat(getComputedStyle(element).getPropertyValue("--gs-min-touch-target"));
      const next = Math.max(1, Math.floor(element.clientWidth / target));
      if (next === widthSlots) return;
      widthSlots = next;
      if (choices.current?.contains(document.activeElement)) trigger.current?.focus();
      setActiveSlot(null);
      setSlots(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (activeSlot !== null) choices.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [activeSlot]);
  const groups = groupPlanPricePoints(rows, max, slots);
  const active = activeSlot === null ? undefined : groups.get(activeSlot);
  const amount = (row: RegionPrice) => formatPublicPrice(row.priceUsd * rate, currency);
  return <>
    <div ref={chart} className="gs-plan-distribution-chart" role="group" aria-label={`各地区价格从低到高分布${us ? "，竖线为美国价格" : "，没有美国基准"}`}>
      <div className="gs-plan-distribution-track" aria-hidden="true"/>
      {rows.map(row => <span key={row.code} className="gs-plan-dot" aria-hidden="true"
        data-tone={row.code === "US" ? "baseline" : us && row.priceUsd > us.priceUsd ? "high" : "low"}
        style={{ left: `${row.priceUsd / max * 100}%` }}/>)}
      {us && <span className="gs-plan-us-marker" aria-hidden="true" style={{ left: `${us.priceUsd / max * 100}%` }}><span>美国</span></span>}
      <div className="gs-plan-chart-options" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
        {[...groups].map(([slot, group]) => {
          const [first] = group;
          const grouped = group.length > 1;
          return <button key={slot} type="button" className="gs-plan-chart-option"
            style={{ gridColumn: slot + 1 }} aria-expanded={grouped ? activeSlot === slot : undefined}
            aria-controls={grouped ? choicesId : undefined}
            aria-label={grouped ? `查看 ${group.length} 个地区，${amount(first)} 至 ${amount(group[group.length - 1])}` : `查看${first.country}，${amount(first)}`}
            onClick={event => {
              if (grouped) {
                trigger.current = event.currentTarget;
                setActiveSlot(current => current === slot ? null : slot);
              } else {
                onSelect(first.code);
                setActiveSlot(null);
              }
            }}><span aria-hidden="true">{grouped ? group.length : <PublicIcon name="Globe" size={16}/>}</span></button>;
        })}
      </div>
    </div>
    <div ref={choices} id={choicesId} hidden={!active} className="gs-plan-chart-choices" role="group" aria-label="选择地区"
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        setActiveSlot(null);
        trigger.current?.focus();
      }}>
      {active?.map(row => <button key={row.code} type="button" data-gs-ui="button" onClick={() => {
        onSelect(row.code);
        setActiveSlot(null);
      }}><Country row={row}/><span>{amount(row)}</span></button>)}
    </div>
  </>;
}

export function PlanWorkRows({ rows, rates, usPrice, lowestCode }: {
  rows: ReturnType<typeof planWorkHours>["rows"]; rates: Record<string, number>; usPrice?: number; lowestCode?: string;
}) {
  const [preferred] = usePublicCurrency(), currency = rates[preferred] > 0 ? preferred : "USD", rate = rates[currency] ?? 1;
  const maxHours = Math.max(...rows.map(row => row.hours), 1);
  return <div className="gs-plan-work-rows">
    <div className="gs-plan-work-heading"><span>地区</span><span>月费折合</span><span>当地人要工作多久</span></div>
    {rows.map(row => <div key={row.code} className="gs-plan-work-row" data-country={row.code} data-lowest={row.code === lowestCode}>
      <span><Country row={row}/></span>
      <span className="gs-plan-work-price" data-tone={row.code === "US" ? "baseline" : usPrice !== undefined ? row.usd > usPrice ? "high" : "low" : "baseline"}>{formatPublicPrice(row.usd * rate, currency)}</span>
      <span className="gs-plan-work-bar" aria-hidden="true"><span style={{ width: `${row.hours / maxHours * 100}%` }}/></span><strong>{row.hours.toFixed(1)} 小时</strong><small>{row.metric === "GNI_ATLAS" ? "人均国民收入" : "名义人均 GDP"} · {row.year}</small>
    </div>)}<small>按工作时长从短到长排列；灰色条不表示购买推荐。</small>
  </div>;
}

export default function PlanCanvasPricing({ plan, product, rates, rateDates, tutorial, afterCards }: {
  plan: ProductPlan; product: SharePriceProduct; rates: Record<string, number>; rateDates: Record<string, string | null>;
  tutorial?: { href: string; title: string; summary: string }; afterCards?: ReactNode;
}) {
  usePageDisplayRates(rates);
  const [preferred] = usePublicCurrency(), currency = rates[preferred] > 0 ? preferred : "USD", rate = rates[currency] ?? 1;
  const priceFont = /[a-z]/i.test(formatPublicPrice(0, currency)) ? "latin" : "numerals";
  const [filter, setFilter] = useState("all"), [query, setQuery] = useState(""), [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"), [expanded, setExpanded] = useState(false);
  const distribution = planDistribution(plan), { lowest, highest, us, rows } = distribution;
  const filtered = filterPlanRegions(rows, filter, query, us?.priceUsd);
  const sorted = sortOrder === "asc" ? filtered : [...filtered].reverse();
  const shown = expanded ? sorted : sorted.slice(0, 9);
  const focusCountry = (code: string) => {
    setFilter("all");
    setQuery("");
    setExpanded(true);
    requestAnimationFrame(() => {
      const target = list.current?.querySelector<HTMLElement>(`[data-country="${code}"]`)?.closest<HTMLElement>("[data-gs-disclosure]");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "center" });
      target?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    });
  };
  const list = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const inner = list.current, outer = viewport.current;if (!inner || !outer) return;
    const observer = new ResizeObserver(() => outer.style.setProperty("--gs-plan-list-height", `${inner.getBoundingClientRect().height}px`));
    observer.observe(inner);return () => observer.disconnect();
  }, []);
  const price = (usd: number, cycle?: string, size: "row" | "hero" = "row") => <PublicPriceNumber value={usd * rate} currency={currency} cycle={cycle} size={size} changeKey={currency}/>;
  if (!lowest || !highest) return <section className="gs-plan-panel"><h2>暂无已发布价格</h2><p>当前没有可比较的地区价格。</p></section>;
  const max = highest.priceUsd || 1;
  return <>
    <div className="gs-plan-summary" data-price-font={priceFont}>
      <section className="gs-plan-panel gs-plan-lowest" aria-label="最低价">
        <div className="gs-plan-card-top"><strong>全球最低 · <Country row={lowest}/></strong><div className="gs-plan-tools"><PublicCurrencySelect displayCurrency={currency}/>
          {us && <SharePriceModal unifiedTrigger product={product} plan={plan} stats={getPlanStats(plan)} locale="zh"/>}</div></div>
        <div className="gs-plan-hero-price">{price(lowest.priceUsd, plan.billing, "hero")}</div>
        <div className="gs-plan-local"><span className="gs-plan-saving"><Saving usd={lowest.priceUsd} usPrice={us?.priceUsd}/></span><span>本地标价 {lowest.localPrice} · {lowest.tax || "以结算页为准"}</span></div>
        <div className="gs-plan-card-bottom"><PublicTutorialCard article={tutorial}/></div>
        {currency !== preferred && <p role="status">{preferred} 汇率不可用，当前显示 USD；可选择其他币种。</p>}
      </section>
      {distribution.visible && <section className="gs-plan-panel gs-plan-distribution" aria-label="各地区价格分布">
        <div className="gs-plan-card-top"><h2>各地区价格分布</h2><span>已收录 {rows.length} 个地区</span></div>
        <PlanPriceDistribution rows={rows} max={max} us={us} currency={currency} rate={rate} onSelect={focusCountry}/>
        <div className="gs-plan-extremes"><span>最低 · {lowest.country}</span><span>最贵 · {highest.country}</span></div>
        <div className="gs-plan-statistics">
          <div><span><strong>美国基准</strong><small>{us ? `${us.localPrice} · ${us.tax || "税费以结算页为准"}` : "缺少可比美国价格"}</small></span>{us ? price(us.priceUsd) : <span>暂无</span>}</div>
          <div><span><strong>最贵 · {highest.country}</strong><small>{highest.localPrice}{distribution.multiple !== null && ` · 是最低价的 ${distribution.multiple.toFixed(1)} 倍`}</small></span><span data-tone="high">{price(highest.priceUsd)}</span></div>
          <div><span><strong>中位数</strong><small>一半地区低于这个价</small></span>{price(distribution.median!)}</div>
        </div>
        {distribution.cheaper !== null && <p className="gs-plan-distribution-note"><strong>{distribution.cheaper}</strong> / {rows.length} 个地区比美国便宜</p>}
      </section>}
    </div>
    <div className="gs-plan-freshness"><span>{plan.freshness?.trustStatus === "verified" ? "已核验" : plan.freshness?.trustStatus === "reviewed" ? "已审核" : "核验状态以证据为准"}</span><span>价格 {date(plan.freshness?.priceCollectedAt)}</span><span>汇率 {currency === "USD" ? "美元原价" : date(rateDates[currency] ?? undefined)}</span>{afterCards}</div>
    <section className="gs-plan-regions" data-price-font={priceFont} aria-labelledby="plan-regions-title">
      <div className="gs-plan-region-heading"><h2 id="plan-regions-title">地区价格</h2><div className="gs-plan-filters">
        <PublicSegments label="地区价格筛选" value={filter} onChange={value => { setFilter(value);setExpanded(false); }} options={[{ value: "all", label: "全部" }, ...(us ? [{ value: "low", label: "比美国便宜" }, { value: "high", label: "比美国贵" }] : [])]}/>
        <button type="button" data-gs-ui="button" aria-label="切换价格排序" onClick={() => setSortOrder(old => old === "asc" ? "desc" : "asc")}>{sortOrder === "asc" ? "从低到高" : "从高到低"}<PublicIcon name={sortOrder === "asc" ? "ArrowDown" : "ArrowUp"} size={16}/></button>
        <label className="gs-plan-search" data-gs-input><PublicIcon name="Search" size={16}/><span className="gs-sr-only">找地区</span><input type="search" aria-label="找地区" placeholder="找地区，例如 日本" value={query} onChange={e => { setQuery(e.target.value);setExpanded(false); }}/></label>
      </div></div>
      <div className="gs-plan-region-panel">
        <div className="gs-plan-row-heading" aria-hidden="true"><span>地区</span><span>折合</span><span>本地标价</span><span>和美国比</span><span>税费</span><span/></div>
        <div ref={viewport} className="gs-plan-list-viewport"><div ref={list}>
          {shown.map(row => <PublicDisclosure key={row.code} title={<span className="gs-plan-row" data-country={row.code}>
            <strong><Country row={row}/><small className="gs-plan-mobile-local">{row.localPrice} · {row.tax || "以结算页为准"}</small></strong>
            <span className="gs-plan-row-price" data-tone={row.code === "US" ? "baseline" : us && row.priceUsd > us.priceUsd ? "high" : "low"}>{price(row.priceUsd, plan.billing)}<small className="gs-plan-mobile-diff">{row.code === "US" ? "美国基准" : <Saving usd={row.priceUsd} usPrice={us?.priceUsd}/>}</small></span>
            <span className="gs-plan-desktop-local">{row.localPrice}</span>
            <span className="gs-plan-comparison"><span className="gs-plan-bar" aria-hidden="true"><span data-tone={row.code === "US" ? "baseline" : us && row.priceUsd > us.priceUsd ? "high" : "low"} style={{ width: `${row.priceUsd / max * 100}%` }}/>{us && <i style={{ left: `${us.priceUsd / max * 100}%` }}/>}</span><small>{row.code === "US" ? "基准" : <Saving usd={row.priceUsd} usPrice={us?.priceUsd}/>}</small></span>
            <span className="gs-plan-tax">{row.tax || "以结算页为准"}</span>
          </span>}>
            <div className="gs-plan-evidence"><span>来源：{row.sourceName || "未提供"}</span><span>采集：{date(row.lastCheckedAt)}</span><span>汇率：{date(row.fxRateDate)}</span><span>状态：{row.dataQuality === "verified" ? "已核验" : row.dataQuality === "estimated" ? "估算" : "待核验"}</span>
              {row.sourceUrl && <a href={row.sourceUrl} target="_blank" rel="noreferrer">官方来源<PublicIcon name="ExternalLink" size={16}/></a>}
              {row.observationId && <Link href={`/zh/price-records/${row.observationId}`}>查看当时的原始套餐快照<PublicIcon name="ArrowRight" size={16}/></Link>}
            </div>
          </PublicDisclosure>)}
          {!shown.length && <p role="status" className="gs-plan-empty">没有符合条件的地区价格</p>}
        </div></div>
        <div className="gs-plan-table-footer"><span>显示 {shown.length} / {filtered.length} 个地区</span>{filtered.length > 9 && <PublicExpandButton expanded={expanded} label={expanded ? "收起地区" : `展开全部 ${filtered.length} 个地区`} hint={expanded ? undefined : `还有 ${filtered.length - shown.length} 个`} onClick={() => setExpanded(!expanded)} />}{us && shown.length > 0 && <span>中间竖线是美国价格</span>}</div>
      </div>
    </section>
  </>;
}
